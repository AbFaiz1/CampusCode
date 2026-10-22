import {
  ABSOLUTE_CURVE_WEIGHT,
  CLASS_THRESHOLDS,
  METHODOLOGY_VERSION,
  MIN_COHORT_FOR_PERCENTILE,
  PLATFORM_CURVES,
  SCORE_WEIGHTS,
  type ActivityLevel,
  type CampusClass,
  type Platform,
} from "@/lib/constants";

export type PlatformSignal = {
  kind: "RATING" | "RANK_POSITION" | "PROBLEMS_SOLVED";
  strength: number;
  weight: number;
  detail: string;
};

export type PlatformStrength = {
  platform: Platform;
  rating: number | null;
  normalized: number;
  weightedContribution: number;
  signals: PlatformSignal[];
  available: boolean;
  note: string;
};

export type ScoreBreakdown = {
  version: string;
  skill: number;
  consistency: number;
  improvement: number;
  total: number;
  cls: CampusClass;
  activity: ActivityLevel;
  nextClass: { cls: CampusClass; required: number; pointsAway: number } | null;
  platforms: PlatformStrength[];
  reasons: string[];
  computedAt: string;
};

export type ScoreInput = {
  platforms: {
    platform: Platform;
    rating: number | null;
    globalRank: number | null;
    problemsSolved: number | null;
    verified: boolean;
  }[];
  /** All verified ratings for the same platform within the student's cohort. */
  cohortRatings: Partial<Record<Platform, number[]>>;
  /** Contest dates (participated contests) for the student. */
  contestDates: Date[];
  /** Rating series (chronological) for the student, for trend detection. */
  ratingSeries: { platform: Platform; rating: number; at: Date }[];
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Absolute curve: rating -> 0..1 strength for a platform. */
export function ratingStrength(platform: Platform, rating: number): number {
  const curve = PLATFORM_CURVES[platform];
  const clamped = clamp(rating, curve.min, curve.max);
  return logistic((clamped - curve.mid) / curve.scale);
}

/**
 * Global rank position -> 0..1 strength, used as an extra signal next to the
 * rating. rank=1 -> ~1.0, rank=100 -> ~0.52, rank=100k -> ~0.31.
 */
export function rankPositionStrength(globalRank: number): number {
  const r = Math.max(1, globalRank);
  return 1 / (1 + Math.log10(r) / 2.2);
}

/** Problems solved -> 0..1 strength (all-time problem count). */
export function problemsSolvedStrength(solved: number): number {
  return logistic((solved - 300) / 250);
}

/**
 * Cohort percentile: the share of verified peers with a rating at or below
 * this one. Returns null when the cohort is too small to be meaningful.
 */
export function cohortPercentile(rating: number, cohort: number[] | undefined): number | null {
  if (!cohort || cohort.length < MIN_COHORT_FOR_PERCENTILE) return null;
  const below = cohort.filter((r) => r < rating).length;
  const equal = cohort.filter((r) => r === rating).length;
  const denominator = cohort.length - 1;
  if (denominator <= 0) return null;
  return clamp((below + equal / 2) / denominator, 0, 1);
}

function platformStrength(input: ScoreInput, platform: Platform): PlatformStrength {
  const meta = PLATFORM_CURVES[platform];
  const entry = input.platforms.find((p) => p.platform === platform);
  const signals: PlatformSignal[] = [];

  if (!entry || !entry.verified) {
    return {
      platform,
      rating: entry?.rating ?? null,
      normalized: 0,
      weightedContribution: 0,
      signals: [],
      available: false,
      note: "No verified linked account.",
    };
  }

  if (entry.rating !== null) {
    const absolute = ratingStrength(platform, entry.rating);
    const percentile = cohortPercentile(entry.rating, input.cohortRatings[platform]);
    const blended =
      percentile === null
        ? absolute
        : ABSOLUTE_CURVE_WEIGHT * absolute + (1 - ABSOLUTE_CURVE_WEIGHT) * percentile;
    signals.push({
      kind: "RATING",
      strength: blended,
      weight: 1,
      detail:
        percentile === null
          ? `Rating ${entry.rating} → ${(absolute * 100).toFixed(0)}% of the platform scale`
          : `Rating ${entry.rating} → ${(absolute * 100).toFixed(0)}% absolute, ${(percentile * 100).toFixed(0)}th percentile in your college`,
    });
  }

  if (entry.globalRank !== null && entry.globalRank > 0) {
    const strength = rankPositionStrength(entry.globalRank);
    signals.push({
      kind: "RANK_POSITION",
      strength,
      weight: 0.85,
      detail: `Global rank #${entry.globalRank.toLocaleString("en-IN")} → ${(strength * 100).toFixed(0)}% of the platform field`,
    });
  }

  if (entry.problemsSolved !== null && entry.problemsSolved > 0) {
    const strength = problemsSolvedStrength(entry.problemsSolved);
    signals.push({
      kind: "PROBLEMS_SOLVED",
      strength,
      weight: 0.4,
      detail: `${entry.problemsSolved.toLocaleString("en-IN")} problems solved → ${(strength * 100).toFixed(0)}% problem coverage`,
    });
  }

  if (signals.length === 0) {
    return {
      platform,
      rating: entry.rating ?? null,
      normalized: 0,
      weightedContribution: 0,
      signals: [],
      available: false,
      note: "Linked account verified, but the platform exposes no comparable skill metric.",
    };
  }

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const normalized = signals.reduce((sum, s) => sum + s.strength * s.weight, 0) / totalWeight;
  const weighted = normalized * meta.weighting;

  return {
    platform,
    rating: entry.rating ?? null,
    normalized,
    weightedContribution: weighted,
    signals,
    available: true,
    note: meta.note,
  };
}

/** Combine platform strengths with a noisy-OR: depth saturates, no double counting. */
export function combinePlatforms(strengths: PlatformStrength[]): number {
  let remaining = 1;
  for (const s of strengths) {
    if (!s.available) continue;
    const contribution = clamp(s.weightedContribution, 0, 0.999);
    remaining *= 1 - contribution;
  }
  return 1 - remaining;
}

export function consistencyScore(contestDates: Date[], now = new Date()): {
  score: number;
  recent: number;
  recency: number;
  daysSinceLast: number | null;
} {
  const windowStart = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  const recent = contestDates.filter((d) => d.getTime() >= windowStart).length;

  const sorted = [...contestDates].sort((a, b) => b.getTime() - a.getTime());
  const last = sorted[0];
  const daysSinceLast = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : null;

  // Diminishing returns: participation volume alone must not dominate.
  const participation = 1 - Math.exp(-recent / 4);

  const recency =
    daysSinceLast === null
      ? 0
      : daysSinceLast <= 7
        ? 1
        : daysSinceLast <= 30
          ? 0.8
          : daysSinceLast <= 90
            ? 0.5
            : daysSinceLast <= 180
              ? 0.25
              : 0;

  const score = SCORE_WEIGHTS.consistency * (0.65 * participation + 0.35 * recency);
  return { score, recent, recency, daysSinceLast };
}

export function improvementScore(
  ratingSeries: { rating: number; at: Date }[],
  now = new Date(),
): { score: number; delta: number | null; windowDays: number } {
  if (!ratingSeries.length) return { score: 0, delta: null, windowDays: 90 };
  const sorted = [...ratingSeries].sort((a, b) => a.at.getTime() - b.at.getTime());
  const current = sorted[sorted.length - 1];
  const windowStart = now.getTime() - 90 * 24 * 60 * 60 * 1000;

  const inWindow = sorted.filter((s) => s.at.getTime() >= windowStart);
  const baseline = inWindow.length >= 2 ? inWindow[0] : sorted[0];
  const delta = current.rating - baseline.rating;

  const score = SCORE_WEIGHTS.improvement * clamp((delta + 150) / 300, 0, 1);
  return { score, delta, windowDays: 90 };
}

export function activityLevel(daysSinceLast: number | null, hasAnyContest: boolean): ActivityLevel {
  if (!hasAnyContest) return "NEW";
  if (daysSinceLast === null) return "NEW";
  if (daysSinceLast <= 14) return "ACTIVE";
  if (daysSinceLast <= 45) return "RECENT";
  return "DORMANT";
}

export function classForTotal(total: number): CampusClass {
  for (const t of CLASS_THRESHOLDS) {
    if (total >= t.min) return t.cls;
  }
  return "C";
}

export function nextClassFor(total: number): ScoreBreakdown["nextClass"] {
  const ascending = [...CLASS_THRESHOLDS].sort((a, b) => a.min - b.min);
  const currentIndex = ascending.findIndex((t) => total >= t.min);
  const next = currentIndex >= 0 ? ascending[currentIndex + 1] : undefined;
  if (!next) return null;
  return {
    cls: next.cls,
    required: next.min,
    pointsAway: Math.max(0, Math.ceil(next.min - total)),
  };
}

/** Pure scoring computation — no I/O, fully unit-testable. */
export function computeScore(input: ScoreInput, now = new Date()): ScoreBreakdown {
  const reasons: string[] = [];

  const strengths = (Object.keys(PLATFORM_CURVES) as Platform[]).map((p) =>
    platformStrength(input, p),
  );

  const active = strengths.filter((s) => s.available);
  const combined = combinePlatforms(strengths);
  const skill = SCORE_WEIGHTS.skill * combined;

  for (const s of active) {
    for (const signal of s.signals) {
      reasons.push(`${s.platform}: ${signal.detail}`);
    }
  }
  if (!active.length) {
    reasons.push("No verified platform accounts yet — link and verify a profile to earn a score.");
  }

  const consistency = consistencyScore(input.contestDates, now);
  const improvement = improvementScore(input.ratingSeries, now);

  if (consistency.recent > 0) {
    reasons.push(`${consistency.recent} contest${consistency.recent === 1 ? "" : "s"} in the last 90 days.`);
  } else {
    reasons.push("No contests in the last 90 days.");
  }
  if (improvement.delta !== null) {
    const sign = improvement.delta >= 0 ? "+" : "";
    reasons.push(`Rating change over 90 days: ${sign}${improvement.delta}.`);
  }

  const total = Math.round((skill + consistency.score + improvement.score) * 10) / 10;
  const cls = classForTotal(total);

  return {
    version: METHODOLOGY_VERSION,
    skill: Math.round(skill * 10) / 10,
    consistency: Math.round(consistency.score * 10) / 10,
    improvement: Math.round(improvement.score * 10) / 10,
    total,
    cls,
    activity: activityLevel(consistency.daysSinceLast, input.contestDates.length > 0),
    nextClass: nextClassFor(total),
    platforms: strengths,
    reasons,
    computedAt: now.toISOString(),
  };
}
