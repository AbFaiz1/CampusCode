import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/services/reminders";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contestId = url.searchParams.get("contest");
  const user = await getSessionUser();

  const contests = await prisma.contest.findMany({
    where: contestId ? { id: contestId } : { startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: 100,
    include: {
      reminders: user ? { where: { userId: user.id } } : false,
    },
  });

  const ics = buildIcs(
    contests.map((c) => ({
      id: c.id,
      name: c.name,
      url: c.url,
      description: c.description,
      startTime: c.startTime,
      endTime: c.endTime,
      platform: c.platform,
    })),
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="campuscode-contests.ics"`,
    },
  });
}
