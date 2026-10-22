import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directory", label: "Directory" },
  { href: "/leaderboard", label: "Leaderboards" },
  { href: "/contests", label: "Contests" },
  { href: "/friends", label: "Friends" },
  { href: "/groups", label: "Groups" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-mono text-sm font-bold text-white shadow-[0_0_24px_-6px_var(--color-brand)]">
            C
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-class-s ring-2 ring-canvas" />
          </span>
          <span className="hidden text-[0.95rem] font-semibold tracking-tight text-ink sm:block">
            Campus<span className="text-brand-bright">Code</span>
          </span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/methodology"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Methodology
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<AccountFallback />}>
            <AccountArea />
          </Suspense>
        </div>
      </div>

      <nav className="flex gap-0.5 overflow-x-auto border-t border-line-soft px-4 py-2 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2 hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/methodology"
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2 hover:text-ink"
        >
          Methodology
        </Link>
      </nav>
    </header>
  );
}

function AccountFallback() {
  return (
    <span
      aria-hidden
      className="h-8 w-24 animate-pulse rounded-lg border border-line bg-surface-2"
    />
  );
}

async function AccountArea() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className="btn btn-ghost">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Join CampusCode
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/notifications"
        className="relative rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-brand/50 hover:text-ink"
      >
        Alerts
      </Link>
      <Link
        href={`/u/${user.id}`}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-3 transition hover:border-brand/50"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size={26} />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:block">
          {user.displayName}
        </span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="btn btn-ghost hidden sm:inline-flex">
          Log out
        </button>
      </form>
    </>
  );
}
