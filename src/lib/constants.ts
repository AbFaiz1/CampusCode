/**
 * Canonical enumerations + scoring constants for CampusCode.
 *
 * Everything here is deliberately data, not code, so the methodology page and
 * the scoring engine can never drift apart.
 */

export const PLATFORMS = ["CODEFORCES", "LEETCODE", "CODECHEF", "ATCODER"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  CODEFORCES: "Codeforces",
  LEETCODE: "LeetCode",
  CODECHEF: "CodeChef",
  ATCODER: "AtCoder",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  CODEFORCES: "#f43f5e",
  LEETCODE: "#f59e0b",
  CODECHEF: "#8b5cf6",
  ATCODER: "#22d3ee",
};

export const PLATFORM_URLS: Record<Platform, (handle: string) => string> = {
  CODEFORCES: (h) => `https://codeforces.com/profile/${h}`,
  LEETCODE: (h) => `https://leetcode.com/u/${h}/`,
  CODECHEF: (h) => `https://www.codechef.com/users/${h}`,
  ATCODER: (h) => `https://atcoder.jp/users/${h}`,
};

/** CampusCode classes, lowest to highest. */
export const CLASSES = ["C", "B", "A", "S"] as const;
export type CampusClass = (typeof CLASSES)[number];

export const CLASS_LABELS: Record<CampusClass, string> = {
  C: "Class C",
  B: "Class B",
  A: "Class A",
  S: "Class S",
};

export const CLASS_DESCRIPTIONS: Record<CampusClass, string> = {
  C: "Beginner — starting out or limited verified competitive performance.",
  B: "Intermediate — established competitive programming ability and participation.",
  A: "Advanced — strong performance and consistent improvement.",
  S: "Elite — exceptional competitive programming performance.",
};

/**
 * Score thresholds (0-1000 scale).
 * Documented in src/app/methodology and rendered live on the methodology page.
 */
export const CLASS_THRESHOLDS: { cls: CampusClass; min: number; label: string }[] = [
  { cls: "S", min: 850, label: "Elite" },
  { cls: "A", min: 650, label: "Advanced" },
  { cls: "B", min: 400, label: "Intermediate" },
  { cls: "C", min: 0, label: "Beginner" },
];

/** Weight of each score component (must sum to 1000). */
export const SCORE_WEIGHTS = {
  skill: 800,
  consistency: 150,
  improvement: 50,
} as const;

export const METHODOLOGY_VERSION = "1.2.0";

/**
 * Absolute rating curves per platform.
 *
 * `mid`  — the rating that maps to a normalised strength of 0.5.
 * `scale`— logistic steepness. Larger = harsher separation.
 * `min`/`max` — hard clamps applied before normalisation.
 *
 * These are calibrated against each platform's published rating
 * distribution; a rating of `mid` is a strong, established competitor.
 */
export const PLATFORM_CURVES: Record<
  Platform,
  { mid: number; scale: number; min: number; max: number; weighting: number; note: string }
> = {
  CODEFORCES: {
    mid: 1400,
    scale: 620,
    min: 0,
    max: 3800,
    weighting: 1.0,
    note: "Codeforces rating (0-3800). Midpoint set at specialist+ level (1400).",
  },
  LEETCODE: {
    mid: 1700,
    scale: 450,
    min: 0,
    max: 3200,
    weighting: 0.75,
    note: "LeetCode contest rating (0-3000+). Midpoint set at the mid weekly-contest tier (1700).",
  },
  CODECHEF: {
    mid: 1650,
    scale: 520,
    min: 0,
    max: 3500,
    weighting: 0.7,
    note: "CodeChef rating (0-3500). Midpoint set just below the top-100 percentile (1650).",
  },
  ATCODER: {
    mid: 1750,
    scale: 700,
    min: 0,
    max: 4000,
    weighting: 0.85,
    note: "AtCoder rating (0-4000). Midpoint set at the ARC blue band (1750).",
  },
};

/** Fraction of the platform-strength estimate taken from the absolute curve. */
export const ABSOLUTE_CURVE_WEIGHT = 0.65;
/** Minimum cohort size required before the cohort percentile is trusted. */
export const MIN_COHORT_FOR_PERCENTILE = 8;

export const ACTIVITY_LEVELS = ["NEW", "ACTIVE", "RECENT", "DORMANT"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const REMINDER_OFFSETS = [
  { minutes: 1440, label: "24 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 10, label: "10 minutes before" },
] as const;

export const CONTEST_STATUSES = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"] as const;
export type ContestStatus = (typeof CONTEST_STATUSES)[number];

export function classForScore(score: number): CampusClass {
  for (const t of CLASS_THRESHOLDS) {
    if (score >= t.min) return t.cls;
  }
  return "C";
}

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function isCampusClass(value: string): value is CampusClass {
  return (CLASSES as readonly string[]).includes(value);
}
