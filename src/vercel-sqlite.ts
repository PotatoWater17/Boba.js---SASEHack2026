import { copyFileSync, existsSync, statSync } from "fs";
import path from "path";

const TMP_DB = "/tmp/studybuddy.db";

function sqliteUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function fileMtime(filePath: string) {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function projectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "prisma", "schema.prisma"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Resolve SQLite `file:` URLs to one absolute path so actions and page renders share a DB. */
export function resolveSqliteFile(raw: string) {
  const root = projectRoot();
  const prismaDev = path.join(root, "prisma", "dev.db");
  const withoutScheme = raw.replace(/^file:/i, "");
  const q = withoutScheme.indexOf("?");
  const filePath = (q >= 0 ? withoutScheme.slice(0, q) : withoutScheme).trim();
  if (!filePath) return prismaDev;
  if (path.isAbsolute(filePath)) return filePath;

  const fromCwd = path.resolve(process.cwd(), filePath);
  const fromPrisma = path.join(root, "prisma", path.basename(filePath));
  const existing = [fromPrisma, fromCwd].filter((candidate) => existsSync(candidate));
  if (existing.length === 0) return fromPrisma;
  if (existing.length === 1) return existing[0];
  return existing.sort((a, b) => fileMtime(b) - fileMtime(a))[0];
}

/**
 * Vercel functions can only write under /tmp. Copy the bundled demo SQLite
 * once per instance so Prisma can open a writable database.
 */
export function ensureVercelSqlite() {
  const root = projectRoot();
  const demoDb = path.join(root, "prisma", "demo.db");
  const prismaDev = path.join(root, "prisma", "dev.db");

  if (!process.env.VERCEL) {
    const raw = process.env.DATABASE_URL || sqliteUrl(prismaDev);
    if (raw.startsWith("file:")) return sqliteUrl(resolveSqliteFile(raw));
    return raw;
  }

  try {
    if (!existsSync(TMP_DB) && existsSync(demoDb)) {
      copyFileSync(demoDb, TMP_DB);
    }
  } catch (err) {
    console.error("Failed to copy demo SQLite to /tmp", err);
  }

  const url = existsSync(TMP_DB)
    ? sqliteUrl(TMP_DB)
    : existsSync(demoDb)
      ? sqliteUrl(demoDb)
      : sqliteUrl(path.join(root, "prisma", "demo.db"));
  process.env.DATABASE_URL = url;
  return url;
}
