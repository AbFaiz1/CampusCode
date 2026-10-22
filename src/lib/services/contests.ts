import "server-only";

import { prisma } from "@/lib/db";
import { PLATFORMS, type Platform } from "@/lib/constants";
import { ADAPTERS } from "@/lib/platforms";

export function deriveStatus(startTime: Date, endTime: Date, now = new Date()): string {
  if (now.getTime() < startTime.getTime()) return "UPCOMING";
  if (now.getTime() < endTime.getTime()) return "ONGOING";
  return "COMPLETED";
}

export type SyncResult = {
  platform: Platform;
  ok: boolean;
  imported: number;
  message: string;
};

/**
 * Pull contests from every supported platform and upsert them.
 *
 * A platform that fails is skipped — the rest of the calendar still works and
 * the failure is recorded in the sync log rather than silently ignored.
 */
export async function syncContests(platforms: Platform[] = [...PLATFORMS]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const startedAt = new Date();

  for (const platform of platforms) {
    const adapter = ADAPTERS[platform];
    try {
      const remote = await adapter.fetchContests();
      const now = new Date();

      for (const contest of remote) {
        const status = deriveStatus(contest.startTime, contest.endTime, now);
        await prisma.contest.upsert({
          where: { platform_externalId: { platform, externalId: contest.externalId } },
          create: {
            platform,
            externalId: contest.externalId,
            name: contest.name,
            url: contest.url,
            description: contest.description,
            type: contest.type,
            startTime: contest.startTime,
            endTime: contest.endTime,
            durationMinutes: contest.durationMinutes,
            registrationDeadline: contest.registrationDeadline,
            status,
            participantCount: contest.participantCount,
            lastSyncedAt: now,
          },
          update: {
            name: contest.name,
            url: contest.url,
            description: contest.description,
            type: contest.type,
            startTime: contest.startTime,
            endTime: contest.endTime,
            durationMinutes: contest.durationMinutes,
            registrationDeadline: contest.registrationDeadline,
            status,
            participantCount: contest.participantCount,
            lastSyncedAt: now,
          },
        });
      }

      results.push({
        platform,
        ok: true,
        imported: remote.length,
        message: `Imported ${remote.length} contests`,
      });
    } catch (err) {
      results.push({
        platform,
        ok: false,
        imported: 0,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await prisma.syncLog.create({
    data: {
      kind: "CONTESTS",
      status: results.every((r) => r.ok) ? "SUCCESS" : results.some((r) => r.ok) ? "PARTIAL" : "FAILED",
      message: results.map((r) => `${r.platform}: ${r.message}`).join(" | "),
      details: JSON.stringify(results),
      startedAt,
      finishedAt: new Date(),
    },
  });

  return results;
}

export type ContestFilter = {
  platform?: Platform | "ALL";
  status?: string | "ALL";
  from?: Date;
  to?: Date;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listContests(filter: ContestFilter = {}) {
  const where: Record<string, unknown> = {};
  if (filter.platform && filter.platform !== "ALL") where.platform = filter.platform;
  if (filter.status && filter.status !== "ALL") where.status = filter.status;
  if (filter.from || filter.to) {
    where.startTime = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }
  if (filter.search) {
    where.name = { contains: filter.search };
  }

  const [total, contests] = await Promise.all([
    prisma.contest.count({ where }),
    prisma.contest.findMany({
      where,
      orderBy: { startTime: "asc" },
      take: filter.limit ?? 100,
      skip: filter.offset ?? 0,
      include: {
        _count: { select: { reminders: true } },
      },
    }),
  ]);

  return { total, contests };
}

/** Contests that start within the given window, used for reminders and counts. */
export async function contestsStartingBetween(from: Date, to: Date) {
  return prisma.contest.findMany({
    where: { startTime: { gte: from, lte: to } },
    orderBy: { startTime: "asc" },
  });
}

export async function contestSourceHealth() {
  const lastSync = await prisma.syncLog.findMany({
    where: { kind: "CONTESTS" },
    orderBy: { startedAt: "desc" },
    take: 1,
  });
  const counts = await prisma.contest.groupBy({ by: ["platform"], _count: { _all: true } });
  const latest = await prisma.contest.findMany({
    orderBy: { lastSyncedAt: "desc" },
    take: 1,
    select: { lastSyncedAt: true },
  });
  return {
    lastRun: lastSync[0] ?? null,
    counts: Object.fromEntries(counts.map((c) => [c.platform, c._count._all])),
    latestSync: latest[0]?.lastSyncedAt ?? null,
  };
}
