import {
  CLASS_THRESHOLDS,
  METHODOLOGY_VERSION,
  PLATFORM_CURVES,
  PLATFORM_LABELS,
  SCORE_WEIGHTS,
  type Platform,
} from "@/lib/constants";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Scoring methodology" };

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Transparency"
        title="How the CampusCode score works"
        description={`Version ${METHODOLOGY_VERSION} of the CampusCode scoring methodology. Every number a student sees is produced by the formula below — there is no hidden adjustment and no manual tiering.`}
        actions={
          <a href="/methodology#privacy" className="btn btn-secondary">
            Privacy & data policy
          </a>
        }
      />

      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <SectionTitle title="The three components" />
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            The CampusCode score runs from <span className="font-mono text-ink">0</span> to{" "}
            <span className="font-mono text-ink">1000</span>. It is the sum of three components,
            each capped so that no single dimension can carry the whole score.
          </p>

          <div className="space-y-3">
            {[
              {
                title: "Skill",
                weight: SCORE_WEIGHTS.skill,
                body: "A normalised estimate of competitive ability derived from verified platform ratings. Ratings live on different scales, so they are never added together directly — each platform is converted to a 0-1 strength first.",
              },
              {
                title: "Consistency",
                weight: SCORE_WEIGHTS.consistency,
                body: "Recent participation with deliberately diminishing returns. Four contests in 90 days already count for most of this component; a hundred contests count barely more. Participation is not skill, so it cannot buy a tier on its own.",
              },
              {
                title: "Improvement",
                weight: SCORE_WEIGHTS.improvement,
                body: "Rating movement over the last 90 days, mapped from −150 to +150 onto the full component range. Steady climbers are rewarded even before they cross a tier threshold.",
              },
            ].map((row) => (
              <div key={row.title} className="rounded-xl border border-line bg-surface-2 px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-ink">{row.title}</h3>
                  <span className="font-mono text-sm text-ink-faint">
                    0 – {row.weight}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{row.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Normalising different rating scales" />
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            Each platform is converted to a 0-1 strength with a logistic curve, then blended with
            the student&apos;s percentile inside their own college cohort. The blend is{" "}
            <span className="font-mono text-ink">65%</span> absolute curve and{" "}
            <span className="font-mono text-ink">35%</span> cohort percentile. When a college has
            fewer than 8 verified students on a platform, the percentile is dropped and the
            absolute curve is used on its own.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.68rem] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">Platform</th>
                  <th className="pb-2 pr-3 font-semibold">Midpoint</th>
                  <th className="pb-2 pr-3 font-semibold">Scale</th>
                  <th className="pb-2 pr-3 font-semibold">Weight</th>
                  <th className="pb-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {(Object.keys(PLATFORM_CURVES) as Platform[]).map((platform) => {
                  const curve = PLATFORM_CURVES[platform];
                  return (
                    <tr key={platform}>
                      <td className="py-2.5 pr-3 font-medium text-ink">
                        {PLATFORM_LABELS[platform]}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-ink-muted">{curve.mid}</td>
                      <td className="py-2.5 pr-3 font-mono text-ink-muted">{curve.scale}</td>
                      <td className="py-2.5 pr-3 font-mono text-ink-muted">{curve.weighting}</td>
                      <td className="py-2.5 text-xs text-ink-faint">{curve.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Platform strengths are then combined with a{" "}
            <span className="font-semibold text-ink">noisy-OR</span>: a student is never better
            than their strongest platform, but a second strong platform still adds value with
            diminishing returns. Adding raw ratings such as{" "}
            <span className="font-mono">1500 + 1900</span> would be meaningless, so we never do
            that.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Class thresholds" />
          <div className="space-y-2.5">
            {CLASS_THRESHOLDS.map((tier) => (
              <div
                key={tier.cls}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface font-mono text-sm font-bold text-ink">
                  {tier.cls}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{tier.label}</span>
                  <span className="block text-xs text-ink-faint">
                    Score of {tier.min} and above
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            CampusCode classes are our own tier. They are <strong>not</strong> official ratings
            issued by Codeforces, LeetCode, CodeChef or AtCoder, and they do not affect any
            platform rating.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Activity is separate from skill" />
          <p className="text-sm leading-relaxed text-ink-muted">
            Alongside the class, every student has an activity indicator —{" "}
            <span className="text-positive">active</span> (contested within 14 days),{" "}
            <span className="text-warning">recent</span> (within 45 days),{" "}
            <span className="text-ink-faint">dormant</span> (longer) or{" "}
            <span className="text-brand-bright">new</span> (no contests yet). It is shown next to
            the class but never changes it, so a student going through exam season is not
            punished with a lower tier.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Where the data comes from" />
          <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Codeforces</strong> — official public API: user info
              (rating, peak rating, rank), rating history, and the submission log for solved
              problem counts.
            </li>
            <li>
              <strong className="text-ink">LeetCode</strong> — public GraphQL API: contest rating
              and rank, full contest-by-contest rating history, global rank position and problems
              solved by difficulty.
            </li>
            <li>
              <strong className="text-ink">CodeChef</strong> — public contest list API and the
              public rating history embedded in the profile page.
            </li>
            <li>
              <strong className="text-ink">AtCoder</strong> — public profile pages for rating,
              peak rating, rated-match count and contest history.
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Every request is rate limited and uses only public, read-only endpoints. We never
            ask for or store your platform password, and we never write to your coding
            accounts.
          </p>
        </section>

        <section id="privacy" className="card p-5 sm:p-6 scroll-mt-24">
          <SectionTitle title="Privacy and data policy" />
          <ul className="space-y-2.5 text-sm leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Opt-in listing.</strong> You only appear in the
              directory and on leaderboards if you enable both the public profile and directory
              switches. You can hide yourself at any time without deleting your account.
            </li>
            <li>
              <strong className="text-ink">Per-field control.</strong> Ratings, class, platform
              accounts and email address each have their own visibility switch.
            </li>
            <li>
              <strong className="text-ink">Verified vs submitted.</strong> Platform numbers are
              fetched from the platform and labelled verified. Anything you type yourself is
              labelled as your own claim. We never blend the two.
            </li>
            <li>
              <strong className="text-ink">Missing is not zero.</strong> When a platform does not
              publish a value, the interface shows it as unavailable. We do not substitute a zero
              or a guess.
            </li>
            <li>
              <strong className="text-ink">Anti-impersonation.</strong> A handle must exist on
              the platform, and ownership is proven by placing a one-time code in the profile
              display name. A handle can only be linked by one account.
            </li>
            <li>
              <strong className="text-ink">Leave any time.</strong> Unlink a platform to erase its
              stored statistics, or delete the whole account to remove your profile, history,
              friendships and reminders.
            </li>
          </ul>
        </section>

        <p className="text-center text-xs text-ink-faint">
          Methodology version {METHODOLOGY_VERSION}. We publish changes here before they ship.
        </p>
      </div>
    </div>
  );
}
