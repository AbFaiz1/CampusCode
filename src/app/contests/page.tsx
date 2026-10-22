import Link from "next/link";
import { CalendarDays, Clock, Filter, RefreshCw } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";
import { listContests, contestSourceHealth } from "@/lib/services/contests";
import { listReminders } from "@/lib/services/reminders";
import { PlatformIcon } from "@/components/platform-icon";
import { Countdown, LocalTime } from "@/components/countdown";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { IcsLink, ReminderControls } from "@/components/reminder-controls";

export const metadata = { title: "Contests" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

const PLATFORM_FILTERS: (Platform | "ALL")[] = ["ALL", "CODEFORCES", "LEETCODE", "CODECHEF", "ATCODER"];
const STATUS_FILTERS = ["ALL", "UPCOMING", "ONGOING", "COMPLETED"] as const;

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionUser();
  const params = await searchParams;

  const platformParam = String(params.platform ?? "ALL");
  const platform = PLATFORM_FILTERS.includes(platformParam as Platform | "ALL")
    ? (platformParam as Platform | "ALL")
    : "ALL";
  const statusParam = String(params.status ?? "UPCOMING");
  const status = STATUS_FILTERS.includes(statusParam as (typeof STATUS_FILTERS)[number])
    ? statusParam
    : "UPCOMING";

  const [{ contests }, health, reminders] = await Promise.all([
    listContests({
      platform,
      status,
      limit: 120,
    }),
    contestSourceHealth(),
    session ? listReminders(session.id) : Promise.resolve([]),
  ]);

  const savedByContest = new Map<string, number[]>();
  for (const reminder of reminders) {
    const list = savedByContest.get(reminder.contestId) ?? [];
    list.push(reminder.offsetMinutes ?? 10);
    savedByContest.set(reminder.contestId, list);
  }

  const ongoing = contests.filter((c) => c.status === "ONGOING");
  const upcoming = contests.filter((c) => c.status === "UPCOMING");
  const completed = contests.filter((c) => c.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Discover"
        title="Contest calendar"
        description="Codeforces, LeetCode, CodeChef and AtCoder contests in one feed, shown in your timezone. Save a contest and we will remind you before it starts."
        actions={
          <>
            <a href="/api/contests/calendar.ics" className="btn btn-secondary">
              <CalendarDays className="h-4 w-4" />
              Export .ics
            </a>
            {session ? (
              <Link href="/settings" className="btn btn-primary">
                <RefreshCw className="h-4 w-4" />
                Sync my accounts
              </Link>
            ) : null}
          </>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </span>

        <div className="flex flex-wrap gap-1.5">
          {PLATFORM_FILTERS.map((p) => (
            <Link
              key={p}
              href={`/contests?platform=${p}&status=${status}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                platform === p
                  ? "border-brand/50 bg-brand/12 text-brand-bright"
                  : "border-line bg-surface-2 text-ink-muted hover:border-brand/35 hover:text-ink"
              }`}
            >
              {p === "ALL" ? "All platforms" : PLATFORM_LABELS[p]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/contests?platform=${platform}&status=${s}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                status === s
                  ? "border-brand/50 bg-brand/12 text-brand-bright"
                  : "border-line bg-surface-2 text-ink-muted hover:border-brand/35 hover:text-ink"
              }`}
            >
              {s.toLowerCase()}
            </Link>
          ))}
        </div>

        <span className="ml-auto text-[0.68rem] text-ink-faint">
          {health.latestSync
            ? `Last synced ${new Date(health.latestSync).toLocaleString("en-IN")}`
            : "Never synced"}
        </span>
      </div>

      {contests.length === 0 ? (
        <EmptyState
          title="No contests in this view"
          description="Try another platform or status, or run the contest sync job to refresh the calendar."
          icon={<CalendarDays className="h-5 w-5" />}
          action={
            <Link href="/contests?status=ALL" className="btn btn-secondary">
              Show everything
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {ongoing.length ? (
            <section>
              <SectionTitle title="Live right now" />
              <ContestList contests={ongoing} savedByContest={savedByContest} signedIn={Boolean(session)} />
            </section>
          ) : null}

          {upcoming.length ? (
            <section>
              <SectionTitle title={`Upcoming · ${upcoming.length}`} />
              <ContestList contests={upcoming} savedByContest={savedByContest} signedIn={Boolean(session)} />
            </section>
          ) : null}

          {completed.length ? (
            <section>
              <SectionTitle title={`Recently finished · ${completed.length}`} />
              <ContestList contests={completed} savedByContest={savedByContest} signedIn={Boolean(session)} />
            </section>
          ) : null}
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Contest data is pulled from each platform&apos;s public endpoints. Coverage is verified
        per source, and a source that fails to respond is skipped rather than silently showing
        an empty list. Registration deadlines are only shown when the platform publishes them.
      </p>
    </div>
  );
}

function ContestList({
  contests,
  savedByContest,
  signedIn,
}: {
  contests: {
    id: string;
    platform: string;
    name: string;
    url: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number | null;
    registrationDeadline: Date | null;
    status: string;
    type: string | null;
    participantCount: number | null;
    description: string | null;
  }[];
  savedByContest: Map<string, number[]>;
  signedIn: boolean;
}) {
  return (
    <div className="card divide-y divide-line-soft overflow-hidden">
      {contests.map((contest) => (
        <article
          key={contest.id}
          className="flex flex-col gap-3 px-4 py-4 transition hover:bg-surface-2/60 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <PlatformIcon platform={contest.platform} className="h-9 w-9" />
            <div className="min-w-0">
              <a
                href={contest.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate font-medium text-ink hover:text-brand-bright hover:underline"
              >
                {contest.name}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                <span>{PLATFORM_LABELS[contest.platform as Platform] ?? contest.platform}</span>
                <span className="flex items-center gap-1">
                  <LocalTime iso={contest.startTime} />
                </span>
                {contest.durationMinutes ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {contest.durationMinutes >= 60
                      ? `${Math.floor(contest.durationMinutes / 60)}h${
                          contest.durationMinutes % 60 ? ` ${contest.durationMinutes % 60}m` : ""
                        }`
                      : `${contest.durationMinutes}m`}
                  </span>
                ) : null}
                {contest.registrationDeadline ? (
                  <span className="text-warning">
                    Register by {new Date(contest.registrationDeadline).toLocaleString("en-IN")}
                  </span>
                ) : null}
                {contest.participantCount ? (
                  <span>{contest.participantCount.toLocaleString("en-IN")} participants</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {contest.status === "UPCOMING" ? (
              <Countdown target={contest.startTime} />
            ) : contest.status === "ONGOING" ? (
              <span className="chip border-positive/40 bg-positive/10 text-positive">
                Live now
              </span>
            ) : (
              <span className="chip">Finished</span>
            )}

            {signedIn ? (
              <ReminderControls
                contestId={contest.id}
                savedOffsets={savedByContest.get(contest.id) ?? []}
              />
            ) : (
              <Link href="/login" className="btn btn-secondary px-2.5 py-1.5 text-xs">
                Sign in to save
              </Link>
            )}
            <IcsLink contestId={contest.id} />
          </div>
        </article>
      ))}
    </div>
  );
}
