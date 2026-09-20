/**
 * Re-download profile photos from the web for users without a bundled PFP.
 * Meme accounts use Wikipedia portraits; everyone else uses randomuser.me.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { AVATAR_DIR } from "../src/files";
import { hasBundledAvatar } from "./bundled-avatars";

const prisma = new PrismaClient();
const SEED_UA = "StudyBuddyBoard/0.1 (personal dev seed; local only)";

const MEME_WIKI: Record<string, string> = {
  "zuck.meme@auburn.edu": "Mark Zuckerberg",
  "elon.tusk@auburn.edu": "Elon Musk",
  "tswift.stan@auburn.edu": "Taylor Swift",
  "drizzy.meme@auburn.edu": "Drake (musician)",
  "ye.west.meme@auburn.edu": "Kanye West",
  "beyonce.meme@auburn.edu": "Beyoncé",
  "napoleon.meme@auburn.edu": "Napoleon",
  "abe.honest@auburn.edu": "Abraham Lincoln",
  "shakespeare.meme@auburn.edu": "William Shakespeare",
  "cleo.patra@auburn.edu": "Cleopatra",
  "donny.trunk@auburn.edu": "Donald Trump",
  "joe.byden@auburn.edu": "Joe Biden",
  "jeff.bezos.meme@auburn.edu": "Jeff Bezos",
  "bill.gates.meme@auburn.edu": "Bill Gates",
  "ari.grande.meme@auburn.edu": "Ariana Grande",
  "travis.scotty@auburn.edu": "Travis Scott",
  "al.einstein@auburn.edu": "Albert Einstein",
  "soc.rattes@auburn.edu": "Socrates",
  "kendrick.lamar.meme@auburn.edu": "Kendrick Lamar",
  "timothee.chalamet.meme@auburn.edu": "Timothée Chalamet",
  "mr.beast.meme@auburn.edu": "MrBeast",
  "duo.lingo@auburn.edu": "Luis von Ahn",
  "gordon.ramsay.meme@auburn.edu": "Gordon Ramsay",
  "walter.white.meme@auburn.edu": "Bryan Cranston",
  "oppenheimer.meme@auburn.edu": "J. Robert Oppenheimer",
  "steve.jobs.meme@auburn.edu": "Steve Jobs",
  "gabe.newell@auburn.edu": "Gabe Newell",
  "wednesday.addams@auburn.edu": "Jenna Ortega",
  "michael.scott@auburn.edu": "Steve Carell",
  "chatgpt.meme@auburn.edu": "Sam Altman",
  "barbie.meme@auburn.edu": "Margot Robbie",
  "shrek.meme@auburn.edu": "Mike Myers",
  "naruto.meme@auburn.edu": "Maile Flanagan",
  "lana.del.rey@auburn.edu": "Lana Del Rey",
  "charli.xcx@auburn.edu": "Charli XCX",
  "marie.curie@auburn.edu": "Marie Curie",
  "leonardo.da.vinci@auburn.edu": "Leonardo da Vinci",
  "rihanna.meme@auburn.edu": "Rihanna",
  "sabrina.carpenter@auburn.edu": "Sabrina Carpenter",
};

async function downloadAvatar(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": SEED_UA }, redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("svg")) return null;
    let ext = ".jpg";
    if (ct.includes("png")) ext = ".png";
    else if (ct.includes("webp")) ext = ".webp";
    else if (ct.includes("gif")) ext = ".gif";
    const key = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await mkdir(AVATAR_DIR, { recursive: true });
    await writeFile(path.join(AVATAR_DIR, key), buf);
    return key;
  } catch {
    return null;
  }
}

async function randomUserPortrait(seed: string) {
  const res = await fetch(
    `https://randomuser.me/api/?seed=${encodeURIComponent(seed)}&inc=picture`,
    { headers: { "User-Agent": SEED_UA } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { picture?: { large?: string } }[] };
  return data.results?.[0]?.picture?.large || null;
}

async function wikiThumbsBatch(titles: string[]) {
  const out = new Map<string, string>();
  const unique = [...new Set(titles)];
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(chunk.join("|"))}&prop=pageimages&format=json&pithumbsize=400`;
    const res = await fetch(api, { headers: { "User-Agent": SEED_UA } });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; thumbnail?: { source: string } }> };
    };
    for (const page of Object.values(data.query?.pages || {})) {
      const src = page.thumbnail?.source;
      if (page.title && src && !src.toLowerCase().includes(".svg")) {
        out.set(page.title, src);
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

async function removeOld(key: string | null | undefined) {
  if (!key || key.includes("..") || key.includes("/")) return;
  try {
    await unlink(path.join(AVATAR_DIR, key));
  } catch {}
}

async function photoForUser(email: string, wikiThumbs: Map<string, string>) {
  const wikiTitle = MEME_WIKI[email];
  if (wikiTitle) {
    const thumb = wikiThumbs.get(wikiTitle);
    if (thumb) {
      const key = await downloadAvatar(thumb);
      if (key) return { key, source: `wiki:${wikiTitle}` };
    }
  }
  const portrait = await randomUserPortrait(email);
  if (portrait) {
    const key = await downloadAvatar(portrait);
    if (key) return { key, source: "randomuser" };
  }
  return null;
}

async function main() {
  const wikiThumbs = await wikiThumbsBatch(Object.values(MEME_WIKI));
  const users = await prisma.user.findMany({ select: { id: true, email: true, photoKey: true, firstName: true, lastName: true } });

  let updated = 0;
  let skipped = 0;
  for (const user of users) {
    if (await hasBundledAvatar(user.email)) {
      console.log(`  keep ${user.email} (bundled photo)`);
      skipped++;
      continue;
    }
    const result = await photoForUser(user.email, wikiThumbs);
    await new Promise((r) => setTimeout(r, 120));
    if (!result) {
      console.log(`  skip ${user.email} (download failed)`);
      skipped++;
      continue;
    }
    await removeOld(user.photoKey);
    await prisma.user.update({ where: { id: user.id }, data: { photoKey: result.key } });
    console.log(`  ${user.firstName} ${user.lastName} · ${user.email} ← ${result.source}`);
    updated++;
  }

  console.log(`Refreshed ${updated} avatars (${skipped} skipped).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
