import { classHex } from "@/lib/class-styles";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-ink-faint">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-bright">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {title}
      </h2>
      {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p
        className="mt-1.5 font-mono text-xl font-semibold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function ActivityDot({ level }: { level: string }) {
  const color =
    level === "ACTIVE"
      ? "var(--color-positive)"
      : level === "RECENT"
        ? "var(--color-warning)"
        : level === "DORMANT"
          ? "var(--color-ink-faint)"
          : "var(--color-brand)";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      title={`Activity: ${level.toLowerCase()}`}
    />
  );
}

export function ClassProgressBar({
  score,
  class: campusClass,
}: {
  score: number;
  class: string;
}) {
  const hex = classHex(campusClass);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, Math.max(2, (score / 1000) * 100))}%`,
          background: `linear-gradient(90deg, color-mix(in oklab, ${hex} 45%, transparent), ${hex})`,
        }}
      />
    </div>
  );
}
