/**
 * Export all users + friendships from the live DB into prisma/accounts.snapshot.json
 * (committed to git so demo/GitHub clones can restore the same accounts).
 */
import { PrismaClient } from "@prisma/client";
import { writeFile } from "fs/promises";
import path from "path";
import {
  type AccountSnapshot,
  demoPasswordForEmail,
  SNAPSHOT_PATH,
} from "./account-snapshot";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ orderBy: [{ accountNo: "asc" }, { createdAt: "asc" }] });
  const friendships = await prisma.friendship.findMany({
    include: {
      from: { select: { email: true } },
      to: { select: { email: true } },
    },
  });

  const snapshot: AccountSnapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users: users.map((u) => ({
      email: u.email,
      password: demoPasswordForEmail(u.email),
      firstName: u.firstName,
      lastName: u.lastName,
      pronouns: u.pronouns,
      year: u.year,
      major: u.major,
      university: u.university,
      bio: u.bio,
      needHelp: u.needHelp,
      canHelp: u.canHelp,
      examCourse: u.examCourse,
      examDate: u.examDate,
      examTopics: u.examTopics,
      studyStyle: u.studyStyle,
      isAdmin: u.isAdmin,
      showEmail: u.showEmail,
      accountNo: u.accountNo,
    })),
    friendships: friendships.map((f) => ({
      fromEmail: f.from.email,
      toEmail: f.to.email,
      status: f.status,
    })),
  };

  const out = path.join(process.cwd(), SNAPSHOT_PATH);
  await writeFile(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Backed up ${snapshot.users.length} accounts and ${snapshot.friendships.length} friendships → ${SNAPSHOT_PATH}`);
  console.log("Commit this file to git so demo/GitHub restores the same users.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
