import "server-only";

import { prisma } from "@/lib/db";
import { isPlatform, type Platform } from "@/lib/constants";

/** Only students who opted into public listing appear in shared rankings. */
const publicVisibility = { isPublic: true, showInDirectory: true } as const;

export type DirectoryFilters = {
  collegeId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  academicYear?: number | null;
  batch?: string | null;
  search?: string | null;
  classFilter?: string | null;
  platform?: Platform | null;
  sort?: "score" | "class" | "name" | "activity" | "recent" | Platform;
  limit?: number;
  offset?: number;
};

export type DirectoryEntry = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  campusScore: number;
  campusClass: string;
  activityLevel: string;
  lastActiveAt: Date | null;
  batch: string | null;
  academicYear: number | null;
  college: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  course: { id: string; name: string; shortName: string | null } | null;
  platforms: { platform: Platform; rating: number | null; verified: boolean }[];
};

export async function listDirectory(filters: DirectoryFilters = {}) {
  const where: Record<string, unknown> = { ...publicVisibility };

  if (filters.collegeId) where.collegeId = filters.collegeId;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.academicYear) where.academicYear = filters.academicYear;
  if (filters.batch) where.batch = filters.batch;
  if (filters.classFilter) where.campusClass = filters.classFilter;
  if (filters.search) {
    where.displayName = { contains: filters.search };
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      accounts: true,
      college: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, shortName: true } },
    },
  });

  const entries: DirectoryEntry[] = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    campusScore: u.campusScore,
    campusClass: u.campusClass,
    activityLevel: u.activityLevel,
    lastActiveAt: u.lastActiveAt,
    batch: u.batch,
    academicYear: u.academicYear,
    college: u.college,
    department: u.department,
    course: u.course,
    platforms: u.accounts
      .filter((a) => isPlatform(a.platform))
      .map((a) => ({
        platform: a.platform as Platform,
        rating: a.rating,
        verified: a.verificationStatus === "VERIFIED",
      })),
  }));

  const sort = filters.sort ?? "score";
  entries.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.displayName.localeCompare(b.displayName);
      case "class": {
        const order = ["S", "A", "B", "C"];
        const diff = order.indexOf(a.campusClass) - order.indexOf(b.campusClass);
        return diff !== 0 ? diff : b.campusScore - a.campusScore;
      }
      case "activity":
        return b.campusScore - a.campusScore;
      case "recent": {
        const av = a.lastActiveAt?.getTime() ?? 0;
        const bv = b.lastActiveAt?.getTime() ?? 0;
        return bv - av;
      }
      default:
        if (sort !== "score" && isPlatform(sort)) {
          const ar = a.platforms.find((p) => p.platform === sort)?.rating ?? -1;
          const br = b.platforms.find((p) => p.platform === sort)?.rating ?? -1;
          return br - ar;
        }
        return b.campusScore - a.campusScore;
    }
  });

  const total = entries.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return { total, entries: entries.slice(offset, offset + limit) };
}

export type LeaderboardScope = {
  kind:
    | "college"
    | "department"
    | "course"
    | "year"
    | "batch"
    | "friends"
    | "platform"
    | "class";
  collegeId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  academicYear?: number | null;
  batch?: string | null;
  platform?: Platform | null;
  classFilter?: string | null;
  userIds?: string[] | null;
  limit?: number;
};

export async function leaderboard(scope: LeaderboardScope) {
  const where: Record<string, unknown> = { ...publicVisibility };

  switch (scope.kind) {
    case "college":
      if (scope.collegeId) where.collegeId = scope.collegeId;
      break;
    case "department":
      if (scope.departmentId) where.departmentId = scope.departmentId;
      break;
    case "course":
      if (scope.courseId) where.courseId = scope.courseId;
      break;
    case "year":
      if (scope.academicYear) where.academicYear = scope.academicYear;
      break;
    case "batch":
      if (scope.batch) where.batch = scope.batch;
      break;
    case "class":
      if (scope.classFilter) where.campusClass = scope.classFilter;
      break;
    case "friends":
      if (!scope.userIds || scope.userIds.length === 0) {
        return { entries: [], metric: scope.kind };
      }
      where.id = { in: scope.userIds };
      break;
    case "platform":
      break;
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      accounts: true,
      college: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { campusScore: "desc" },
  });

  let rows = users.map((u) => {
    const platformRatings: Partial<Record<Platform, number>> = {};
    for (const a of u.accounts) {
      if (!isPlatform(a.platform)) continue;
      if (a.rating !== null) platformRatings[a.platform] = a.rating;
    }
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      campusScore: u.campusScore,
      campusClass: u.campusClass,
      activityLevel: u.activityLevel,
      lastActiveAt: u.lastActiveAt,
      batch: u.batch,
      academicYear: u.academicYear,
      college: u.college,
      department: u.department,
      course: u.course,
      platformRatings,
    };
  });

  let metric = "CampusCode score";
  if (scope.kind === "platform" && scope.platform) {
    metric = `${scope.platform === "CODEFORCES" ? "Codeforces" : scope.platform === "LEETCODE" ? "LeetCode" : scope.platform === "CODECHEF" ? "CodeChef" : "AtCoder"} rating`;
    rows = rows
      .filter((r) => r.platformRatings[scope.platform!] !== undefined)
      .sort((a, b) => (b.platformRatings[scope.platform!] ?? 0) - (a.platformRatings[scope.platform!] ?? 0));
  }

  const limit = scope.limit ?? 100;
  return {
    metric,
    entries: rows.slice(0, limit).map((row, index) => ({ ...row, rank: index + 1 })),
  };
}

export async function hierarchy() {
  const colleges = await prisma.college.findMany({
    include: {
      departments: {
        include: { courses: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  const years = await prisma.user.findMany({
    where: { academicYear: { not: null } },
    distinct: ["academicYear"],
    select: { academicYear: true },
    orderBy: { academicYear: "asc" },
  });

  const batches = await prisma.user.findMany({
    where: { batch: { not: null } },
    distinct: ["batch"],
    select: { batch: true },
    orderBy: { batch: "asc" },
  });

  return {
    colleges,
    years: years.map((y) => y.academicYear).filter((y): y is number => y !== null),
    batches: batches.map((b) => b.batch).filter((b): b is string => b !== null),
  };
}

export async function collegeStats(collegeId?: string | null) {
  const where = collegeId ? { collegeId, ...publicVisibility } : { ...publicVisibility };
  const [total, byClass] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ["campusClass"],
      where,
      _count: { _all: true },
    }),
  ]);
  return {
    total,
    byClass: Object.fromEntries(byClass.map((c) => [c.campusClass, c._count._all])),
  };
}
