import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { seedDemoFill } from "./seed-demo-fill";

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const SPARSE_USER_MAX = 15;

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, SCRYPT);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** First Vercel/Postgres deploy: fill the demo world if the DB is still empty. Never wipes data. */
async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count < SPARSE_USER_MAX) {
      console.log(`seed-judge: ${count} users — filling demo world`);
      const stats = await seedDemoFill(prisma);
      console.log("seed-judge: demo fill", JSON.stringify(stats));
      return;
    }

    const email = "ryanh@auburn.edu";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`seed-judge: ${count} users, ryan already present`);
      return;
    }
    await prisma.user.create({
      data: {
        email,
        password: hashPassword("RyanH"),
        isAdmin: true,
        firstName: "Ryan",
        lastName: "Huynh",
        pronouns: "He/Him",
        year: "Sophomore",
        major: "Computer Engineering",
        university: "Auburn University",
        bio: "Dev. Usually in the dining hall.",
        needHelp: "",
        canHelp: "Intro to Programming",
      },
    });
    console.log("seed-judge: created ryanh@auburn.edu");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
