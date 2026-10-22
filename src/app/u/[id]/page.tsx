import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck, UserPlus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { classHex } from "@/lib/class-styles";
import { getScoreBreakdown } from "@/lib/services/scores";
import { leaderboard } from "@/lib/services/leaderboard";
import { Avatar } from "@/components/avatar";
import { ClassPill } from "@/components/class-badge";
import { PlatformIcon } from "@/components/platform-icon";
import { LocalTime } from "@/components/countdown";
import {
  ActivityDot,
  ClassProgressBar,
  EmptyState,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import {
  RatingTrendChart,
  ScoreBreakdownChart,
  type RatingPointData,
} from "@/components/charts";
import { sendFriendRequestAction } from "@/lib/actions/community";

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { displayName: true },
  });
  return { title: user?.displayName ?? "Student" };
}

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const session = await getSessionUser();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: { orderBy: { platform: "asc" } },
      ratingHistory: { orderBy: { participatedAt: "asc" } },
      college: true,
      department: true,
      course: true,
    },
  });

  if (!user) notFound();

  const isSelf = session?.id === user.id;

  if (!user.isPublic && !isSelf) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="card p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-ink-faint" />
          <h1 className="mt-3 text-lg font-semibold text-ink">This profile is private</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {user.displayName} has chosen not to be listed publicly. You can still work together
            — add them as a friend from the directory.
          </p>
          <Link href="/directory" className="btn btn-secondary mt-5">
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  const [breakdown, collegeBoard, departmentBoard] = await Promise.all([
    getScoreBreakdown(user.id),
    user.collegeId
      ? leaderboard({ kind: "college", collegeId: user.collegeId })
      : Promise.resolve(null),
    user.departmentId
      ? leaderboard({ kind: "department", departmentId: user.departmentId })
      : Promise.resolve(null),
  ]);

  const collegeRank = collegeBoard?.entries.find((e) => e.id === user.id)?.rank ?? null;
  const departmentRank = departmentBoard?.entries.find((e) => e.id === user.id)?.rank ?? null;

  const accounts = user.showPlatforms
    ? user.accounts.filter((a) => a.verificationStatus === "VERIFIED")
    : user.accounts;

  const chartData: RatingPointData[] = [];
  const chartPlatforms = new Set<Platform>();
  for (const point of user.ratingHistory) {
    if (point.ratingAfter === null) continue;
    const platform = point.platform as Platform;
    chartPlatforms.add(platform);
    const label = point.participatedAt.toISOString().slice(0, 10);
    let bucket = chartData.find((row) => row.date === label);
    if (!bucket) {
      bucket = { date: label };
      chartData.push(bucket);
    }
    bucket[platform] = point.ratingAfter;
  }

  const recentContests = user.ratingHistory.slice(-8).reverse();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        href="/directory"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to directory
      </Link>

      <header className="card overflow-hidden">
        <div
          className="h-24 w-full"
          style={{
            background: `linear-gradient(120deg, color-mix(in oklab, ${classHex(user.campusClass)} 32%, transparent), transparent 65%)`,
          }}
        />
        <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-start sm:gap-6">
          <div className="-mt-10">
            <Avatar name={user.displayName} src={user.avatarUrl} size={84} className="ring-4 ring-surface" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {user.displayName}
              </h1>
              <ClassPill value={user.campusClass} score={user.campusScore} />
              <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                <ActivityDot level={user.activityLevel} />
                {user.activityLevel.toLowerCase()}
              </span>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {user.course ? <span>{user.course.name}</span> : null}
              {user.department ? <span>{user.department.name}</span> : null}
              {user.college ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.college.name}
                </span>
              ) : null}
              {user.batch ? <span>Batch {user.batch}</span> : null}
              {user.academicYear ? <span>Year {user.academicYear}</span> : null}
            </p>

            {user.bio ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{user.bio}</p>
            ) : null}

            {user.codingInterests ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.codingInterests
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
              </div>
            ) : null}

            {!isSelf && session ? (
              <form action={sendFriendRequestAction} className="mt-4">
                <input type="hidden" name="addresseeId" value={user.id} />
                <button type="submit" className="btn btn-secondary">
                  <UserPlus className="h-4 w-4" />
                  Add friend
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="CampusCode score"
          value={Math.round(user.campusScore)}
          sub={`Class ${user.campusClass}`}
          accent={classHex(user.campusClass)}
        />
        <StatTile
          label="College rank"
          value={collegeRank ? `#${collegeRank}` : "—"}
          sub={user.college?.name ?? "Not set"}
        />
        <StatTile
          label="Department rank"
          value={departmentRank ? `#${departmentRank}` : "—"}
          sub={user.department?.name ?? "Not set"}
        />
        <StatTile
          label="Contests tracked"
          value={user.ratingHistory.length}
          sub="Across all platforms"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <SectionTitle title="Platform statistics" hint="Verified data only" />
          {accounts.length === 0 ? (
            <EmptyState
              title="No platform data"
              description={
                user.showPlatforms
                  ? "This student has not linked any verified platform yet."
                  : "This student has chosen to hide their platform accounts."
              }
            />
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-line bg-surface-2 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <PlatformIcon platform={account.platform} className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="truncate font-medium text-ink hover:text-brand-bright hover:underline"
                        >
                          {account.handle}
                        </a>
                        {account.verificationStatus === "VERIFIED" ? (
                          <span className="chip border-positive/40 bg-positive/10 text-positive">
                            <ShieldCheck className="h-3 w-3" />
                            verified
                          </span>
                        ) : (
                          <span className="chip">unverified</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {PLATFORM_LABELS[account.platform as Platform]}
                        {account.rank ? ` · ${account.rank}` : ""}
                      </span>
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
                    {[
                      { label: "Rating", value: account.rating },
                      { label: "Peak rating", value: account.maxRating },
                      { label: "Problems solved", value: account.problemsSolved },
                      { label: "Contests", value: account.contestsAttended },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <dt className="text-[0.65rem] uppercase tracking-wide text-ink-faint">
                          {stat.label}
                        </dt>
                        <dd
                          className="mt-0.5 font-mono text-sm font-semibold"
                          style={{ color: PLATFORM_COLORS[account.platform as Platform] }}
                        >
                          {stat.value === null ? (
                            <span
                              className="text-ink-faint"
                              title="This platform does not publish this value"
                            >
                              N/A
                            </span>
                          ) : (
                            stat.value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <p className="text-xs text-ink-faint">
                <span className="font-semibold text-ink-muted">N/A</span> means the platform does
                not publish that value. It is never replaced with a zero.
              </p>
            </div>
          )}
        </section>

        <section className="card p-5">
          <SectionTitle title="Score composition" hint={`Methodology v${breakdown?.version ?? "—"}`} />
          {breakdown ? (
            <>
              <div className="mb-4">
                <ClassProgressBar score={user.campusScore} class={user.campusClass} />
              </div>
              <ScoreBreakdownChart
                skill={breakdown.skill}
                consistency={breakdown.consistency}
                improvement={breakdown.improvement}
              />
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-ink-muted">
                {breakdown.reasons.slice(0, 7).map((reason, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {reason}
                  </li>
                ))}
              </ul>
              {breakdown.nextClass ? (
                <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">
                    {breakdown.nextClass.pointsAway} points
                  </span>{" "}
                  to Class {breakdown.nextClass.cls}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Score has not been computed yet for this student.
            </p>
          )}
        </section>
      </div>

      <section className="mt-5 card p-5">
        <SectionTitle title="Rating trend" />
        <RatingTrendChart data={chartData} platforms={[...chartPlatforms] as Platform[]} />
      </section>

      <section className="mt-5 card p-5">
        <SectionTitle title="Recent contests" hint={`${recentContests.length} shown`} />
        {recentContests.length === 0 ? (
          <EmptyState title="No contest history yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.68rem] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">Contest</th>
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Rank</th>
                  <th className="pb-2 pr-3 font-semibold">Rating</th>
                  <th className="pb-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {recentContests.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-3 font-medium text-ink">{entry.contestName}</td>
                    <td className="py-2.5 pr-3 text-ink-muted">
                      <LocalTime iso={entry.participatedAt} />
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-ink-muted">
                      {entry.rank ? `#${entry.rank}` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-ink">
                      {entry.ratingAfter ?? "—"}
                    </td>
                    <td
                      className={`py-2.5 font-mono ${
                        entry.delta === null
                          ? "text-ink-faint"
                          : entry.delta >= 0
                            ? "text-positive"
                            : "text-danger"
                      }`}
                    >
                      {entry.delta === null ? "—" : `${entry.delta >= 0 ? "+" : ""}${entry.delta}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
