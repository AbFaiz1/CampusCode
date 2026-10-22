import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-brand-bright">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        This page slipped out of the rankings
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">
        The page you are looking for does not exist, was moved, or belongs to a student whose
        profile is private.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link href="/leaderboard" className="btn btn-ghost">
          View leaderboards
        </Link>
      </div>
    </div>
  );
}
