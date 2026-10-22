import { getSessionUser } from "@/lib/auth";
import { hierarchy } from "@/lib/services/leaderboard";
import { DirectoryBrowser } from "@/components/directory-browser";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Student directory" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function DirectoryPage() {
  const session = await getSessionUser();
  const { colleges, years, batches } = await hierarchy();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Discover"
        title="College student directory"
        description="Filter College → Department → Course → Year → Batch to find the exact peer you want to compare against, then open their public coding dashboard."
      />

      <DirectoryBrowser
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
        initialCollegeId={session?.collegeId ?? null}
      />
    </div>
  );
}
