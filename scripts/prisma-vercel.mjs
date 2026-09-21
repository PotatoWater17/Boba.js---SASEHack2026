import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function mapNeonEnv() {
  const pooled =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_POOLED ||
    "";
  const unpooled =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    pooled;
  if (pooled && !process.env.DATABASE_URL) process.env.DATABASE_URL = pooled;
  if (unpooled && !process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = unpooled;
}

function run(command) {
  const result = spawnSync(command, { stdio: "inherit", shell: true, env: process.env });
  if (result.status) process.exit(result.status ?? 1);
}

/** On Vercel, rewrite the Prisma datasource to Postgres. Local `next dev` stays SQLite. */
if (process.env.VERCEL) {
  mapNeonEnv();
  const schemaPath = "prisma/schema.prisma";
  let schema = readFileSync(schemaPath, "utf8");
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    if (process.env.DATABASE_URL_UNPOOLED && !schema.includes("directUrl")) {
      schema = schema.replace(
        'url      = env("DATABASE_URL")',
        'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")',
      );
    }
    writeFileSync(schemaPath, schema);
    console.log("prisma-vercel: using postgresql provider");
  }
  run("npx prisma generate");
  run("npx prisma db push --skip-generate");
  run("npx tsx scripts/seed-judge-if-empty.ts");
}
