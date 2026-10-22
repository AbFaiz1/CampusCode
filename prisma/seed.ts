/**
 * Seeds a demo college with students, synthetic (clearly fictional) platform
 * accounts, friendships, groups, goals and rating histories.
 *
 * The contest calendar is NOT seeded here — it is filled from the live
 * platform APIs by `npm run sync:contests`.
 *
 *   npm run seed
 */
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeScore } from "../src/lib/scoring";
import { hashPassword } from "../src/lib/password";
import { PLATFORM_CURVES } from "../src/lib/constants";

/** Resolve relative SQLite paths against the project root, not the cwd. */
function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw;
  const filePath = raw.slice("file:".length);
  if (path.isAbsolute(filePath)) return raw;
  return `file:${path.resolve(process.cwd(), filePath)}`;
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("libsql:") || url.startsWith("https:")) {
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

const PASSWORD = "campuscode123";

type SeedPlatform = "CODEFORCES" | "LEETCODE" | "CODECHEF" | "ATCODER";

type SeedStudent = {
  name: string;
  email: string;
  department: string;
  course: string;
  year: number;
  batch: string;
  bio: string;
  interests: string;
  // target rating per platform; null means the student did not link it
  platforms: Partial<Record<SeedPlatform, number>>;
  solved?: number;
  contests?: number;
};

const DEPARTMENTS = [
  { name: "Computer Science & Engineering", shortName: "CSE" },
  { name: "Information Technology", shortName: "IT" },
  { name: "Electronics & Communication", shortName: "ECE" },
  { name: "Mechanical Engineering", shortName: "ME" },
  { name: "Civil Engineering", shortName: "CE" },
];

const COURSES: Record<string, string[]> = {
  "Computer Science & Engineering": ["B.Tech Computer Science", "B.Tech Computer Science (AI & ML)"],
  "Information Technology": ["B.Tech Information Technology"],
  "Electronics & Communication": ["B.Tech Electronics & Communication"],
  "Mechanical Engineering": ["B.Tech Mechanical Engineering"],
  "Civil Engineering": ["B.Tech Civil Engineering"],
};

const STUDENTS: SeedStudent[] = [
  {
    name: "Aarav Sharma",
    email: "aarav@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 3,
    batch: "2027",
    bio: "Final-year CS. I like graphs, segment trees and late-night Codeforces rounds.",
    interests: "Graphs, DP, Codeforces",
    platforms: { CODEFORCES: 1620, ATCODER: 1510, LEETCODE: 1780 },
    solved: 640,
    contests: 96,
  },
  {
    name: "Ishita Verma",
    email: "ishita@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 3,
    batch: "2027",
    bio: "ICPC regionalist. Chasing that last 100 rating points.",
    interests: "ICPC, Geometry, Bit manipulation",
    platforms: { CODEFORCES: 1840, ATCODER: 1690, CODECHEF: 1750 },
    solved: 820,
    contests: 140,
  },
  {
    name: "Rohan Mehta",
    email: "rohan@campuscode.dev",
    department: "Information Technology",
    course: "B.Tech Information Technology",
    year: 3,
    batch: "2027",
    bio: "Backend dev by day, CodeChef rated at night.",
    interests: "Data structures, CodeChef",
    platforms: { CODEFORCES: 1410, CODECHEF: 1580, LEETCODE: 1690 },
    solved: 480,
    contests: 70,
  },
  {
    name: "Neha Gupta",
    email: "neha@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science (AI & ML)",
    year: 2,
    batch: "2028",
    bio: "Second year, already addicted to AtCoder Beginner Contests.",
    interests: "AtCoder, Number theory",
    platforms: { ATCODER: 1420, CODEFORCES: 1180, LEETCODE: 1540 },
    solved: 310,
    contests: 54,
  },
  {
    name: "Kabir Singh",
    email: "kabir@campuscode.dev",
    department: "Electronics & Communication",
    course: "B.Tech Electronics & Communication",
    year: 2,
    batch: "2028",
    bio: "Learning to code. Currently grinding CSES and Codeforces A problems.",
    interests: "Beginner friendly, Arrays",
    platforms: { CODEFORCES: 820, LEETCODE: 1380 },
    solved: 180,
    contests: 22,
  },
  {
    name: "Priya Nair",
    email: "priya@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 4,
    batch: "2026",
    bio: "Placement season. CampusCode coach for the second-year batch.",
    interests: "Teaching, Dynamic programming",
    platforms: { CODEFORCES: 1930, ATCODER: 1810, CODECHEF: 1810, LEETCODE: 1880 },
    solved: 1020,
    contests: 186,
  },
  {
    name: "Vikram Iyer",
    email: "vikram@campuscode.dev",
    department: "Mechanical Engineering",
    course: "B.Tech Mechanical Engineering",
    year: 3,
    batch: "2027",
    bio: "Mechanical engineer who writes more code than CAD files.",
    interests: "Simulations, Python",
    platforms: { CODECHEF: 1240, LEETCODE: 1290 },
    solved: 210,
    contests: 30,
  },
  {
    name: "Ananya Das",
    email: "ananya@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 2,
    batch: "2028",
    bio: "First year in the club. Building intuition for greedy and binary search.",
    interests: "Greedy, Binary search",
    platforms: { CODEFORCES: 1040, LEETCODE: 1460 },
    solved: 260,
    contests: 35,
  },
  {
    name: "Rahul Yadav",
    email: "rahul@campuscode.dev",
    department: "Information Technology",
    course: "B.Tech Information Technology",
    year: 4,
    batch: "2026",
    bio: "Full-stack intern. Competitive coding is my evening sport.",
    interests: "Trees, Strings",
    platforms: { CODEFORCES: 1520, CODECHEF: 1490, ATCODER: 1280 },
    solved: 520,
    contests: 88,
  },
  {
    name: "Sneha Reddy",
    email: "sneha@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science (AI & ML)",
    year: 3,
    batch: "2027",
    bio: "Research intern in NLP. AtCoder regular contests keep me sane.",
    interests: "AtCoder, Math",
    platforms: { ATCODER: 1740, CODEFORCES: 1490 },
    solved: 600,
    contests: 110,
  },
  {
    name: "Aditya Kulkarni",
    email: "aditya@campuscode.dev",
    department: "Civil Engineering",
    course: "B.Tech Civil Engineering",
    year: 1,
    batch: "2029",
    bio: "First year. Just discovered Codeforces and regret not starting earlier.",
    interests: "Basics, Practice",
    platforms: { CODEFORCES: 640 },
    solved: 90,
    contests: 11,
  },
  {
    name: "Meera Joshi",
    email: "meera@campuscode.dev",
    department: "Electronics & Communication",
    course: "B.Tech Electronics & Communication",
    year: 3,
    batch: "2027",
    bio: "Embedded systems. Loves bitwise tricks.",
    interests: "Bit manipulation, CodeChef",
    platforms: { CODECHEF: 1460, LEETCODE: 1520, CODEFORCES: 1230 },
    solved: 380,
    contests: 64,
  },
  {
    name: "Karan Malhotra",
    email: "karan@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 4,
    batch: "2026",
    bio: "Grandmaster in training. Maintaining 1900+ for two years straight.",
    interests: "Advanced DP, Constructive",
    platforms: { CODEFORCES: 2040, ATCODER: 1920, CODECHEF: 1900 },
    solved: 1240,
    contests: 214,
  },
  {
    name: "Tanvi Bhatt",
    email: "tanvi@campuscode.dev",
    department: "Information Technology",
    course: "B.Tech Information Technology",
    year: 2,
    batch: "2028",
    bio: "Design and frontend. Trying to get good at problem solving.",
    interests: "Recursion, Practice",
    platforms: { LEETCODE: 1420, CODEFORCES: 990 },
    solved: 240,
    contests: 28,
  },
  {
    name: "Dev Patel",
    email: "dev@campuscode.dev",
    department: "Mechanical Engineering",
    course: "B.Tech Mechanical Engineering",
    year: 4,
    batch: "2026",
    bio: "Product engineer. Two years of Codeforces habit.",
    interests: "Shortest paths, Flow",
    platforms: { CODEFORCES: 1450, LEETCODE: 1590 },
    solved: 470,
    contests: 78,
  },
  {
    name: "Aisha Khan",
    email: "aisha@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 3,
    batch: "2027",
    bio: "Club secretary. Running our weekly rated contest ladder.",
    interests: "Organising, Bit manipulation",
    platforms: { CODEFORCES: 1710, LEETCODE: 1810, ATCODER: 1560 },
    solved: 740,
    contests: 132,
  },
  {
    name: "Rishabh Roy",
    email: "rishabh@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 1,
    batch: "2029",
    bio: "Freshman. Solving problems every single day.",
    interests: "Basics, Consistency",
    platforms: { CODEFORCES: 890, LEETCODE: 1310, CODECHEF: 1120 },
    solved: 160,
    contests: 25,
  },
  {
    name: "Nikhil Agarwal",
    email: "nikhil@campuscode.dev",
    department: "Information Technology",
    course: "B.Tech Information Technology",
    year: 3,
    batch: "2027",
    bio: "Competitive programmer and a big fan of constructive techniques.",
    interests: "Constructive, Codeforces",
    platforms: { CODEFORCES: 1870, ATCODER: 1720, CODECHEF: 1690 },
    solved: 890,
    contests: 165,
  },
  {
    name: "Pooja Menon",
    email: "pooja@campuscode.dev",
    department: "Electronics & Communication",
    course: "B.Tech Electronics & Communication",
    year: 2,
    batch: "2028",
    bio: "Curious about systems and algorithms. LeetCode daily.",
    interests: "LeetCode, Graphs",
    platforms: { LEETCODE: 1610, ATCODER: 1210 },
    solved: 350,
    contests: 33,
  },
  {
    name: "Yash Chauhan",
    email: "yash@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 4,
    batch: "2026",
    bio: "Coding since first year. Currently interviewing for backend roles.",
    interests: "Interviews, Segment trees",
    platforms: { CODEFORCES: 1690, LEETCODE: 1860, CODECHEF: 1620 },
    solved: 780,
    contests: 128,
  },
  {
    name: "Simran Kaur",
    email: "simran@campuscode.dev",
    department: "Civil Engineering",
    course: "B.Tech Civil Engineering",
    year: 3,
    batch: "2027",
    bio: "Discovered competitive programming late, falling in love fast.",
    interests: "Practice, Graphs",
    platforms: { CODEFORCES: 1100, LEETCODE: 1470 },
    solved: 290,
    contests: 40,
  },
  {
    name: "Harsh Vardhan",
    email: "harsh@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science (AI & ML)",
    year: 3,
    batch: "2027",
    bio: "ML researcher in the making. Strong on number theory.",
    interests: "Number theory, AtCoder",
    platforms: { CODEFORCES: 1780, ATCODER: 1860, LEETCODE: 1830 },
    solved: 910,
    contests: 148,
  },
  {
    name: "Divya Pillai",
    email: "divya@campuscode.dev",
    department: "Information Technology",
    course: "B.Tech Information Technology",
    year: 2,
    batch: "2028",
    bio: "Learning, unlearning, relearning. Codeforces specialist hopeful.",
    interests: "Data structures, Codeforces",
    platforms: { CODEFORCES: 1290, CODECHEF: 1210, LEETCODE: 1500 },
    solved: 330,
    contests: 48,
  },
  {
    name: "Manish Gupta",
    email: "manish@campuscode.dev",
    department: "Mechanical Engineering",
    course: "B.Tech Mechanical Engineering",
    year: 2,
    batch: "2028",
    bio: "Self-taught C++ in a mechanical hostel. Codeforces regular.",
    interests: "C++, Maths",
    platforms: { CODEFORCES: 1360, ATCODER: 1150 },
    solved: 300,
    contests: 52,
  },
  {
    name: "Sara Ali",
    email: "sara@campuscode.dev",
    department: "Computer Science & Engineering",
    course: "B.Tech Computer Science",
    year: 1,
    batch: "2029",
    bio: "First year, already in the college CP club.",
    interests: "Beginner friendly, Arrays",
    platforms: { CODEFORCES: 730, LEETCODE: 1290 },
    solved: 130,
    contests: 17,
  },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Deterministic pseudo-random generator so seeds are reproducible. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function ratingPath(rating: number, contests: number, seed: number) {
  const random = makeRandom(seed);
  const points: { date: Date; rating: number }[] = [];
  let current = Math.max(400, Math.round(rating * 0.55));
  const now = Date.now();

  for (let i = 0; i < contests; i += 1) {
    const daysAgo = Math.round((contests - i) * 6 + random() * 5);
    const drift = (rating - current) * (0.06 + random() * 0.07);
    const noise = (random() - 0.45) * 42;
    current = Math.max(300, Math.round(current + drift + noise));
    points.push({ date: new Date(now - daysAgo * 86400000), rating: current });
  }

  // Pin the last point at the target rating so the seeded value matches.
  if (points.length) {
    points[points.length - 1] = {
      date: new Date(now - 4 * 86400000),
      rating,
    };
  }
  return points;
}

async function main() {
  console.log("Seeding CampusCode demo data…");

  const passwordHash = await hashPassword(PASSWORD);

  // Wipe in dependency order.
  await prisma.groupChallenge.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.contestParticipation.deleteMany();
  await prisma.ratingHistory.deleteMany();
  await prisma.linkedAccount.deleteMany();
  await prisma.verificationClaim.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.course.deleteMany();
  await prisma.department.deleteMany();
  await prisma.college.deleteMany();

  const college = await prisma.college.create({
    data: {
      name: "Maulana Azad National Institute of Technology",
      slug: "mnnit-allahabad",
      city: "Prayagraj",
      state: "Uttar Pradesh",
      country: "India",
      emailDomain: "mnnit.ac.in",
    },
  });

  const departmentIds = new Map<string, string>();
  const courseIds = new Map<string, string>();

  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.create({
      data: { name: dept.name, shortName: dept.shortName, collegeId: college.id },
    });
    departmentIds.set(dept.name, created.id);

    for (const courseName of COURSES[dept.name] ?? []) {
      const course = await prisma.course.create({
        data: {
          name: courseName,
          shortName: courseName.replace("B.Tech ", "BTech "),
          degree: "B.Tech",
          durationYears: 4,
          departmentId: created.id,
          collegeId: college.id,
        },
      });
      courseIds.set(courseName, course.id);
    }
  }

  // A college-wide course for the general pool.
  const mca = await prisma.course.create({
    data: {
      name: "MCA",
      shortName: "MCA",
      degree: "MCA",
      durationYears: 2,
      collegeId: college.id,
    },
  });
  courseIds.set("MCA", mca.id);

  const createdUsers: { id: string; name: string }[] = [];

  for (const [index, student] of STUDENTS.entries()) {
    const user = await prisma.user.create({
      data: {
        email: student.email,
        passwordHash,
        displayName: student.name,
        bio: student.bio,
        role: index === 0 ? "ADMIN" : "STUDENT",
        collegeId: college.id,
        departmentId: departmentIds.get(student.department) ?? null,
        courseId: courseIds.get(student.course) ?? null,
        academicYear: student.year,
        batch: student.batch,
        graduationYear: Number(student.batch),
        codingInterests: student.interests,
        timezone: "Asia/Kolkata",
        avatarUrl: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${encodeURIComponent(student.name)}`,
        isPublic: true,
        showInDirectory: true,
        showRatings: true,
        showPlatforms: true,
        showEmail: false,
        lastActiveAt: new Date(),
      },
    });
    createdUsers.push({ id: user.id, name: student.name });

    let platformIndex = 0;
    for (const [platform, rating] of Object.entries(student.platforms)) {
      platformIndex += 1;
      const handle = `${slugify(student.name).split("-")[0]}${
        platform === "LEETCODE" ? "" : `_${platform.slice(0, 2).toLowerCase()}`
      }`;
      const contestCount = Math.max(6, Math.round((student.contests ?? 40) / platformIndex));
      const curve = PLATFORM_CURVES[platform as SeedPlatform];

      const account = await prisma.linkedAccount.create({
        data: {
          userId: user.id,
          platform,
          handle,
          profileUrl:
            platform === "CODEFORCES"
              ? `https://codeforces.com/profile/${handle}`
              : platform === "LEETCODE"
                ? `https://leetcode.com/u/${handle}/`
                : platform === "CODECHEF"
                  ? `https://www.codechef.com/users/${handle}`
                  : `https://atcoder.jp/users/${handle}`,
          rating,
          maxRating: Math.round(rating * (1.06 + (index % 5) * 0.02)),
          rank:
            rating >= 1900
              ? "master"
              : rating >= 1600
                ? "expert"
                : rating >= 1400
                  ? "specialist"
                  : rating >= 1200
                    ? "pupil"
                    : "newbie",
          globalRank: platform === "LEETCODE" ? Math.round(400000 / Math.max(1, rating - 900)) : null,
          problemsSolved:
            student.solved === undefined ? null : Math.round(student.solved / platformIndex),
          contestsAttended: contestCount,
          reputation: platform === "LEETCODE" ? Math.round(rating * 45) : null,
          organization: "MNNIT",
          verificationStatus: "VERIFIED",
          verificationMethod: "CODE_MATCH",
          verifiedAt: new Date(),
          lastSyncedAt: new Date(),
          syncStatus: "OK",
          rawJson: JSON.stringify({ seeded: true, curve: curve.mid }),
        },
      });

      const path = ratingPath(rating, contestCount, index * 97 + platformIndex * 13);
      for (let i = 0; i < path.length; i += 1) {
        const point = path[i];
        const previous = i > 0 ? path[i - 1].rating : null;
        await prisma.ratingHistory.create({
          data: {
            accountId: account.id,
            userId: user.id,
            platform,
            contestName: `${platform === "CODEFORCES" ? "Codeforces Round" : platform === "ATCODER" ? "AtCoder Contest" : platform === "CODECHEF" ? "CodeChef Contest" : "LeetCode Contest"} #${900 + i}`,
            externalId: `${platform}-${handle}-${i}`,
            rank: Math.max(1, Math.round(4000 / Math.max(1, point.rating - 600))),
            ratingBefore: previous,
            ratingAfter: point.rating,
            delta: previous === null ? null : point.rating - previous,
            participatedAt: point.date,
          },
        });
      }
    }
  }

  // Friendships inside and across batches.
  const friendPairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 5],
    [1, 5],
    [1, 12],
    [2, 8],
    [3, 7],
    [4, 17],
    [5, 12],
    [6, 13],
    [8, 18],
    [9, 10],
    [13, 16],
    [16, 17],
  ];

  for (const [a, b] of friendPairs) {
    const requester = createdUsers[a];
    const addressee = createdUsers[b];
    if (!requester || !addressee) continue;
    await prisma.friendship.create({
      data: { requesterId: requester.id, addresseeId: addressee.id, status: "ACCEPTED" },
    });
  }

  // A pending request so the request UI is not empty.
  await prisma.friendship.create({
    data: {
      requesterId: createdUsers[17].id,
      addresseeId: createdUsers[0].id,
      status: "PENDING",
    },
  });

  // Groups
  const group = await prisma.group.create({
    data: {
      name: "CSE Batch 2027",
      slug: "cse-batch-2027",
      description: "Rated contest ladder for the 2027 batch. Two contests a week, no excuses.",
      collegeId: college.id,
      ownerId: createdUsers[0].id,
      isPrivate: true,
      joinCode: "CSE2027",
      members: {
        create: [0, 1, 2, 5, 9, 12, 16].map((i) => ({
          userId: createdUsers[i].id,
          role: i === 0 ? "OWNER" : "MEMBER",
        })),
      },
    },
  });

  await prisma.groupChallenge.create({
    data: {
      groupId: group.id,
      createdById: createdUsers[0].id,
      title: "Two rated contests this week",
      description: "Everyone contests at least twice before Sunday night.",
      metric: "CONTESTS",
      target: 2,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 4 * 86400000),
    },
  });

  await prisma.group.create({
    data: {
      name: "MNNIT Open Coding Club",
      slug: "mnnit-open-coding-club",
      description: "Open practice sessions every Friday.",
      collegeId: college.id,
      ownerId: createdUsers[5].id,
      isPrivate: false,
      joinCode: "OPENCLUB",
      members: {
        create: [5, 0, 1, 9, 16].map((i) => ({
          userId: createdUsers[i].id,
          role: i === 5 ? "OWNER" : "MEMBER",
        })),
      },
    },
  });

  // Weekly goals
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day),
  );
  for (const index of [0, 1, 5, 9, 12]) {
    await prisma.goal.create({
      data: {
        userId: createdUsers[index].id,
        weekStart,
        targetContests: index === 0 ? 3 : 2,
      },
    });
  }

  // Score everyone using the real engine.
  for (const user of createdUsers) {
    const accounts = await prisma.linkedAccount.findMany({ where: { userId: user.id } });
    const history = await prisma.ratingHistory.findMany({
      where: { userId: user.id },
      orderBy: { participatedAt: "asc" },
    });

    const cohortRatings: Record<string, number[]> = {};
    for (const account of accounts) {
      if (account.rating === null) continue;
      const peers = await prisma.linkedAccount.findMany({
        where: {
          platform: account.platform,
          rating: { not: null },
          verificationStatus: "VERIFIED",
          user: { collegeId: college.id },
        },
        select: { rating: true },
      });
      cohortRatings[account.platform] = peers.map((p) => p.rating as number);
    }

    const breakdown = computeScore({
      platforms: accounts.map((a) => ({
        platform: a.platform as never,
        rating: a.rating,
        globalRank: a.globalRank,
        problemsSolved: a.problemsSolved,
        verified: a.verificationStatus === "VERIFIED",
      })),
      cohortRatings: cohortRatings as never,
      contestDates: history.map((h) => h.participatedAt),
      ratingSeries: history
        .filter((h) => h.ratingAfter !== null)
        .map((h) => ({ platform: h.platform as never, rating: h.ratingAfter as number, at: h.participatedAt })),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        campusScore: breakdown.total,
        campusClass: breakdown.cls,
        scoreBreakdown: JSON.stringify(breakdown),
        scoreComputedAt: new Date(),
        activityLevel: breakdown.activity,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: createdUsers[0].id,
      title: "Welcome to CampusCode",
      body: "Link your coding platforms in Settings to unlock your class and college rank.",
      link: "/settings",
      kind: "SYSTEM",
    },
  });

  await prisma.syncLog.create({
    data: {
      kind: "CONTESTS",
      status: "SUCCESS",
      message: "Demo seed completed. Run `npm run sync:contests` to pull the live calendar.",
      finishedAt: new Date(),
    },
  });

  const counts = {
    students: await prisma.user.count(),
    accounts: await prisma.linkedAccount.count(),
    contests: await prisma.contest.count(),
  };

  console.log("Seed complete:", counts);
  console.log(`\nDemo logins (password: ${PASSWORD})`);
  console.log("  aarav@campuscode.dev  (CampusCode admin, Class S)");
  console.log("  ishita@campuscode.dev (Class A)");
  console.log("  kabir@campuscode.dev  (Class C beginner)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
