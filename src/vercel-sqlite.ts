import { copyFileSync, existsSync } from "fs";
import path from "path";

const DEMO_DB = path.join(process.cwd(), "prisma", "demo.db");
const TMP_DB = "/tmp/studybuddy.db";

function sqliteUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

/**
 * Vercel functions can only write under /tmp. Copy the bundled demo SQLite
 * once per instance so Prisma can open a writable database.
 */
export function ensureVercelSqlite() {
  if (!process.env.VERCEL) {
    return process.env.DATABASE_URL || sqliteUrl(path.join(process.cwd(), "prisma", "dev.db"));
  }

  try {
    if (!existsSync(TMP_DB) && existsSync(DEMO_DB)) {
      copyFileSync(DEMO_DB, TMP_DB);
    }
  } catch (err) {
    console.error("Failed to copy demo SQLite to /tmp", err);
  }

  const url = existsSync(TMP_DB)
    ? sqliteUrl(TMP_DB)
    : existsSync(DEMO_DB)
      ? sqliteUrl(DEMO_DB)
      : "file:./demo.db";
  process.env.DATABASE_URL = url;
  return url;
}
