import { classStyle } from "@/lib/class-styles";
import type { CampusClass } from "@/lib/constants";

export function ClassBadge({
  value,
  size = "md",
}: {
  value: string;
  size?: "sm" | "md" | "lg";
}) {
  const style = classStyle(value);
  const dims =
    size === "lg"
      ? "h-12 w-12 text-xl rounded-2xl"
      : size === "sm"
        ? "h-7 w-7 text-xs rounded-lg"
        : "h-9 w-9 text-sm rounded-xl";

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold ${dims} ${style.text} ${style.bg} ${style.border} border ${style.glow}`}
      title={`CampusCode Class ${value}`}
      aria-label={`Class ${value}`}
    >
      {value}
    </span>
  );
}

export function ClassPill({ value, score }: { value: string; score?: number }) {
  const style = classStyle(value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.text} ${style.bg} ${style.border}`}
    >
      <span className="font-mono">{value}</span>
      {score !== undefined && (
        <span className="font-mono opacity-80">{Math.round(score)}</span>
      )}
    </span>
  );
}

export function ClassExplainer({ value }: { value: CampusClass }) {
  const style = classStyle(value);
  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-3">
        <ClassBadge value={value} size="lg" />
        <div>
          <p className={`font-semibold ${style.text}`}>Class {value}</p>
          <p className="text-xs text-ink-muted">CampusCode tier</p>
        </div>
      </div>
    </div>
  );
}
