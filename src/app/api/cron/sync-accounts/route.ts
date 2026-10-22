import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncAccount } from "@/lib/services/accounts";
import { recomputeAllScores } from "@/lib/services/scores";

/**
 * Scheduled job: re-sync linked accounts and recompute scores.
 *
 * Keep the interval polite (Codeforces asks for roughly one request every two
 * seconds); the platform adapters enforce their own rate limits.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const staleOnly = url.searchParams.get("stale") === "true";

  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const accounts = await prisma.linkedAccount.findMany({
    where: staleOnly
      ? { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] }
      : {},
    select: { id: true },
  });

  let ok = 0;
  let failed = 0;
  for (const account of accounts) {
    const result = await syncAccount(account.id);
    if (result.ok) ok += 1;
    else failed += 1;
  }

  const scores = await recomputeAllScores();

  await prisma.syncLog.create({
    data: {
      kind: "ACCOUNTS",
      status: failed === 0 ? "SUCCESS" : ok > 0 ? "PARTIAL" : "FAILED",
      message: `${ok} synced, ${failed} failed`,
      finishedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, synced: ok, failed, scores: scores.count });
}
