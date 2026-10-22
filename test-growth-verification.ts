import { prisma } from "./src/lib/db";
import { recomputeUserScore } from "./src/lib/services/scores";

async function runTest() {
  console.log("🚀 Starting Hybrid System Scoring Test...\n");

  let testUser;
  try {
    // 1. Setup a test user
    const randomId = Math.random().toString(36).substring(7);
    testUser = await prisma.user.create({
      data: {
        email: `test-growth-scoring-${randomId}@campuscode.dev`,
        passwordHash: "hash",
        displayName: "Test User",
        collegeId: null,
        siteActivityPoints: 0,
        activeStreak: 0,
      },
    });

    console.log(`👤 Created Test User: ${testUser.displayName} (ID: ${testUser.id})`);

    // 2. Manually create a verified account (Skipping external API call)
    const account = await prisma.linkedAccount.create({
      data: {
        userId: testUser.id,
        platform: "CODEFORCES",
        handle: `test-scoring-${randomId}`,
        profileUrl: "http://example.com",
        verificationStatus: "VERIFIED",
        rating: 3000,
        problemsSolved: 1000,
        lastSyncedAt: new Date(),
        syncStatus: "OK",
      },
    });
    console.log(`✅ Manually created verified account for ${account.handle}`);

    // 3. Test Initial Tiering
    console.log("\n--- Testing Initial Tiering ---");
    const initialScore = await recomputeUserScore(testUser.id);
    console.log(`📈 Initial Score: ${initialScore.total} | Tier: ${initialScore.cls}`);
    console.log(`Reasons: ${initialScore.reasons.join(", ")}`);
    
    if (initialScore.cls === "S" || initialScore.cls === "A") {
      console.log("✅ SUCCESS: High-rated user started at a high tier.");
    } else {
      console.log("❌ FAILURE: High-rated user did not get a high tier.");
    }

    // 4. Test Growth Progression
    console.log("\n--- Testing Growth Progression ---");
    console.log("Adding 500 activity points and 30 day streak...");
    
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        siteActivityPoints: 500,
        activeStreak: 30,
      },
    });

    const growthScore = await recomputeUserScore(testUser.id);
    console.log(`📈 New Score: ${growthScore.total} | Tier: ${growthScore.cls}`);
    console.log(`Growth Component: ${growthScore.growth}`);
    console.log(`Reasons: ${growthScore.reasons.join(", ")}`);

    if (growthScore.total > initialScore.total) {
      console.log(`✅ SUCCESS: Score increased from ${initialScore.total} to ${growthScore.total} due to activity/streak.`);
    } else {
      console.log("❌ FAILURE: Score did not increase with activity.");
    }

  } catch (err) {
    console.error("\n❌ Test Failed:");
    console.error(err);
  } finally {
    if (testUser) {
      await prisma.linkedAccount.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      console.log("\n🧹 Cleanup complete.");
    }
  }
}

runTest();
