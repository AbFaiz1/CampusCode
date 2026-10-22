import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "Join" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-lg flex-col justify-center px-4 py-16">
      <div className="card p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Join CampusCode
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Two minutes to set up. Link your coding platforms afterwards and your score and
          class update automatically.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface-2" />}>
            <SignupFormSection />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-brand-bright hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * The college list is read per request so a college added after the build is
 * still selectable.
 */
async function SignupFormSection() {
  const colleges = await prisma.college.findMany({
    include: {
      departments: {
        include: { courses: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <SignupForm
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
  );
}
