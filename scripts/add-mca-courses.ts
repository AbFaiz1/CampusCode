import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

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

async function main() {
  const prisma = createClient();
  console.log("Checking for MCA courses...");

  const collegeName = "Maulana Azad National Institute of Technology";
  const deptName = "Computer Science & Engineering";
  const courseName = "MCA Computer Science";

  // 1. Check if college exists
  const college = await prisma.college.findFirst({
    where: { name: collegeName },
  });

  if (!college) {
    console.log(`College '${collegeName}' not found. This script requires the college to exist first.`);
    process.exit(1);
  }

  // 2. Check if department exists for that college
  const department = await prisma.department.findFirst({
    where: {
      name: deptName,
      collegeId: college.id,
    },
  });

  if (!department) {
    console.log(`Department '${deptName}' not found for college '${collegeName}'.`);
    process.exit(1);
  }

  // 3. Check if the course already exists for that department
  const existingCourse = await prisma.course.findFirst({
    where: {
      name: courseName,
      departmentId: department.id,
    },
  });

  if (existingCourse) {
    console.log(`Course '${courseName}' already exists. No action needed.`);
  } else {
    // 4. Create the course
    const newCourse = await prisma.course.create({
      data: {
        name: courseName,
        shortName: "MCA CSE",
        degree: "MCA",
        durationYears: 3,
        departmentId: department.id,
        collegeId: college.id,
      },
    });
    console.log(`Successfully created course: ${newCourse.name} (ID: ${newCourse.id})`);
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error("Error executing script:", error);
    process.exit(1);
  });
