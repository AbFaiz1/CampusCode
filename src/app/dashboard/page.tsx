import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Link2,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { classHex } from "@/lib/class-styles";
import { getScoreBreakdown } from "@/lib/services/scores";
import { leaderboard } from "@/lib/services/leaderboard";
import { listFriends } from "@/lib/services/friends";
import { listReminders } from "@/lib/services/reminders";
import { ClassBadge, ClassPill } from "@/components/class-badge";
import { PlatformIcon } from "@/components/platform-icon";
import { Avatar, StudentRow } from "@/components/avatar";
import { Countdown, LocalTime } from "@/components/countdown";
import {
  ActivityDot,
  ClassProgressBar,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import {
  RatingTrendChart,
  ScoreBreakdownChart,
  type RatingPointData,
} from "@/components/charts";
import { countRecent } from "@/lib/stats";

export const metadata = { title: "Dashboard" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      accounts: { orderBy: { platform: "asc" } },
      ratingHistory: { orderBy: { participatedAt: "asc" } },
      college: true,
      department: true,
      course: true,
    },
  });
  if (!user) redirect("/login");

  const [
    breakdown,
    friends,
    reminders,
    upcoming,
    collegeBoard,
    higherCollegeCount,
    higherDeptCount,
  ] = await Promise.all([
    getScoreBreakdown(user.id),
    listFriends(user.id),
    listReminders(user.id),
    prisma.contest.findMany({
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    user.collegeId
      ? leaderboard({ kind: "college", collegeId: user.collegeId, limit: 10 })
      : Promise.resolve(null),
    user.collegeId
      ? prisma.user.count({
          where: {
            collegeId: user.collegeId,
            campusScore: { gt: user.campusScore },
            showInDirectory: true,
            isPublic: true,
          },
        })
      : Promise.resolve(0),
    user.departmentId
      ? prisma.user.count({
          where: {
            departmentId: user.departmentId,
            campusScore: { gt: user.campusScore },
            showInDirectory: true,
            isPublic: true,
          },
        })
      : Promise.resolve(0),
  ]);

  const collegeRank = user.collegeId ? higherCollegeCount + 1 : null;
  const departmentRank = user.departmentId ? higherDeptCount + 1 : null;


  const chartData: RatingPointData[] = [];
  const platformsWithHistory = new Set<Platform>();
  for (const point of user.ratingHistory) {
    if (point.ratingAfter === null) continue;
    const platform = point.platform as Platform;
    platformsWithHistory.add(platform);
    const label = point.participatedAt.toISOString().slice(0, 10);
    let bucket = chartData.find((row) => row.date === label);
    if (!bucket) {
      bucket = { date: label };
      chartData.push(bucket);
    }
    bucket[platform] = point.ratingAfter;
  }

  const accounts = user.accounts;
  const verified = accounts.filter((a) => a.verificationStatus === "VERIFIED");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Your CampusCode"
        title={`Welcome back, ${user.displayName.split(" ")[0]}`}
        description="Everything about your competitive programming in one view — platform stats, class, college rank and what is coming up next."
        actions={
          <>
            <Link href="/settings" className="btn btn-secondary">
              <Link2 className="h-4 w-4" />
              Link platforms
            </Link>
            <Link href="/contests" className="btn btn-primary">
              <CalendarDays className="h-4 w-4" />
              Contest calendar
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <ClassBadge value={user.campusClass} size="lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  CampusCode class
                </p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
                  {Math.round(user.campusScore)}{" "}
                  <span className="text-base font-normal text-ink-faint">/ 1000</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <ActivityDot level={user.activityLevel} />
              {user.activityLevel.toLowerCase()} activity
            </div>
          </div>

          <div className="mt-5">
            <ClassProgressBar score={user.campusScore} class={user.campusClass} />
            <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-ink-faint">
              <span>0</span>
              <span>400</span>
              <span>650</span>
              <span>850</span>
              <span>1000</span>
            </div>
          </div>

          {breakdown ? (
            <>
              <div className="mt-6">
                <ScoreBreakdownChart
                  skill={breakdown.skill}
                  consistency={breakdown.consistency}
                  improvement={breakdown.improvement}
                />
              </div>
              <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs text-ink-muted">
                {breakdown.reasons.slice(0, 6).map((reason, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {reason}
                  </li>
                ))}
              </ul>
              {breakdown.nextClass ? (
                <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-muted">
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-class-s" />
                  <span className="font-semibold text-ink">
                    {breakdown.nextClass.pointsAway} points
                  </span>{" "}
                  to reach Class {breakdown.nextClass.cls}.{" "}
                  <Link
                    href="/methodology"
                    className="text-brand-bright hover:underline"
                  >
                    See how points are earned
                  </Link>
                  .
                </p>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              label="College rank"
              value={collegeRank ? `#${collegeRank}` : "—"}
              sub={user.college?.name ?? "No college set"}
              accent={classHex(user.campusClass)}
            />
            <StatTile
              label="Department rank"
              value={departmentRank ? `#${departmentRank}` : "—"}
              sub={user.department?.name ?? "No department set"}
            />
            <StatTile
              label="Contests (90d)"
              value={
                breakdown
                  ? countRecent(
                      user.ratingHistory.map((h) => h.participatedAt),
                      90,
                    )
                  : 0
              }
              sub="Consistency component"
            />
            <StatTile
              label="Friends"
              value={friends.length}
              sub="In your league"
              accent="#22d3ee"
            />
          </div>

          <div className="card p-5">
            <SectionTitle
              title="Linked platforms"
              action={
                <Link href="/settings" className="text-xs text-brand-bright hover:underline">
                  Manage
                </Link>
              }
            />
            {accounts.length === 0 ? (
              <EmptyState
                title="No platforms linked"
                description="Link Codeforces, LeetCode, CodeChef or AtCoder to unlock ratings, your class and your college rank."
                action={
                  <Link href="/settings" className="btn btn-primary">
                    Link a platform
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
                  >
                    <PlatformIcon platform={account.platform} className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {account.handle}
                      </span>
                      <span className="block text-[0.68rem] text-ink-faint">
                        {PLATFORM_LABELS[account.platform as Platform]}
                        {account.rank ? ` · ${account.rank}` : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      <span
                        className="block font-mono text-sm font-semibold"
                        style={{ color: PLATFORM_COLORS[account.platform as Platform] }}
                      >
                        {account.rating ?? "N/A"}
                      </span>
                      <span className="block text-[0.65rem] text-ink-faint">rating</span>
                    </span>
                    <span
                      className={`chip ${
                        account.verificationStatus === "VERIFIED"
                          ? "border-positive/40 bg-positive/10 text-positive"
                          : "border-warning/40 bg-warning/10 text-warning"
                      }`}
                    >
                      {account.verificationStatus === "VERIFIED" ? "verified" : "unverified"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 card p-5 sm:p-6">
        <SectionTitle
          title="Rating trend"
          hint={`${platformsWithHistory.size} platform${platformsWithHistory.size === 1 ? "" : "s"} tracked`}
        />
        <RatingTrendChart
          data={chartData}
          platforms={[...platformsWithHistory] as Platform[]}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle
            title="Upcoming contests"
            action={
              <Link href="/contests" className="text-xs text-brand-bright hover:underline">
                Full calendar
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              title="No contests scheduled"
              description="Run the contest sync from the admin panel or the scheduled job to populate the calendar."
            />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((contest) => (
                <li
                  key={contest.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                >
                  <PlatformIcon platform={contest.platform} className="h-8 w-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {contest.name}
                    </span>
                    <span className="block text-[0.7rem] text-ink-faint">
                      <LocalTime iso={contest.startTime} />
                    </span>
                  </span>
                  <Countdown target={contest.startTime} compact />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <SectionTitle
            title="Saved reminders"
            action={
              <Link href="/contests" className="text-xs text-brand-bright hover:underline">
                Add more
              </Link>
            }
          />
          {reminders.length === 0 ? (
            <EmptyState
              title="No reminders yet"
              description="Save a contest and pick when you want to hear about it. The backend sends it even if you close the site."
              icon={<BellRing className="h-5 w-5" />}
            />
          ) : (
            <ul className="space-y-2.5">
              {reminders.slice(0, 6).map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {reminder.contest.name}
                    </span>
                    <span className="block text-[0.7rem] text-ink-faint">
                      {reminder.offsetMinutes && reminder.offsetMinutes >= 1440
                        ? "24 hours before"
                        : reminder.offsetMinutes && reminder.offsetMinutes >= 60
                          ? "1 hour before"
                          : `${reminder.offsetMinutes ?? 10} minutes before`}{" "}
                      · {reminder.status.toLowerCase()}
                    </span>
                  </span>
                  <span className="chip">{reminder.channel.replace("WEB_PUSH", "push")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle
            title="College leaderboard"
            hint={user.college?.name ?? "All colleges"}
            action={
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1 text-xs text-brand-bright hover:underline"
              >
                Full board <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {collegeBoard && collegeBoard.entries.length ? (
            <div className="space-y-0.5">
              {collegeBoard.entries.slice(0, 6).map((entry) => (
                <StudentRow
                  key={entry.id}
                  rank={entry.rank}
                  href={`/u/${entry.id}`}
                  student={{
                    id: entry.id,
                    displayName: entry.displayName,
                    avatarUrl: entry.avatarUrl,
                    campusScore: entry.campusScore,
                    campusClass: entry.campusClass,
                    department: entry.department,
                    course: entry.course,
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No leaderboard yet"
              description="Once students in your college join and verify their accounts, rankings appear here."
              icon={<Trophy className="h-5 w-5" />}
            />
          )}
        </section>

        <section className="card p-5">
          <SectionTitle
            title="Friends activity"
            action={
              <Link
                href="/friends"
                className="inline-flex items-center gap-1 text-xs text-brand-bright hover:underline"
              >
                Open league <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              description="Find classmates in the directory and send a request to start a friendly league."
              icon={<Users className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-0.5">
              {friends.slice(0, 6).map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={friend.displayName} src={friend.avatarUrl} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {friend.displayName}
                      </span>
                      <ClassPill value={friend.campusClass} />
                    </span>
                    <span className="block truncate text-xs text-ink-faint">
                      {friend.course ?? friend.department ?? "Student"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ActivityDot level={friend.activityLevel} />
                    <span className="font-mono text-sm text-ink-muted">
                      {Math.round(friend.campusScore)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {verified.length === 0 ? (
        <div className="mt-5 card flex flex-col items-start gap-4 border-brand/30 bg-brand/[0.06] p-5 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-bright">
            <Medal className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Your class is waiting on verification</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Unverified accounts do not count toward rankings. Add your verification code to
              your platform profile and re-sync — it takes about a minute.
            </p>
          </div>
          <Link href="/settings" className="btn btn-primary">
            Verify now
          </Link>
        </div>
      ) : null}
    </div>
  );
}
