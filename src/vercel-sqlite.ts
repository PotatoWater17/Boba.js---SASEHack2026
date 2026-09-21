import { copyFileSync, existsSync } from "fs";
import path from "path";

const DEMO_DB = path.join(process.cwd(), "prisma", "demo.db");
const TMP_DB = "/tmp/studybuddy.db";

/**
 * Vercel functions can only write under /tmp. Copy the bundled demo SQLite
 * once per instance so Prisma can open a writable database.
 */
export function ensureVercelSqlite() {
  if (!process.env.VERCEL_REGION) return;
  if (!existsSync(TMP_DB) && existsSync(DEMO_DB)) {
    copyFileSync(DEMO_DB, TMP_DB);
  }
  if (existsSync(TMP_DB)) {
    process.env.DATABASE_URL = `file:${TMP_DB}`;
  }
}
