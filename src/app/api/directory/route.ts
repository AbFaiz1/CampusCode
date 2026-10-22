import { NextResponse } from "next/server";
import { listDirectory } from "@/lib/services/leaderboard";
import { isPlatform } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const platformParam = params.get("platform");
  const sortParam = params.get("sort");

  const result = await listDirectory({
    collegeId: params.get("collegeId"),
    departmentId: params.get("departmentId"),
    courseId: params.get("courseId"),
    academicYear: params.get("academicYear") ? Number(params.get("academicYear")) : null,
    batch: params.get("batch"),
    search: params.get("search"),
    classFilter: params.get("class"),
    platform: platformParam && isPlatform(platformParam) ? platformParam : null,
    sort:
      sortParam === "name" ||
      sortParam === "class" ||
      sortParam === "activity" ||
      sortParam === "recent" ||
      (sortParam && isPlatform(sortParam))
        ? sortParam
        : "score",
    limit: Number(params.get("limit") ?? 50),
    offset: Number(params.get("offset") ?? 0),
  });

  return NextResponse.json(result);
}
