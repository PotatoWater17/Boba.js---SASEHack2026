import { existsSync, statSync } from "fs";
import path from "path";

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

function isPostgresUrl(raw: string) {
  return /^(postgres|postgresql):/i.test(raw);
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

  const fromCwd = path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  const fromPrisma = path.join(root, "prisma", path.basename(filePath));
  const existing = [fromPrisma, fromCwd].filter((candidate) => existsSync(/* turbopackIgnore: true */ candidate));
  if (existing.length === 0) return fromPrisma;
  if (existing.length === 1) return existing[0];
  return existing.sort((a, b) => fileMtime(b) - fileMtime(a))[0];
}

/**
 * Local `next dev` keeps file SQLite. Vercel must use a shared Postgres
 * DATABASE_URL — never copy a demo DB to /tmp (that split-brain ate chats).
 */
export function ensureVercelSqlite() {
  const root = projectRoot();
  const prismaDev = path.join(root, "prisma", "dev.db");
  const raw = process.env.DATABASE_URL || sqliteUrl(prismaDev);

  if (isPostgresUrl(raw)) return raw;

  if (process.env.VERCEL) {
    throw new Error("Vercel requires a Postgres DATABASE_URL. SQLite /tmp is disabled.");
  }

  if (raw.startsWith("file:")) return sqliteUrl(resolveSqliteFile(raw));
  return raw;
}
