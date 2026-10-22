/**
 * Live smoke test for the platform adapters.
 *
 *   npm run smoke:platforms
 *
 * Every adapter is exercised against a real public handle so we can verify
 * which fields each platform actually exposes today.
 */
import { ADAPTERS } from "../src/lib/platforms";
import { PLATFORMS, type Platform } from "../src/lib/constants";

const HANDLES: Record<Platform, string> = {
  CODEFORCES: "tourist",
  LEETCODE: "votrubac",
  CODECHEF: "gennady.korotkevich",
  ATCODER: "tourist",
};

async function main() {
  for (const platform of PLATFORMS as readonly Platform[]) {
    const adapter = ADAPTERS[platform];
    console.log(`\n=== ${platform} ===`);

    try {
      const profile = await adapter.fetchProfile(HANDLES[platform]);
      console.log("profile:", {
        handle: profile.handle,
        displayName: profile.displayName,
        rating: profile.rating,
        maxRating: profile.maxRating,
        rank: profile.rank,
        globalRank: profile.globalRank,
        problemsSolved: profile.problemsSolved,
        contestsAttended: profile.contestsAttended,
        reputation: profile.reputation,
        lastContestAt: profile.lastContestAt?.toISOString() ?? null,
        identityText: profile.identityText,
      });

      const history = await adapter.fetchRatingHistory(HANDLES[platform]);
      console.log(`history: ${history.length} points, latest:`);
      console.log(history.slice(-2));
    } catch (error) {
      console.log("FAILED:", error instanceof Error ? error.message : error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
