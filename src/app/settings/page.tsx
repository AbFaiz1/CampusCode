import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORMS, type Platform } from "@/lib/constants";
import { PageHeader, SectionTitle } from "@/components/ui";
import { AccountManager } from "@/components/account-manager";
import { ProfileForm, PrivacyForm, PasswordForm, DeleteAccountForm } from "@/components/settings-forms";

export const metadata = { title: "Settings" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      accounts: { orderBy: { platform: "asc" } },
      college: true,
      department: true,
      course: true,
    },
  });
  if (!user) redirect("/login");

  const colleges = await prisma.college.findMany({
    include: {
      departments: {
        include: { courses: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const claims = await prisma.verificationClaim.findMany({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, your linked coding accounts, your privacy and your goals."
      />

      <div className="space-y-5">
        <section className="card p-5 sm:p-6">
          <SectionTitle title="Profile" hint="Shown on your public coding dashboard" />
          <ProfileForm
            user={{
              displayName: user.displayName,
              bio: user.bio,
              avatarUrl: user.avatarUrl,
              collegeId: user.collegeId,
              departmentId: user.departmentId,
              courseId: user.courseId,
              academicYear: user.academicYear,
              batch: user.batch,
              graduationYear: user.graduationYear,
              codingInterests: user.codingInterests,
              timezone: user.timezone,
            }}
            colleges={colleges.map((c) => ({
              id: c.id,
              name: c.name,
              departments: c.departments.map((d) => ({
                id: d.id,
                name: d.name,
                courses: d.courses.map((course) => ({
                  id: course.id,
                  name: course.name,
                })),
              })),
            }))}
          />
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle
            title="Linked coding accounts"
            hint="Only verified accounts count toward rankings"
          />
          <AccountManager
            accounts={user.accounts.map((a) => ({
              id: a.id,
              platform: a.platform,
              handle: a.handle,
              profileUrl: a.profileUrl,
              rating: a.rating,
              maxRating: a.maxRating,
              rank: a.rank,
              problemsSolved: a.problemsSolved,
              contestsAttended: a.contestsAttended,
              verificationStatus: a.verificationStatus,
              lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
              syncStatus: a.syncStatus,
              syncError: a.syncError,
            }))}
            platforms={[...PLATFORMS] as Platform[]}
            verificationCode={claims[0]?.code ?? null}
          />
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Privacy" hint="You decide who sees what" />
          <PrivacyForm
            values={{
              isPublic: user.isPublic,
              showInDirectory: user.showInDirectory,
              showRatings: user.showRatings,
              showPlatforms: user.showPlatforms,
              showEmail: user.showEmail,
            }}
          />
        </section>

        <section className="card p-5 sm:p-6">
          <SectionTitle title="Security" />
          <PasswordForm />
        </section>

        <section className="card border-danger/30 p-5 sm:p-6">
          <SectionTitle title="Delete account" hint="This cannot be undone" />
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            Deleting your account removes your profile, linked platform statistics, rating
            history, friendships, reminders and group memberships. The platform data we fetched
            from Codeforces, LeetCode, CodeChef or AtCoder stays on their side — we only stop
            storing it here.
          </p>
          <DeleteAccountForm />
        </section>
      </div>
    </div>
  );
}
