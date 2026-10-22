import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/services/reminders";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const notifications = await listNotifications(user.id);
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await markNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
