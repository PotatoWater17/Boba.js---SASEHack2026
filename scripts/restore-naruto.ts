import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nextAccountNo } from "../src/account-id";
import { AVATAR_DIR } from "../src/files";

const prisma = new PrismaClient();
const SEED_UA = "StudyBuddyBoard/0.1 (personal dev seed; local only)";

function hash(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

async function wikiThumb(title: string) {
  const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400`;
  const res = await fetch(api, { headers: { "User-Agent": SEED_UA } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source: string } }> };
  };
  const page = data.query?.pages && Object.values(data.query.pages)[0];
  return page?.thumbnail?.source || null;
}

async function downloadAvatar(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": SEED_UA }, redirect: "follow" });
  if (!res.ok) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) return "";
  const key = `${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;
  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(path.join(AVATAR_DIR, key), buf);
  return key;
}

async function main() {
  const email = "naruto.meme@auburn.edu";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Naruto account already exists:", email);
    return;
  }

  const thumb = await wikiThumb("Naruto Uzumaki");
  const photoKey = thumb ? await downloadAvatar(thumb) : "";

  const accountNo = await nextAccountNo();
  const user = await prisma.user.create({
    data: {
      email,
      password: hash("Password1!"),
      firstName: "Naruto",
      lastName: "Uzumaki",
      pronouns: "he/him",
      year: "Sophomore",
      major: "Ninja Studies",
      university: "Auburn University",
      bio: "Believe it! Ramen budget > textbook budget. Shadow clone jutsu for group projects (academic integrity unclear).",
      needHelp: "Chakra control, sitting still",
      canHelp: "Never giving up, hype speeches",
      photoKey,
      accountNo,
    },
  });

  const jordan = await prisma.user.findUnique({ where: { email: "jsmith@auburn.edu" } });
  if (jordan) {
    const bond = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromId: jordan.id, toId: user.id },
          { fromId: user.id, toId: jordan.id },
        ],
      },
    });
    if (!bond) {
      await prisma.friendship.create({
        data: { fromId: user.id, toId: jordan.id, status: "accepted" },
      });
    }
  }

  console.log("Restored Naruto:", user.email, "Password1!", formatId(accountNo));
}

function formatId(n: number | null) {
  if (!n) return "—";
  return `SB-${String(n).padStart(6, "0")}`;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
