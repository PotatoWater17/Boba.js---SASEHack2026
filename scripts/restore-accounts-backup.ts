/**
 * Upsert users + friendships from prisma/accounts.snapshot.json (idempotent).
 * Run after db:seed / db:demo-full to sync live demo profiles with git backup.
 */
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { nextAccountNo } from "../src/account-id";
import {
  type AccountSnapshot,
  hashDemoPassword,
  SNAPSHOT_PATH,
} from "./account-snapshot";

const prisma = new PrismaClient();

async function loadSnapshot() {
  const raw = await readFile(path.join(process.cwd(), SNAPSHOT_PATH), "utf8");
  return JSON.parse(raw) as AccountSnapshot;
}

async function main() {
  const snapshot = await loadSnapshot();
  if (snapshot.version !== 1) throw new Error(`Unsupported snapshot version: ${snapshot.version}`);

  const idByEmail = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const u of snapshot.users) {
    const data = {
      password: hashDemoPassword(u.email, u.password),
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
    };

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: u.accountNo && !existing.accountNo ? { ...data, accountNo: u.accountNo } : data,
      });
      idByEmail.set(u.email, existing.id);
      updated++;
    } else {
      const row = await prisma.user.create({
        data: {
          email: u.email,
          accountNo: u.accountNo ?? (await nextAccountNo()),
          ...data,
        },
      });
      idByEmail.set(u.email, row.id);
      created++;
    }
  }

  let friendUpserts = 0;
  for (const f of snapshot.friendships) {
    const fromId = idByEmail.get(f.fromEmail);
    const toId = idByEmail.get(f.toEmail);
    if (!fromId || !toId || fromId === toId) continue;

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromId, toId },
          { fromId: toId, toId: fromId },
        ],
      },
    });
    if (existing) {
      if (existing.status !== f.status) {
        await prisma.friendship.update({ where: { id: existing.id }, data: { status: f.status } });
        friendUpserts++;
      }
      continue;
    }
    await prisma.friendship.create({ data: { fromId, toId, status: f.status } });
    friendUpserts++;
  }

  console.log(
    `Restored from ${SNAPSHOT_PATH} (exported ${snapshot.exportedAt.slice(0, 10)}):`,
  );
  console.log(`  ${created} accounts created, ${updated} updated`);
  console.log(`  ${friendUpserts} friendship rows synced`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
