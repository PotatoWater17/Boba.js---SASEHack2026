/**
 * Admin (and other committed) profile photos live in prisma/seed-avatars/.
 * Runtime copies go to uploads/avatars/, which is gitignored.
 */
import { copyFile, mkdir, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { AVATAR_DIR } from "../src/files";

export const BUNDLED_AVATAR_DIR = path.join(process.cwd(), "prisma", "seed-avatars");

function emailLocal(email: string) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export async function bundledAvatarPath(email: string) {
  if (!existsSync(BUNDLED_AVATAR_DIR)) return null;
  const local = emailLocal(email);
  const files = await readdir(BUNDLED_AVATAR_DIR);
  const match = files.find((f) => {
    const base = f.includes(".") ? f.slice(0, f.lastIndexOf(".")) : f;
    return base === local;
  });
  return match ? path.join(BUNDLED_AVATAR_DIR, match) : null;
}

export async function hasBundledAvatar(email: string) {
  return Boolean(await bundledAvatarPath(email));
}

/** Copy a committed photo into uploads/avatars and return the runtime photoKey. */
export async function installBundledAvatar(email: string) {
  const src = await bundledAvatarPath(email);
  if (!src) return "";
  const key = `bundled-${path.basename(src)}`;
  await mkdir(AVATAR_DIR, { recursive: true });
  await copyFile(src, path.join(AVATAR_DIR, key));
  return key;
}

/** Save a live upload into prisma/seed-avatars so it can be committed. */
export async function backupBundledAvatar(email: string, photoKey: string | null | undefined) {
  if (!photoKey || photoKey.includes("..") || photoKey.includes("/") || photoKey.includes("\\")) {
    return false;
  }
  const src = path.join(AVATAR_DIR, photoKey);
  if (!existsSync(src)) return false;

  const ext = path.extname(photoKey) || ".jpg";
  const local = emailLocal(email);
  await mkdir(BUNDLED_AVATAR_DIR, { recursive: true });

  if (existsSync(BUNDLED_AVATAR_DIR)) {
    const files = await readdir(BUNDLED_AVATAR_DIR);
    for (const f of files) {
      const base = f.includes(".") ? f.slice(0, f.lastIndexOf(".")) : f;
      if (base === local && f !== `${local}${ext}`) {
        await unlink(path.join(BUNDLED_AVATAR_DIR, f)).catch(() => {});
      }
    }
  }

  await copyFile(src, path.join(BUNDLED_AVATAR_DIR, `${local}${ext}`));
  return true;
}
