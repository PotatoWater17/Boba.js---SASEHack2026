import { createHash } from "crypto";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

export {
  COURSES,
  GROUP_KINDS,
  LOCATIONS,
  MEETUP_STYLES,
  SUBJECT_TOPICS,
  groupKindById,
  groupKindFromMaxSize,
  groupKindLabel,
  topicsFor,
} from "@/courses";
export type { GroupKindId } from "@/courses";
export { UNIVERSITIES, resolveUniversity } from "@/universities";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function initials(first: string, last: string) {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

export async function setUser(userId: string) {
  (await cookies()).set("userId", userId, { httpOnly: true, path: "/", sameSite: "lax" });
}

export async function clearUser() {
  (await cookies()).delete("userId");
}

export async function getMe() {
  const id = (await cookies()).get("userId")?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export function splitList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatMeetDate(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimeInput(value: string) {
  // expects "HH:MM" from <input type="time">
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function isValidMeetDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
}

export function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function timeAgo(date: Date) {
  const min = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  const year = Math.max(1, Math.floor(day / 365));
  return `${year} year${year === 1 ? "" : "s"} ago`;
}

/** Higher score = better match to the student's profile preferences. */
export function meetingMatchScore(
  subject: string,
  prefs: { needHelp: string; canHelp: string; major: string; university?: string },
  university?: string,
) {
  const need = splitList(prefs.needHelp).map((s) => s.toLowerCase());
  const help = splitList(prefs.canHelp).map((s) => s.toLowerCase());
  const sub = subject.toLowerCase();
  let score = 0;
  if (need.some((c) => c === sub || sub.includes(c) || c.includes(sub))) score += 100;
  if (help.some((c) => c === sub || sub.includes(c) || c.includes(sub))) score += 40;
  if (prefs.major && sub.includes(prefs.major.toLowerCase().slice(0, 4))) score += 10;
  if (
    prefs.university &&
    university &&
    prefs.university.toLowerCase() === university.toLowerCase()
  ) {
    score += 50;
  }
  return score;
}

export const PAGE_SIZE = 10;

function classOverlap(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.includes(y) || y.includes(x);
}

/** Score another student against your classes, campus, and major. */
export function buddyMatch(
  me: { needHelp: string; canHelp: string; major: string; university?: string },
  other: { needHelp: string; canHelp: string; major: string; university?: string },
) {
  const myNeed = splitList(me.needHelp);
  const myHelp = splitList(me.canHelp);
  const theirNeed = splitList(other.needHelp);
  const theirHelp = splitList(other.canHelp);
  const reasons: string[] = [];
  let score = 0;

  for (const c of myNeed) {
    if (theirHelp.some((x) => classOverlap(x, c))) {
      score += 100;
      reasons.push(`can help with ${c}`);
    }
  }
  for (const c of myHelp) {
    if (theirNeed.some((x) => classOverlap(x, c))) {
      score += 80;
      reasons.push(`needs help in ${c}`);
    }
  }
  for (const c of myNeed) {
    if (theirNeed.some((x) => classOverlap(x, c))) {
      score += 40;
      if (!reasons.some((r) => r.toLowerCase().includes(c.toLowerCase()))) {
        reasons.push(`also grinding ${c}`);
      }
    }
  }
  if (me.university && other.university && me.university.toLowerCase() === other.university.toLowerCase()) {
    score += 50;
    reasons.push("same campus");
  }
  if (me.major && other.major && me.major.toLowerCase() === other.major.toLowerCase()) {
    score += 20;
    reasons.push("same major");
  }

  return { score, reasons };
}
