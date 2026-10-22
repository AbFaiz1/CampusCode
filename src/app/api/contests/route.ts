import { NextResponse } from "next/server";
import { listContests } from "@/lib/services/contests";
import { isPlatform } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const platformParam = params.get("platform");
  const statusParam = params.get("status");

  const result = await listContests({
    platform: platformParam && isPlatform(platformParam) ? platformParam : "ALL",
    status:
      statusParam === "UPCOMING" ||
      statusParam === "ONGOING" ||
      statusParam === "COMPLETED" ||
      statusParam === "CANCELLED"
        ? statusParam
        : "ALL",
    from: params.get("from") ? new Date(params.get("from") as string) : undefined,
    to: params.get("to") ? new Date(params.get("to") as string) : undefined,
    search: params.get("search") ?? undefined,
    limit: Number(params.get("limit") ?? 100),
    offset: Number(params.get("offset") ?? 0),
  });

  return NextResponse.json(result);
}
