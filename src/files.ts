import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = process.env.VERCEL_REGION
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");

export const ATTACH_DIR = path.join(UPLOAD_ROOT, "dm");
export const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatars");
export const BUNDLED_AVATAR_DIR = path.join(process.cwd(), "prisma", "seed-avatars");
export const MAX_ATTACH = 8 * 1024 * 1024;
export const MAX_AVATAR = 4 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export const ATTACH_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".md": "text/markdown",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

export function attachExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function safeFileName(name: string) {
  return name.replace(/[/\\]/g, "").replace(/[\0-\x1f\x7f]/g, "").slice(0, 80) || "file";
}

export async function saveAttach(file: File) {
  const name = safeFileName(file.name || "file");
  const ext = attachExt(name);
  const mime = ATTACH_TYPES[ext];
  if (!mime) return { error: "type" as const };
  if (file.size > MAX_ATTACH) return { error: "size" as const };

  const key = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  await mkdir(ATTACH_DIR, { recursive: true });
  await writeFile(path.join(ATTACH_DIR, key), Buffer.from(await file.arrayBuffer()));
  return { key, mime, name };
}

function safeKey(key: string) {
  return Boolean(key) && !key.includes("..") && !key.includes("/") && !key.includes("\\");
}

export async function readAvatarBytes(key: string) {
  if (!safeKey(key)) throw new Error("missing");
  const candidates = [path.join(AVATAR_DIR, key), path.join(BUNDLED_AVATAR_DIR, key)];
  if (key.startsWith("bundled-")) {
    candidates.push(path.join(BUNDLED_AVATAR_DIR, key.slice("bundled-".length)));
  }
  for (const filePath of candidates) {
    try {
      return await readFile(filePath);
    } catch {
      /* try the next location */
    }
  }
  throw new Error("missing");
}

export async function saveAvatar(file: File) {
  const name = safeFileName(file.name || "photo");
  const ext = attachExt(name);
  const mime = IMAGE_TYPES[ext];
  if (!mime) return { error: "type" as const };
  if (file.size > MAX_AVATAR) return { error: "size" as const };

  const key = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(path.join(AVATAR_DIR, key), Buffer.from(await file.arrayBuffer()));
  return { key };
}

export async function removeAvatar(key: string) {
  if (!safeKey(key)) return;
  try {
    await unlink(path.join(AVATAR_DIR, key));
  } catch {}
}

export async function removeAttach(key: string) {
  if (!safeKey(key)) return;
  try {
    await unlink(path.join(ATTACH_DIR, key));
  } catch {}
}
