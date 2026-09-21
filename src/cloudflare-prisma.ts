import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

/** Prisma + D1 for the OpenNext Worker runtime. Not used by `next dev` or Vercel. */
export function createCloudflarePrisma() {
  const { env } = getCloudflareContext();
  if (env.SESSION_SECRET && !process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = env.SESSION_SECRET;
  }
  return new PrismaClient({
    adapter: new PrismaD1(env.DB),
    log: ["error"],
  });
}
