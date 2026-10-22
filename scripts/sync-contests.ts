/**
 * Pulls the live contest calendar from every supported platform.
 *
 *   npm run sync:contests
 */
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { ADAPTERS } from "../src/lib/platforms";
import { PLATFORMS, type Platform } from "../src/lib/constants";

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


function deriveStatus(startTime: Date, endTime: Date, now: Date) {
  if (now.getTime() < startTime.getTime()) return "UPCOMING";
  if (now.getTime() < endTime.getTime()) return "ONGOING";
  return "COMPLETED";
}

async function main() {
  const now = new Date();
  let total = 0;

  for (const platform of PLATFORMS as readonly Platform[]) {
    try {
      const remote = await ADAPTERS[platform].fetchContests();
      for (const contest of remote) {
        const status = deriveStatus(contest.startTime, contest.endTime, now);
        await prisma.contest.upsert({
          where: { platform_externalId: { platform, externalId: contest.externalId } },
          create: {
            platform,
            externalId: contest.externalId,
            name: contest.name,
            url: contest.url,
            description: contest.description,
            type: contest.type,
            startTime: contest.startTime,
            endTime: contest.endTime,
            durationMinutes: contest.durationMinutes,
            registrationDeadline: contest.registrationDeadline,
            status,
            participantCount: contest.participantCount,
            lastSyncedAt: now,
          },
          update: {
            name: contest.name,
            url: contest.url,
            description: contest.description,
            type: contest.type,
            startTime: contest.startTime,
            endTime: contest.endTime,
            durationMinutes: contest.durationMinutes,
            registrationDeadline: contest.registrationDeadline,
            status,
            participantCount: contest.participantCount,
            lastSyncedAt: now,
          },
        });
      }
      total += remote.length;
      console.log(`✓ ${platform}: ${remote.length} contests`);
    } catch (error) {
      console.log(
        `✗ ${platform}: ${error instanceof Error ? error.message : "failed"} (skipped)`,
      );
    }
  }

  await prisma.syncLog.create({
    data: {
      kind: "CONTESTS",
      status: "SUCCESS",
      message: `Imported ${total} contests from ${PLATFORMS.length} platforms`,
      finishedAt: new Date(),
    },
  });

  console.log(`\nContest calendar now holds ${total} entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
