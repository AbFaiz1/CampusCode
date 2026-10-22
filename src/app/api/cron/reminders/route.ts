import { NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/services/reminders";

/**
 * Scheduled job: deliver due reminders.
 *
 * The backend owns the schedule, so a reminder fires even when the student's
 * browser is closed. Run it every few minutes.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
