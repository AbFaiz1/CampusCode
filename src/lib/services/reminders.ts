import "server-only";

import { prisma } from "@/lib/db";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";

export type ReminderChannel = "WEB_PUSH" | "EMAIL" | "CALENDAR";

export async function saveContestReminder(args: {
  userId: string;
  contestId: string;
  offsetMinutes: number;
  channel?: ReminderChannel;
}): Promise<{ ok: boolean; message: string }> {
  const contest = await prisma.contest.findUnique({ where: { id: args.contestId } });
  if (!contest) return { ok: false, message: "Contest not found." };

  const remindAt = new Date(contest.startTime.getTime() - args.offsetMinutes * 60_000);
  const channel = args.channel ?? "WEB_PUSH";

  if (remindAt.getTime() < Date.now() - 60_000) {
    return { ok: false, message: "That reminder time has already passed." };
  }

  await prisma.reminder.upsert({
    where: {
      userId_contestId_offsetMinutes_channel: {
        userId: args.userId,
        contestId: args.contestId,
        offsetMinutes: args.offsetMinutes,
        channel,
      },
    },
    create: {
      userId: args.userId,
      contestId: args.contestId,
      offsetMinutes: args.offsetMinutes,
      remindAt,
      channel,
      status: "SCHEDULED",
    },
    update: { remindAt, status: "SCHEDULED", error: null },
  });

  const label =
    args.offsetMinutes >= 1440
      ? "24 hours before"
      : args.offsetMinutes >= 60
        ? "1 hour before"
        : `${args.offsetMinutes} minutes before`;

  return {
    ok: true,
    message: `Reminder set for ${label}. We will notify you even if the site is closed.`,
  };
}

export async function cancelReminder(userId: string, reminderId: string) {
  const deleted = await prisma.reminder.deleteMany({ where: { id: reminderId, userId } });
  return deleted.count
    ? { ok: true, message: "Reminder removed." }
    : { ok: false, message: "Reminder not found." };
}

export async function listReminders(userId: string) {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { remindAt: "asc" },
    include: { contest: true },
  });
}

/**
 * Dispatch every reminder whose time has come.
 *
 * The backend owns scheduling, so reminders fire whether or not the student's
 * browser has the site open.
 */
export async function dispatchDueReminders(now = new Date()): Promise<{
  sent: number;
  failed: number;
}> {
  const due = await prisma.reminder.findMany({
    where: { status: "SCHEDULED", remindAt: { lte: now } },
    include: { contest: true, user: { select: { displayName: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      const minutes = reminder.offsetMinutes ?? 0;
      const when =
        minutes >= 1440
          ? "in 24 hours"
          : minutes >= 60
            ? "in 1 hour"
            : `in ${minutes} minutes`;

      await prisma.notification.create({
        data: {
          userId: reminder.userId,
          title: `${reminder.contest.name} starts ${when}`,
          body: `Your saved contest on ${PLATFORM_LABELS[reminder.contest.platform as Platform]} starts ${when}.`,
          link: `/contests?focus=${reminder.contest.id}`,
          kind: "REMINDER",
          contestId: reminder.contestId,
        },
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: now },
      });
      sent += 1;
    } catch (err) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      });
      failed += 1;
    }
  }

  return { sent, failed };
}

/**
 * Notify students when the schedule of a contest they saved changes.
 * Called after every contest sync.
 */
export async function notifyScheduleChanges(): Promise<number> {
  const contests = await prisma.contest.findMany({
    where: { status: { in: ["UPCOMING", "ONGOING"] } },
    include: { reminders: { include: { user: true } } },
  });

  let notified = 0;
  for (const contest of contests) {
    for (const reminder of contest.reminders) {
      const expected = new Date(
        contest.startTime.getTime() - (reminder.offsetMinutes ?? 0) * 60_000,
      );
      const drift = Math.abs(expected.getTime() - reminder.remindAt.getTime());
      // Only react to meaningful changes (more than one minute of drift).
      if (drift < 60_000) continue;

      await prisma.notification.create({
        data: {
          userId: reminder.userId,
          title: "Contest schedule changed",
          body: `${contest.name} now starts ${contest.startTime.toISOString()}. Your reminder has been updated.`,
          link: `/contests?focus=${contest.id}`,
          kind: "SCHEDULE_CHANGE",
          contestId: contest.id,
        },
      });
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { remindAt: expected, status: "SCHEDULED" },
      });
      notified += 1;
    }
  }
  return notified;
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Build an .ics calendar file for one or more saved contests. */
export function buildIcs(
  contests: {
    id: string;
    name: string;
    url: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    platform: string;
  }[],
): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  const events = contests
    .map((c) =>
      [
        "BEGIN:VEVENT",
        `UID:${c.id}@campuscode`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(c.startTime)}`,
        `DTEND:${stamp(c.endTime)}`,
        `SUMMARY:${escape(c.name)}`,
        c.description ? `DESCRIPTION:${escape(c.description)}` : "",
        `URL:${c.url}`,
        `CATEGORIES:${escape(c.platform)}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n"),
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusCode//Contest Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}
