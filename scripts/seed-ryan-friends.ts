/**
 * Add more buddies for ryanh@auburn.edu (debug / demo).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureFriend(ryanId: string, otherId: string, status: "accepted" | "pending", ryanSent: boolean) {
  if (ryanId === otherId) return;
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId: ryanId, toId: otherId },
        { fromId: otherId, toId: ryanId },
      ],
    },
  });
  if (existing) {
    if (existing.status !== status) {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status } });
    }
    return;
  }
  await prisma.friendship.create({
    data: {
      fromId: ryanSent ? ryanId : otherId,
      toId: ryanSent ? otherId : ryanId,
      status,
    },
  });
}

async function ensureDm(fromId: string, toId: string, text: string, seen = true) {
  const existing = await prisma.directMessage.findFirst({ where: { fromId, toId, text } });
  if (existing) return;
  await prisma.directMessage.create({ data: { fromId, toId, text, seen } });
}

async function main() {
  const ryan = await prisma.user.findUnique({ where: { email: "ryanh@auburn.edu" } });
  if (!ryan) throw new Error("ryanh@auburn.edu not found — run db:restore-team first");

  const demoEmails = [
    "jsmith@auburn.edu",
    "alex@auburn.edu",
    "sam@auburn.edu",
    "henry@auburn.edu",
    "hailey@auburn.edu",
  ];
  const memeEmails = [
    "zuck.meme@auburn.edu",
    "tswift.stan@auburn.edu",
    "mr.beast.meme@auburn.edu",
    "duo.lingo@auburn.edu",
    "chatgpt.meme@auburn.edu",
    "gordon.ramsay.meme@auburn.edu",
    "naruto.meme@auburn.edu",
    "elon.tusk@auburn.edu",
    "drizzy.meme@auburn.edu",
    "abe.honest@auburn.edu",
  ];

  const acceptedEmails = [...demoEmails, ...memeEmails.slice(0, 6)];
  const pendingFromThem = memeEmails.slice(6, 8);
  const pendingFromRyan = memeEmails.slice(8, 10);

  let added = 0;
  for (const email of acceptedEmails) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) continue;
    await ensureFriend(ryan.id, u.id, "accepted", true);
    added++;
  }
  for (const email of pendingFromThem) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) continue;
    await ensureFriend(ryan.id, u.id, "pending", false);
    added++;
  }
  for (const email of pendingFromRyan) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) continue;
    await ensureFriend(ryan.id, u.id, "pending", true);
    added++;
  }

  const jordan = await prisma.user.findUnique({ where: { email: "jsmith@auburn.edu" } });
  const alex = await prisma.user.findUnique({ where: { email: "alex@auburn.edu" } });
  const zuck = await prisma.user.findUnique({ where: { email: "zuck.meme@auburn.edu" } });
  const taylor = await prisma.user.findUnique({ where: { email: "tswift.stan@auburn.edu" } });
  const duo = await prisma.user.findUnique({ where: { email: "duo.lingo@auburn.edu" } });

  if (jordan) {
    await ensureDm(jordan.id, ryan.id, "Yo Ryan — Calc 2 study tonight?", false);
    await ensureDm(ryan.id, jordan.id, "Yeah RBD at 7 works");
  }
  if (alex) {
    await ensureDm(alex.id, ryan.id, "Got extra practice exam PDFs if you want them");
  }
  if (zuck) {
    await ensureDm(zuck.id, ryan.id, "Join my metaverse study pod?", false);
  }
  if (taylor) {
    await ensureDm(taylor.id, ryan.id, "bestie are we still on for the chem grind 💅", false);
  }
  if (duo) {
    await ensureDm(duo.id, ryan.id, "👀 You forgot your streak. Study now.", false);
  }

  const total = await prisma.friendship.count({
    where: { OR: [{ fromId: ryan.id }, { toId: ryan.id }] },
  });
  const accepted = await prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [{ fromId: ryan.id }, { toId: ryan.id }],
    },
  });
  const pending = total - accepted;

  console.log(`Ryan buddies: ${total} total (${accepted} accepted, ${pending} pending)`);
  console.log("Log in: ryanh@auburn.edu / RyanH → /friends");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
