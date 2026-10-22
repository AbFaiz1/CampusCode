import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * SQLite file paths are resolved against the project root instead of the
 * current working directory, so scripts and the Next.js server always open
 * the same database file.
 */
function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw;

  const filePath = raw.slice("file:".length);
  if (path.isAbsolute(filePath)) return raw;

  return `file:${path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath)}`;
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  if (url.startsWith("libsql:") || url.startsWith("https:")) {
    let authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
    let cleanUrl = url;

    try {
      const parsed = new URL(url.replace("libsql:", "https:"));
      const queryToken = parsed.searchParams.get("authToken") || parsed.searchParams.get("token");
      if (queryToken) {
        authToken = queryToken;
        parsed.searchParams.delete("authToken");
        parsed.searchParams.delete("token");
        cleanUrl = parsed.toString().replace("https:", "libsql:");
      }
    } catch {
      // url fallback
    }

    if (!authToken) {
      console.error(
        "❌ [CampusCode DB Error] TURSO_AUTH_TOKEN is missing! Please add TURSO_AUTH_TOKEN in Vercel Environment Variables."
      );
    }

    const adapter = new PrismaLibSql({
      url: cleanUrl,
      authToken,
    });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  // Local development only - dynamically loaded so serverless production never loads native addons
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


