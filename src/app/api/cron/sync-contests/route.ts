import { NextResponse } from "next/server";
import { syncContests } from "@/lib/services/contests";
import { notifyScheduleChanges } from "@/lib/services/reminders";
import { isPlatform, PLATFORMS } from "@/lib/constants";

/**
 * Scheduled job: refresh the contest calendar.
 *
 * Run it from any scheduler (Vercel Cron, GitHub Actions, cron, ...):
 *   curl -X POST https://your-host/api/cron/sync-contests \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("platform");
  const platforms =
    requested && isPlatform(requested) ? [requested] : ([...PLATFORMS] as const);

  const results = await syncContests(platforms as never);
  const notified = await notifyScheduleChanges();

  return NextResponse.json({ ok: true, results, scheduleChangeNotifications: notified });
}
