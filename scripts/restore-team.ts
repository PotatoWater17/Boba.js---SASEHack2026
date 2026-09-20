import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth";
import { nextAccountNo } from "../src/account-id";

const prisma = new PrismaClient();

const DEVS = [
  {
    email: "ryanh@auburn.edu",
    password: "RyanH",
    firstName: "Ryan",
    lastName: "H",
    year: "Junior",
    major: "Computer Science",
    bio: "Dev. Usually in the library or on a whiteboard.",
    needHelp: "Calc 2",
    canHelp: "Intro to Programming",
  },
  {
    email: "aidenb@auburn.edu",
    password: "AidenB",
    firstName: "Aiden",
    lastName: "B",
    year: "Sophomore",
    major: "Computer Science",
    bio: "Dev. Down to grind practice problems.",
    needHelp: "Data Structures",
    canHelp: "Intro to Programming",
  },
  {
    email: "bryanm@auburn.edu",
    password: "BryanM",
    firstName: "Bryan",
    lastName: "M",
    year: "Junior",
    major: "Software Engineering",
    bio: "Dev. Exam reviews and late night debugging.",
    needHelp: "Physics 1",
    canHelp: "Software Engineering",
  },
  {
    email: "danielk@auburn.edu",
    password: "DanielK",
    firstName: "Daniel",
    lastName: "K",
    year: "Sophomore",
    major: "Computer Science",
    bio: "Dev. Looking for a regular study crew.",
    needHelp: "Discrete Math",
    canHelp: "Calc 1",
  },
] as const;

async function ensureDev(dev: (typeof DEVS)[number]) {
  const existing = await prisma.user.findUnique({ where: { email: dev.email } });
  const data = {
    password: hashPassword(dev.password),
    firstName: dev.firstName,
    lastName: dev.lastName,
    year: dev.year,
    major: dev.major,
    university: "Auburn University",
    bio: dev.bio,
    needHelp: dev.needHelp,
    canHelp: dev.canHelp,
    isAdmin: true,
  };

  if (existing) {
    return prisma.user.update({ where: { email: dev.email }, data });
  }

  return prisma.user.create({
    data: {
      email: dev.email,
      accountNo: await nextAccountNo(),
      ...data,
    },
  });
}

async function ensureFriends(aId: string, bId: string) {
  if (aId === bId) return;
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId: aId, toId: bId },
        { fromId: bId, toId: aId },
      ],
    },
  });
  if (existing) {
    if (existing.status !== "accepted") {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    }
    return;
  }
  await prisma.friendship.create({ data: { fromId: aId, toId: bId, status: "accepted" } });
}

async function main() {
  const users = [];
  for (const dev of DEVS) {
    users.push(await ensureDev(dev));
  }

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      await ensureFriends(users[i].id, users[j].id);
    }
  }

  console.log("Restored dev team accounts:");
  for (const u of users) {
    console.log(`  ${u.firstName} ${u.lastName} · ${u.email} · SB-${String(u.accountNo ?? 0).padStart(6, "0")}`);
  }
  console.log("Passwords: RyanH, AidenB, BryanM, DanielK");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
