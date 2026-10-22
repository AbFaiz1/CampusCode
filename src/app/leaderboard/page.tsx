import { getSessionUser } from "@/lib/auth";
import { hierarchy } from "@/lib/services/leaderboard";
import { LeaderboardExplorer } from "@/components/leaderboard-explorer";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Leaderboards" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function LeaderboardPage() {
  const session = await getSessionUser();
  const { colleges, years, batches } = await hierarchy();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboards"
        description="College, department, course, year, batch, friends, per-platform and class boards. Every board states exactly what it measures."
      />

      <LeaderboardExplorer
        colleges={colleges.map((c) => ({
          id: c.id,
          name: c.name,
          departments: c.departments.map((d) => ({
            id: d.id,
            name: d.name,
            courses: d.courses.map((course) => ({
              id: course.id,
              name: course.name,
              shortName: course.shortName,
            })),
          })),
        }))}
        years={years}
        batches={batches}
        signedIn={Boolean(session)}
      />
    </div>
  );
}
