import { PrismaClient } from "@prisma/client";
import { readSession } from "@/auth";

export {
  hashPassword,
  needsPasswordUpgrade,
  safeNextPath,
  setUser,
  clearUser,
  verifyPassword,
} from "@/auth";

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
export { MAJORS, resolveMajor } from "@/majors";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaVersion?: string;
};

/** Bump when Prisma schema changes so dev picks up a fresh client after generate. */
const PRISMA_CLIENT_VERSION = "2026-09-19-removed-member-v1";

function createPrisma() {
  return new PrismaClient({ log: ["error"] });
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaVersion !== PRISMA_CLIENT_VERSION
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
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

export { initials } from "@/utils";

export async function getMe() {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  const dbVersion = typeof user.sessionVersion === "number" ? user.sessionVersion : 0;
  if (dbVersion !== session.sessionVersion) return null;
  return user;
}

export async function areFriends(a: string, b: string) {
  if (await isBlockedBetween(a, b)) return false;
  const bond = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
  });
  return Boolean(bond);
}

/** Restore an accepted buddy bond after unblock when chat history exists. */
export async function ensureAcceptedFriendship(a: string, b: string) {
  if (await isBlockedBetween(a, b)) return false;

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
  });
  if (existing?.status === "accepted") return true;
  if (existing?.status === "pending") return false;

  const hadDm = await prisma.directMessage.findFirst({
    where: {
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
  });
  if (!hadDm) return false;

  if (existing) {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
  } else {
    await prisma.friendship.create({ data: { fromId: a, toId: b, status: "accepted" } });
  }
  return true;
}

export async function isBlockedBetween(a: string, b: string) {
  if (a === b) return false;
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return Boolean(block);
}

export async function blockedByMe(meId: string, otherId: string) {
  const block = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: meId, blockedId: otherId } },
  });
  return Boolean(block);
}

/** Profiles the current user has blocked (most recent first). */
export async function usersBlockedByMe(meId: string) {
  const rows = await prisma.block.findMany({
    where: { blockerId: meId },
    include: {
      blocked: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          university: true,
          year: true,
          photoKey: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.blocked);
}

async function acceptedFriendIds(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ fromId: userId }, { toId: userId }],
    },
    select: { fromId: true, toId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.fromId === userId ? row.toId : row.fromId);
  }
  return ids;
}

/** Buddies shared by both users (excluding either user). */
export async function mutualConnections(a: string, b: string) {
  if (a === b) return [];
  const [aFriends, bFriends] = await Promise.all([acceptedFriendIds(a), acceptedFriendIds(b)]);
  const mutualIds = [...aFriends].filter((id) => bFriends.has(id) && id !== a && id !== b);
  if (!mutualIds.length) return [];
  return prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      university: true,
      year: true,
      photoKey: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** User ids that cannot interact with `userId` because of a block either way. */
export async function blockedUserIds(userId: string) {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return ids;
}

export function splitList(value: string | null | undefined) {
  if (!value) return [];
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

/** Turn "6:00 PM" back into "18:00" for <input type="time">. */
export function timeToInput(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) {
    const raw = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!raw) return "18:00";
    return `${String(Number(raw[1])).padStart(2, "0")}:${raw[2]}`;
  }
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = match[3].toUpperCase();
  if (suffix === "PM" && hour < 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
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

/** One-line preview for group chat list / inbox. */
export function groupMessagePreview(msg: {
  unsent: boolean;
  authorRemoved?: boolean;
  text?: string | null;
  fileName?: string | null;
  user: { firstName: string };
}) {
  if (msg.unsent) return "Unsent";
  if (msg.authorRemoved) return "Removed user";
  const body = msg.text || (msg.fileName ? "Sent an attachment" : "New message");
  return `${msg.user.firstName}: ${body}`;
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

function topicOverlap(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.includes(y) || y.includes(x);
}

export function parseDateField(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return "";
  const [y, m, d] = cleaned.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "";
  return cleaned;
}

export function daysUntilDate(value: string) {
  const parsed = parseDateField(value);
  if (!parsed) return null;
  const [y, m, d] = parsed.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function daysBetweenDates(a: string, b: string) {
  const pa = parseDateField(a);
  const pb = parseDateField(b);
  if (!pa || !pb) return null;
  const [y1, m1, d1] = pa.split("-").map(Number);
  const [y2, m2, d2] = pb.split("-").map(Number);
  const da = new Date(y1, m1 - 1, d1);
  const db = new Date(y2, m2 - 1, d2);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export type BuddySearchPrefs = {
  needHelp: string;
  canHelp: string;
  major: string;
  university?: string;
  year?: string;
  examCourse?: string;
  examDate?: string;
  examTopics?: string;
  studyStyle?: string;
};

export type BuddyMeetupLite = {
  subject: string;
  topic: string;
  meetDate: string;
  style: string;
};

function topicListOverlap(a: string[], b: string[]) {
  let hits = 0;
  for (const x of a) {
    if (b.some((y) => topicOverlap(x, y))) hits++;
  }
  return hits;
}

function pushReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

/** Classes you're prepping for — profile needHelp plus exam subject. */
function effectiveNeed(prefs: BuddySearchPrefs) {
  const need = splitList(prefs.needHelp);
  const course = (prefs.examCourse || "").trim();
  if (course && !need.some((c) => classOverlap(c, course))) {
    need.unshift(course);
  }
  return need;
}

/** Score a public meetup against exam-prep search prefs. */
export function examMeetupScore(
  prefs: Pick<BuddySearchPrefs, "examCourse" | "examTopics" | "examDate" | "studyStyle" | "university">,
  meetup: BuddyMeetupLite & { university?: string },
) {
  let score = 0;
  const course = (prefs.examCourse || "").trim();
  const topics = splitList(prefs.examTopics || "");
  const meetTopics = splitList(meetup.topic);
  let relevant = false;

  if (course && classOverlap(meetup.subject, course)) {
    score += 100;
    relevant = true;
  }
  if (topics.length && topicListOverlap(topics, meetTopics) > 0) {
    score += 40;
    relevant = true;
  }

  if (course && !relevant) return 0;

  if (prefs.studyStyle?.trim() && meetup.style === prefs.studyStyle) score += 35;
  if (
    prefs.university?.trim() &&
    meetup.university?.trim() &&
    prefs.university.trim().toLowerCase() === meetup.university.trim().toLowerCase()
  ) {
    score += 25;
  }
  if (prefs.examDate && meetup.meetDate) {
    const beforeExam = daysBetweenDates(meetup.meetDate, prefs.examDate);
    if (beforeExam !== null && beforeExam >= 0 && beforeExam <= 14) score += 20;
  }
  return score;
}

/** Score another student against your classes, campus, exam prep, and major. */
export function buddyMatch(
  me: BuddySearchPrefs,
  other: BuddySearchPrefs & { year?: string },
  meetups: BuddyMeetupLite[] = [],
) {
  if (me.year?.trim() && other.year?.trim() && me.year.trim().toLowerCase() !== other.year.trim().toLowerCase()) {
    return { score: 0, reasons: [] as string[] };
  }

  const myNeed = effectiveNeed(me);
  const myHelp = splitList(me.canHelp);
  const theirNeed = splitList(other.needHelp);
  const theirHelp = splitList(other.canHelp);
  const myExamTopics = splitList(me.examTopics || "");
  const theirExamTopics = splitList(other.examTopics || "");
  const examCourse = (me.examCourse || "").trim();
  const examFocused = Boolean(examCourse);
  const reasons: string[] = [];
  let score = 0;
  let courseRelevant = false;

  const markCourseRelevant = () => {
    courseRelevant = true;
  };

  const countsForExam = (course: string) => !examFocused || classOverlap(course, examCourse);

  for (const c of myNeed) {
    if (!countsForExam(c)) continue;
    if (theirHelp.some((x) => classOverlap(x, c))) {
      score += 100;
      markCourseRelevant();
      pushReason(reasons, `can help with ${c}`);
    }
  }
  for (const c of myHelp) {
    if (!countsForExam(c)) continue;
    if (theirNeed.some((x) => classOverlap(x, c))) {
      score += 80;
      markCourseRelevant();
      pushReason(reasons, `needs help in ${c}`);
    }
  }
  for (const c of myNeed) {
    if (!countsForExam(c)) continue;
    if (theirNeed.some((x) => classOverlap(x, c))) {
      score += 40;
      markCourseRelevant();
      if (!reasons.some((r) => r.toLowerCase().includes(c.toLowerCase()))) {
        pushReason(reasons, `also grinding ${c}`);
      }
    }
  }

  if (examCourse) {
    if (theirHelp.some((x) => classOverlap(x, examCourse))) {
      score += 130;
      markCourseRelevant();
      pushReason(reasons, `can tutor ${examCourse}`);
    }
    if (other.examCourse && classOverlap(other.examCourse, examCourse)) {
      score += 90;
      markCourseRelevant();
      pushReason(reasons, `same exam: ${examCourse}`);
    }
    if (theirNeed.some((x) => classOverlap(x, examCourse))) {
      score += 50;
      markCourseRelevant();
      pushReason(reasons, `also prepping ${examCourse}`);
    }
  }

  if (myExamTopics.length) {
    const topicHits = topicListOverlap(myExamTopics, theirExamTopics);
    if (topicHits > 0) {
      score += topicHits * 35;
      markCourseRelevant();
      pushReason(reasons, `${topicHits} shared exam topic${topicHits === 1 ? "" : "s"}`);
    }
    if (!examFocused) {
      const theirTopicPool = [...theirExamTopics, ...splitList(other.canHelp), ...splitList(other.needHelp)];
      const prepHits = topicListOverlap(myExamTopics, theirTopicPool);
      if (prepHits > topicHits) {
        score += (prepHits - topicHits) * 15;
        pushReason(reasons, "covers your weak topics");
      }
    }
  }

  if (
    me.examDate &&
    other.examDate &&
    (!examFocused || (other.examCourse && classOverlap(other.examCourse, examCourse)))
  ) {
    const gap = Math.abs(daysBetweenDates(me.examDate, other.examDate) ?? 999);
    if (gap <= 3) {
      score += 60;
      pushReason(reasons, "exam same week");
    } else if (gap <= 7) {
      score += 40;
      pushReason(reasons, "exam dates close");
    } else if (gap <= 14) {
      score += 20;
      pushReason(reasons, "exam dates nearby");
    }
  }

  if (meetups.length && (examCourse || myExamTopics.length)) {
    for (const m of meetups) {
      const subjectMatch = examCourse && classOverlap(m.subject, examCourse);
      const meetTopics = splitList(m.topic);
      const topicMatch = myExamTopics.length > 0 && topicListOverlap(myExamTopics, meetTopics) > 0;
      if (!subjectMatch && !topicMatch) continue;

      markCourseRelevant();
      if (subjectMatch) {
        score += 45;
        pushReason(reasons, `in ${m.subject} study group`);
      }
      if (topicMatch) {
        score += 30;
        pushReason(reasons, "group covers your topics");
      }
      if (me.studyStyle?.trim() && m.style === me.studyStyle) {
        score += 20;
        pushReason(reasons, `group uses ${me.studyStyle.toLowerCase()}`);
      }
      if (me.examDate && m.meetDate) {
        const beforeExam = daysBetweenDates(m.meetDate, me.examDate);
        if (beforeExam !== null && beforeExam >= 0 && beforeExam <= 10) {
          score += 25;
          pushReason(reasons, "group meets before your exam");
        }
      }
    }
  }

  if (
    courseRelevant &&
    me.studyStyle?.trim() &&
    other.studyStyle?.trim() &&
    me.studyStyle === other.studyStyle
  ) {
    score += 30;
    pushReason(reasons, `prefers ${me.studyStyle.toLowerCase()}`);
  }

  if (courseRelevant && me.university && other.university && me.university.toLowerCase() === other.university.toLowerCase()) {
    score += 30;
    pushReason(reasons, "same campus");
  }
  if (courseRelevant && me.major && other.major && me.major.toLowerCase() === other.major.toLowerCase()) {
    score += 20;
    pushReason(reasons, "same major");
  }

  if (examFocused && !courseRelevant) {
    return { score: 0, reasons: [] };
  }

  return { score, reasons };
}
