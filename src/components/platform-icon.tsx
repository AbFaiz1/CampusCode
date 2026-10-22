import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/constants";

export function PlatformIcon({
  platform,
  className = "h-4 w-4",
}: {
  platform: string;
  className?: string;
}) {
  const color = PLATFORM_COLORS[platform as Platform] ?? "#94a3b8";
  const short =
    platform === "CODEFORCES"
      ? "CF"
      : platform === "LEETCODE"
        ? "LC"
        : platform === "CODECHEF"
          ? "CC"
          : "AC";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-mono font-bold ${className}`}
      style={{
        color,
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
        fontSize: "0.62rem",
        letterSpacing: "-0.02em",
      }}
      title={PLATFORM_LABELS[platform as Platform] ?? platform}
      aria-label={PLATFORM_LABELS[platform as Platform] ?? platform}
    >
      {short}
    </span>
  );
}

export function RatingValue({
  platform,
  rating,
  size = "md",
}: {
  platform: string;
  rating: number | null;
  size?: "sm" | "md";
}) {
  const color = PLATFORM_COLORS[platform as Platform] ?? "#94a3b8";
  if (rating === null) {
    return (
      <span
        className={`${size === "sm" ? "text-xs" : "text-sm"} font-mono text-ink-faint`}
        title="This platform does not publish a rating for this account"
      >
        N/A
      </span>
    );
  }
  return (
    <span
      className={`${size === "sm" ? "text-xs" : "text-sm"} font-mono font-semibold`}
      style={{ color }}
    >
      {rating}
    </span>
  );
}
