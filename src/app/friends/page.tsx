import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Trophy, UserPlus, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listFriends, listFriendRequests } from "@/lib/services/friends";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { classHex } from "@/lib/class-styles";
import { Avatar } from "@/components/avatar";
import { ClassPill } from "@/components/class-badge";
import { ActivityDot, EmptyState, PageHeader, SectionTitle, StatTile } from "@/components/ui";
import { respondToFriendRequestAction, removeFriendAction } from "@/lib/actions/community";
import { GoalForm } from "@/components/goal-form";

export const metadata = { title: "Friends" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function FriendsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [friends, requests, goal, participations] = await Promise.all([
    listFriends(session.id),
    listFriendRequests(session.id),
    prisma.goal.findFirst({
      where: {
        userId: session.id,
        weekStart: {
          gte: (() => {
            const now = new Date();
            const day = (now.getUTCDay() + 6) % 7;
            return new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day),
            );
          })(),
        },
      },
    }),
    prisma.contestParticipation.findMany({
      where: { userId: session.id },
      orderBy: { startTime: "desc" },
      take: 30,
    }),
  ]);

  const weekStart = (() => {
    const now = new Date();
    const day = (now.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  })();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const thisWeek = participations.filter(
    (p) => p.startTime >= weekStart && p.startTime < weekEnd,
  );

  const friendIds = friends.map((f) => f.id);
  const friendContestCounts = friendIds.length
    ? await prisma.contestParticipation.groupBy({
        by: ["userId"],
        where: { userId: { in: friendIds } },
        _count: { _all: true },
      })
    : [];
  const friendCounts = Object.fromEntries(
    friendContestCounts.map((c) => [c.userId, c._count._all]),
  );

  const streak = participations.reduce((best, entry, index, all) => {
    if (index === 0) return best;
    const prev = all[index - 1];
    const gap = prev.startTime.getTime() - entry.startTime.getTime();
    if (gap > 5 * 86400000) return best;
    return Math.max(best, index + 1);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="League"
        title="Friends contest league"
        description="Friendly competition with the people you actually want to beat. Participation is celebrated; skill rankings stay separate."
        actions={
          <Link href="/directory" className="btn btn-primary">
            <UserPlus className="h-4 w-4" />
            Find classmates
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {requests.incoming.length ? (
            <section className="card p-5">
              <SectionTitle title={`Requests · ${requests.incoming.length}`} />
              <ul className="space-y-2.5">
                {requests.incoming.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                  >
                    <Avatar name={request.requester.displayName} src={request.requester.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {request.requester.displayName}
                      </span>
                      <span className="block text-xs text-ink-faint">wants to connect</span>
                    </span>
                    <form action={respondToFriendRequestAction} className="flex gap-2">
                      <input type="hidden" name="friendshipId" value={request.id} />
                      <button
                        type="submit"
                        name="accept"
                        value="true"
                        className="btn btn-primary px-3 py-1.5 text-xs"
                      >
                        Accept
                      </button>
                      <button
                        type="submit"
                        name="accept"
                        value="false"
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        Decline
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card p-5">
            <SectionTitle
              title={`Your friends · ${friends.length}`}
              hint="Ranked by CampusCode score"
            />
            {friends.length === 0 ? (
              <EmptyState
                title="No friends yet"
                description="Browse the directory, open a classmate's profile and send a friend request."
                icon={<Users className="h-5 w-5" />}
                action={
                  <Link href="/directory" className="btn btn-primary">
                    Open directory
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-line-soft">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={friend.displayName} src={friend.avatarUrl} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/u/${friend.id}`}
                          className="truncate font-medium text-ink hover:text-brand-bright"
                        >
                          {friend.displayName}
                        </Link>
                        <ClassPill value={friend.campusClass} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">
                        {[friend.course, friend.department].filter(Boolean).join(" · ") ||
                          "Student"}
                        {friend.batch ? ` · Batch ${friend.batch}` : ""}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem]">
                        {friend.accounts
                          .filter((a) => a.verificationStatus === "VERIFIED")
                          .map((a) => (
                            <span key={a.platform} className="text-ink-faint">
                              {PLATFORM_LABELS[a.platform as Platform] ?? a.platform}:{" "}
                              <span className="font-mono text-ink-muted">{a.rating ?? "N/A"}</span>
                            </span>
                          ))}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <ActivityDot level={friend.activityLevel} />
                      <span
                        className="font-mono text-base font-semibold"
                        style={{ color: classHex(friend.campusClass) }}
                      >
                        {Math.round(friend.campusScore)}
                      </span>
                    </span>
                    <form action={removeFriendAction}>
                      <input type="hidden" name="friendId" value={friend.id} />
                      <button type="submit" className="btn btn-ghost px-2.5 py-1.5 text-xs">
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              label="This week"
              value={thisWeek.length}
              sub="contests attempted"
              accent="#22d3ee"
            />
            <StatTile
              label="Streak"
              value={streak}
              sub="contests in a row"
              accent="#fbbf24"
            />
            <StatTile
              label="All time"
              value={participations.length}
              sub="contests logged"
            />
            <StatTile
              label="Weekly goal"
              value={goal?.targetContests ?? 0}
              sub="contests per week"
            />
          </div>

          <section className="card p-5">
            <SectionTitle title="Weekly coding goal" />
            <GoalForm current={goal?.targetContests ?? 2} />
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Goals track participation, not skill. A student who contests twice a week keeps
              their streak alive even if their rating is still climbing.
            </p>
          </section>

          <section className="card p-5">
            <SectionTitle title="Recent contest activity" />
            {participations.length === 0 ? (
              <EmptyState
                title="No contest history yet"
                description="Link a coding platform and sync — we build your participation history from the platforms themselves."
                icon={<CalendarDays className="h-5 w-5" />}
              />
            ) : (
              <ul className="space-y-2">
                {participations.slice(0, 8).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink">
                        {entry.contestName}
                      </span>
                      <span className="block text-[0.68rem] text-ink-faint">
                        {new Date(entry.startTime).toLocaleDateString("en-IN")}
                      </span>
                    </span>
                    {entry.rank ? (
                      <span className="font-mono text-xs text-ink-muted">#{entry.rank}</span>
                    ) : null}
                    {entry.ratingAfter !== null && entry.ratingBefore !== null ? (
                      <span
                        className={`font-mono text-xs ${
                          entry.ratingAfter - entry.ratingBefore >= 0
                            ? "text-positive"
                            : "text-danger"
                        }`}
                      >
                        {entry.ratingAfter - entry.ratingBefore >= 0 ? "+" : ""}
                        {entry.ratingAfter - entry.ratingBefore}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <SectionTitle title="Friend participation" hint="Contests logged" />
            {friends.length === 0 ? (
              <p className="text-sm text-ink-muted">Add friends to compare participation.</p>
            ) : (
              <ul className="space-y-2">
                {friends.map((friend) => (
                  <li key={friend.id} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-muted">
                      {friend.displayName}
                    </span>
                    <span className="font-mono text-xs text-ink">
                      {friendCounts[friend.id] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/groups"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-bright hover:underline"
            >
              <Trophy className="h-3.5 w-3.5" />
              Run a group challenge
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
