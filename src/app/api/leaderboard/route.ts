import { NextResponse } from "next/server";
import { leaderboard, type LeaderboardScope } from "@/lib/services/leaderboard";
import { listFriends } from "@/lib/services/friends";
import { isPlatform, type Platform } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth";

const SCOPES = [
  "college",
  "department",
  "course",
  "year",
  "batch",
  "friends",
  "platform",
  "class",
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const scopeParam = (params.get("scope") ?? "college") as (typeof SCOPES)[number];
  const kind = SCOPES.includes(scopeParam) ? scopeParam : "college";
  const platformParam = params.get("platform");
  const platform: Platform | null = platformParam && isPlatform(platformParam) ? platformParam : null;

  let userIds: string[] | null = null;
  if (kind === "friends") {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ entries: [], metric: "Friends" }, { status: 401 });
    }
    const friends = await listFriends(user.id);
    userIds = friends.map((f) => f.id);
  }

  const scope: LeaderboardScope = {
    kind,
    collegeId: params.get("collegeId"),
    departmentId: params.get("departmentId"),
    courseId: params.get("courseId"),
    academicYear: params.get("academicYear") ? Number(params.get("academicYear")) : null,
    batch: params.get("batch"),
    platform,
    classFilter: params.get("class"),
    userIds,
    limit: Number(params.get("limit") ?? 100),
  };

  const result = await leaderboard(scope);
  return NextResponse.json(result);
}
