import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Gauge,
  GraduationCap,
  LayoutGrid,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { CLASS_HEX } from "@/lib/class-styles";
import { CLASS_THRESHOLDS, SCORE_WEIGHTS } from "@/lib/constants";

// The landing page shows live counters, so it renders per request.
export const instant = false;

export default async function LandingPage() {
  await connection();

  const [students, colleges, contests, classes] = await Promise.all([
    prisma.user.count({ where: { showInDirectory: true, isPublic: true } }),
    prisma.college.count(),
    prisma.contest.count({ where: { startTime: { gte: new Date() } } }),
    prisma.user.groupBy({
      by: ["campusClass"],
      where: { showInDirectory: true, isPublic: true },
      _count: { _all: true },
    }),
  ]);

  const classCounts = Object.fromEntries(classes.map((c) => [c.campusClass, c._count._all]));

  return (
    <div className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="chip border-brand/40 bg-brand/10 text-brand-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
              Now onboarding your first college
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Your competitive programming identity,
              <span className="gradient-text"> all in one place.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              CampusCode links your Codeforces, LeetCode, CodeChef and AtCoder accounts, turns
              them into one transparent score, and puts you on a leaderboard with the
              classmates you actually want to beat.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary px-5 py-2.5">
                Join your college
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/methodology" className="btn btn-secondary px-5 py-2.5">
                How scoring works
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { label: "Students ranked", value: students },
                { label: "Colleges", value: colleges },
                { label: "Upcoming contests", value: contests },
              ].map((stat) => (
                <div key={stat.label} className="card px-4 py-3">
                  <dd className="font-mono text-2xl font-semibold text-ink">{stat.value}</dd>
                  <dt className="mt-0.5 text-xs text-ink-faint">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="card card-hover overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
                <span className="font-mono text-xs text-ink-faint">campuscode · leaderboard</span>
                <span className="chip border-class-s/40 bg-class-s/10 text-class-s">Class S</span>
              </div>
              <div className="divide-y divide-line-soft">
                {[
                  { name: "Aarav Sharma", dept: "CSE", score: 881, cls: "S", color: CLASS_HEX.S },
                  { name: "Ishita Verma", dept: "CSE", score: 742, cls: "A", color: CLASS_HEX.A },
                  { name: "Rohan Mehta", dept: "IT", score: 655, cls: "A", color: CLASS_HEX.A },
                  { name: "Neha Gupta", dept: "ECE", score: 498, cls: "B", color: CLASS_HEX.B },
                  { name: "Kabir Singh", dept: "CSE", score: 214, cls: "C", color: CLASS_HEX.C },
                ].map((row, index) => (
                  <div key={row.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 font-mono text-xs text-ink-faint">{index + 1}</span>
                    <span
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {row.name}
                      </span>
                      <span className="block text-xs text-ink-faint">{row.dept}</span>
                    </span>
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-xs font-bold"
                      style={{
                        color: row.color,
                        borderColor: `color-mix(in oklab, ${row.color} 40%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${row.color} 12%, transparent)`,
                      }}
                    >
                      {row.cls}
                    </span>
                    <span className="w-12 text-right font-mono text-sm font-semibold text-ink">
                      {row.score}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-surface-2 px-4 py-3 text-xs text-ink-faint">
                Rankings use the CampusCode score, not a single platform rating.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Everything a competitive programmer checks, unified
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          No more tab-hopping between four platforms and a shared spreadsheet of deadlines.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Gauge,
              title: "Unified profile",
              body: "Link each platform once. CampusCode pulls your rating, peak rating, contest count, solved problems and recent form — verified, with missing data shown as unavailable instead of zero.",
            },
            {
              icon: LayoutGrid,
              title: "College directory",
              body: "Filter College → Department → Course → Year → Batch. Find the exact peer you want to compare against, then open their public coding dashboard.",
            },
            {
              icon: Trophy,
              title: "C / B / A / S classes",
              body: "Our own tier, derived from a published formula: percentile-normalised platform ratings, participation consistency and recent improvement.",
            },
            {
              icon: CalendarClock,
              title: "Contest calendar",
              body: "Codeforces, LeetCode, CodeChef and AtCoder contests in one feed, in your timezone, with status, duration and registration deadlines where they exist.",
            },
            {
              icon: Bell,
              title: "Reminders that fire",
              body: "Save a contest, pick 24 hours / 1 hour / 10 minutes before. The backend schedules it — the alert arrives even if you never reopen the site.",
            },
            {
              icon: Users,
              title: "Friends league",
              body: "Friend groups, weekly goals, participation streaks and friendly comparisons that reward consistency without shaming beginners.",
            },
            {
              icon: ShieldCheck,
              title: "Privacy by default",
              body: "Directory participation is opt-in. You choose which stats and linked accounts are visible, and can unlink or delete everything at any time.",
            },
            {
              icon: GraduationCap,
              title: "Built for one college first",
              body: "We start with a single campus, prove the leaderboard loop, then open inter-college battles, clubs and campus-wide events.",
            },
          ].map((feature) => (
            <article key={feature.title} className="card card-hover p-5">
              <feature.icon className="h-5 w-5 text-brand-bright" />
              <h3 className="mt-3 font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="card overflow-hidden">
          <div className="grid gap-8 p-8 lg:grid-cols-2 lg:p-12">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                A class you can actually read
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                The CampusCode score runs from 0 to 1000 and mixes three published components.
                Every student can see exactly how their score is built and what would move
                them to the next tier.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Skill", weight: SCORE_WEIGHTS.skill, body: "Percentile-normalised platform ratings, combined so that no single platform can dominate." },
                  { label: "Consistency", weight: SCORE_WEIGHTS.consistency, body: "Recent participation with diminishing returns — volume alone never buys a tier." },
                  { label: "Improvement", weight: SCORE_WEIGHTS.improvement, body: "Rating movement over the last 90 days, so climbing counts for something." },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-4">
                    <span className="mt-0.5 w-24 shrink-0 font-mono text-xs text-ink-faint">
                      {row.label} / {row.weight}
                    </span>
                    <span className="text-sm text-ink-muted">{row.body}</span>
                  </div>
                ))}
              </div>
              <Link href="/methodology" className="btn btn-secondary mt-7">
                Read the full methodology
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-surface-2 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Tier thresholds
              </p>
              <div className="mt-4 space-y-2.5">
                {CLASS_THRESHOLDS.map((t) => (
                  <div
                    key={t.cls}
                    className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3"
                  >
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-sm font-bold"
                      style={{
                        color: CLASS_HEX[t.cls],
                        borderColor: `color-mix(in oklab, ${CLASS_HEX[t.cls]} 40%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${CLASS_HEX[t.cls]} 12%, transparent)`,
                      }}
                    >
                      {t.cls}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{t.label}</span>
                      <span className="block text-xs text-ink-faint">
                        {classCounts[t.cls] ?? 0} students here
                      </span>
                    </span>
                    <span className="font-mono text-sm text-ink-muted">
                      {t.min}+
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                CampusCode classes are our own tier. They are not official ratings issued by
                Codeforces, LeetCode, CodeChef or AtCoder.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="card relative overflow-hidden px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-brand/20 blur-[90px]" />
          <h2 className="relative text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Your college is your real competition.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-ink-muted">
            Bring your batch. We will handle the leaderboard, the classes and the contest
            calendar so you can focus on the problems.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn btn-primary px-6 py-2.5">
              Create your profile
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/leaderboard" className="btn btn-secondary px-6 py-2.5">
              Explore leaderboards
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
