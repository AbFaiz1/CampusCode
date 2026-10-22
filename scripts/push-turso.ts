import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

async function main() {
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "libsql://rankora-db-abfaiz1.aws-ap-south-1.turso.io";

  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!authToken) {
    console.error("❌ Error: TURSO_AUTH_TOKEN is missing.");
    console.error("Usage: TURSO_AUTH_TOKEN='your_token' npx tsx scripts/push-turso.ts");
    process.exit(1);
  }

  console.log(`📡 Connecting to Turso database at ${url}...`);
  const client = createClient({ url, authToken });

  const migrationPath = path.resolve(
    process.cwd(),
    "prisma/migrations/20261022104648_init/migration.sql"
  );

  console.log(`📄 Reading migration SQL from ${migrationPath}...`);
  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log("⚡ Executing migration on Turso...");
  await client.executeMultiple(sql);

  console.log("✅ Tables and indexes created successfully on Turso!");

  // Verify
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  );
  console.log("📋 Verified tables on Turso:", tables.rows.map((r) => r.name).join(", "));
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
