import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Log in" };

// This route depends on request-time session data, so it renders per request.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Log in to see your class, your college leaderboard position and your saved contests.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-surface-2" />}>
            <LoginFormSection searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-ink-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-bright hover:underline">
            Create a profile
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * The form lives behind a boundary so the `next` destination from the query
 * string is read per request instead of being baked into the prerendered shell.
 */
async function LoginFormSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;

  return <LoginForm next={next} />;
}
