import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth";
import { nextAccountNo } from "../src/account-id";
import { installBundledAvatar } from "./bundled-avatars";

const prisma = new PrismaClient();

const DEVS = [
  {
    email: "ryanh@auburn.edu",
    password: "RyanH",
    firstName: "Ryan",
    lastName: "Huynh",
    pronouns: "He/Him",
    year: "Sophomore",
    major: "Computer Engineering",
    bio: "Dev. Usually in the dining hall.",
    needHelp: "",
    canHelp: "Intro to Programming",
  },
  {
    email: "aidenb@auburn.edu",
    password: "AidenB",
    firstName: "Aiden",
    lastName: "Brooks",
    pronouns: "",
    year: "Sophomore",
    major: "Computer Science",
    bio: "Spider-Man",
    needHelp: "Data Structures",
    canHelp: "Intro to Programming",
  },
  {
    email: "bryanm@auburn.edu",
    password: "BryanM",
    firstName: "Bryan",
    lastName: "Mai",
    pronouns: "",
    year: "Senior",
    major: "Software Engineering",
    bio: "Dev\r\nStaying up late doing video editing, gaming, or SASE 👀",
    needHelp: "Databases",
    canHelp: "Calc 1, Calc 2, Intro to Programming",
  },
  {
    email: "danielk@auburn.edu",
    password: "DanielK",
    firstName: "Daniel",
    lastName: "K",
    pronouns: "",
    year: "Sophomore",
    major: "Mechanical Engineering",
    bio: "Dev. Looking for a regular study crew.",
    needHelp: "Discrete Math",
    canHelp: "Calc 1",
  },
] as const;

async function ensureDev(dev: (typeof DEVS)[number]) {
  const existing = await prisma.user.findUnique({ where: { email: dev.email } });
  const photoKey = await installBundledAvatar(dev.email);

  if (existing) {
    // Keep edited profile fields. Only ensure admin access, demo password, and bundled PFP.
    return prisma.user.update({
      where: { email: dev.email },
      data: {
        password: hashPassword(dev.password),
        isAdmin: true,
        ...(photoKey ? { photoKey } : {}),
      },
    });
  }

  return prisma.user.create({
    data: {
      email: dev.email,
      accountNo: await nextAccountNo(),
      password: hashPassword(dev.password),
      firstName: dev.firstName,
      lastName: dev.lastName,
      pronouns: dev.pronouns,
      year: dev.year,
      major: dev.major,
      university: "Auburn University",
      bio: dev.bio,
      needHelp: dev.needHelp,
      canHelp: dev.canHelp,
      isAdmin: true,
      ...(photoKey ? { photoKey } : {}),
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
