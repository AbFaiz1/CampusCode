import "server-only";

import { prisma } from "@/lib/db";
import { isPlatform, type Platform } from "@/lib/constants";
import { computeScore, type ScoreBreakdown } from "@/lib/scoring";

/**
 * Recompute the CampusCode score + class for one student.
 *
 * Cohort percentiles are computed from verified ratings of students in the
 * same college (falling back to the whole platform when the cohort is small).
 */
export async function recomputeUserScore(userId: string): Promise<ScoreBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      ratingHistory: { orderBy: { participatedAt: "asc" } },
    },
  });
  if (!user) throw new Error("User not found");

  const accounts = user.accounts.filter((a) => a.verificationStatus === "VERIFIED");
  const platforms = accounts.map((a) => ({
    platform: a.platform as Platform,
    rating: a.rating,
    globalRank: a.globalRank,
    problemsSolved: a.problemsSolved,
    verified: true,
  }));

  // Cohort: verified accounts of students in the same college (queried concurrently).
  const activePlatforms = Array.from(
    new Set(
      accounts
        .filter((a) => a.rating !== null && isPlatform(a.platform))
        .map((a) => a.platform as Platform),
    ),
  );

  const cohortRatings: Partial<Record<Platform, number[]>> = {};
  if (activePlatforms.length > 0) {
    const peerQueries = activePlatforms.map(async (platform) => {
      const peers = await prisma.linkedAccount.findMany({
        where: {
          platform,
          rating: { not: null },
          verificationStatus: "VERIFIED",
          user: user.collegeId ? { collegeId: user.collegeId } : {},
        },
        select: { rating: true },
      });
      return { platform, ratings: peers.map((p) => p.rating as number) };
    });

    const results = await Promise.all(peerQueries);
    for (const res of results) {
      cohortRatings[res.platform] = res.ratings;
    }
  }


  const contestDates = user.ratingHistory.map((h) => h.participatedAt);
  const ratingSeries = user.ratingHistory
    .filter((h) => h.ratingAfter !== null)
    .map((h) => ({
      platform: h.platform as Platform,
      rating: h.ratingAfter as number,
      at: h.participatedAt,
    }));

  const breakdown = computeScore({
    platforms,
    cohortRatings,
    contestDates,
    ratingSeries,
    siteActivityPoints: user.siteActivityPoints,
    activeStreak: user.activeStreak,
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      campusScore: breakdown.total,
      campusClass: breakdown.cls,
      scoreBreakdown: JSON.stringify(breakdown),
      scoreComputedAt: new Date(),
      activityLevel: breakdown.activity,
      lastActiveAt: user.ratingHistory.length
        ? user.ratingHistory[user.ratingHistory.length - 1].participatedAt
        : user.lastActiveAt,
    },
  });

  return breakdown;
}

export async function recomputeAllScores(): Promise<{ count: number }> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await recomputeUserScore(user.id).catch(() => undefined);
  }
  return { count: users.length };
}

export async function getScoreBreakdown(userId: string): Promise<ScoreBreakdown | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scoreBreakdown: true },
  });
  if (!user?.scoreBreakdown) return null;
  try {
    return JSON.parse(user.scoreBreakdown) as ScoreBreakdown;
  } catch {
    return null;
  }
}

export function platformAccountsOf(
  accounts: { platform: string; rating: number | null; verificationStatus: string }[],
) {
  return accounts
    .filter((a) => isPlatform(a.platform))
    .map((a) => ({
      platform: a.platform as Platform,
      rating: a.rating,
      verified: a.verificationStatus === "VERIFIED",
    }));
}
