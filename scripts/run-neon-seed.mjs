/**
 * Generate a throwaway Postgres Prisma client and run the idempotent demo fill
 * against Vercel/Neon. Does not rewrite prisma/schema.prisma (local sqlite stays).
 *
 * Usage: node scripts/run-neon-seed.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.vercel.production");
const TEMP_SCHEMA = path.join(ROOT, "prisma", "schema.neon.tmp.prisma");
const CLIENT_DIR = path.join(ROOT, "node_modules", ".prisma-neon-seed");

function loadEnvFile(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function isPostgres(raw) {
  return /^(postgres|postgresql):/i.test(raw || "");
}

function run(command, env) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env,
    cwd: ROOT,
  });
  if (result.status) {
    throw new Error(`Command failed (${result.status}): ${command}`);
  }
}

function describeUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}${u.pathname} pooled=${u.hostname.includes("-pooler")}`;
  } catch {
    return "unparseable";
  }
}

const pulled = loadEnvFile(ENV_FILE);
const unpooled =
  pulled.DATABASE_URL_UNPOOLED ||
  pulled.POSTGRES_URL_NON_POOLING ||
  pulled.DIRECT_DATABASE_URL ||
  "";
const pooled =
  pulled.DATABASE_URL ||
  pulled.POSTGRES_PRISMA_URL ||
  pulled.POSTGRES_URL ||
  "";

const databaseUrl = isPostgres(unpooled) ? unpooled : pooled;
if (!isPostgres(databaseUrl)) {
  console.error("No Postgres DATABASE_URL in .env.vercel.production — pull Vercel production env first.");
  process.exit(1);
}

const env = {
  ...process.env,
  ...pulled,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: isPostgres(unpooled) ? unpooled : databaseUrl,
  NEON_PRISMA_CLIENT: CLIENT_DIR,
};

console.log(`neon seed target: ${describeUrl(databaseUrl)}`);

let schema = readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");
schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
if (!schema.includes("directUrl") && env.DATABASE_URL_UNPOOLED) {
  schema = schema.replace(
    'url      = env("DATABASE_URL")',
    'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")',
  );
}
schema = schema.replace(
  'provider      = "prisma-client-js"',
  `provider      = "prisma-client-js"\n  output        = ${JSON.stringify(CLIENT_DIR.replace(/\\/g, "/"))}`,
);
writeFileSync(TEMP_SCHEMA, schema);

try {
  run(`npx prisma generate --schema "${TEMP_SCHEMA}"`, env);
  run("npx tsx scripts/seed-demo-fill.ts", env);
} finally {
  try {
    rmSync(TEMP_SCHEMA, { force: true });
  } catch {
    /* ignore */
  }
}
