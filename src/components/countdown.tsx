"use client";

import { useEffect, useState } from "react";

function diffParts(target: number, now: number) {
  const delta = Math.max(0, target - now);
  const days = Math.floor(delta / 86400000);
  const hours = Math.floor((delta % 86400000) / 3600000);
  const minutes = Math.floor((delta % 3600000) / 60000);
  const seconds = Math.floor((delta % 60000) / 1000);
  return { delta, days, hours, minutes, seconds };
}

export function Countdown({
  target,
  prefix = "Starts in",
  compact = false,
}: {
  target: string | Date;
  prefix?: string;
  compact?: boolean;
}) {
  const targetTime = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { delta, days, hours, minutes, seconds } = diffParts(targetTime, now);

  if (delta <= 0) {
    return <span className="font-mono text-xs text-ink-faint">Live now</span>;
  }

  if (compact) {
    const text =
      days > 0
        ? `${days}d ${hours}h`
        : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m ${seconds}s`;
    return (
      <span className="font-mono text-xs text-ink-muted" suppressHydrationWarning>
        {prefix} {text}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm" suppressHydrationWarning>
      <span className="text-ink-faint">{prefix}</span>
      {days > 0 && (
        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink">{days}d</span>
      )}
      <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink">
        {String(hours).padStart(2, "0")}h
      </span>
      <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink">
        {String(minutes).padStart(2, "0")}m
      </span>
      <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink">
        {String(seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}

/**
 * Renders a timestamp in an explicit IANA timezone so the server and the
 * browser always agree — no hydration mismatch and no client-only clock.
 */
export function LocalTime({
  iso,
  timeZone = "Asia/Kolkata",
}: {
  iso: string | Date;
  timeZone?: string;
}) {
  const date = new Date(iso);
  let label: string;
  try {
    label = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    label = date.toISOString().slice(0, 16).replace("T", " ");
  }

  return (
    <time dateTime={date.toISOString()} className="text-ink-muted">
      {label}
    </time>
  );
}
