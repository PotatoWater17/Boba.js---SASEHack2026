/**
 * Idempotent demo-world fill for Postgres (Vercel/Neon).
 * Upserts users/friendships from the snapshot, then adds meetings + DMs if missing.
 * Never deleteMany / never resets the schema. Safe for a live DB that only has ryanh.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
import type { AccountSnapshot } from "./account-snapshot";
import { installBundledAvatar } from "./bundled-avatars";
import { seedMemeMeetups } from "./meme-meetups";
import { inferMeetingOnline } from "../src/meeting-format";

const SNAPSHOT_PATH = "prisma/accounts.snapshot.json";
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const DEV_PASSWORDS: Record<string, string> = {
  "ryanh@auburn.edu": "RyanH",
  "aidenb@auburn.edu": "AidenB",
  "bryanm@auburn.edu": "BryanM",
  "danielk@auburn.edu": "DanielK",
};

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, SCRYPT);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function hashDemoPassword(email: string, password?: string) {
  return hashPassword(password || DEV_PASSWORDS[email.toLowerCase()] || "Password1!");
}

const require = createRequire(import.meta.url);

type Db = PrismaClient;

function dayOffset(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const EXTRA = [
  ["Calc 1", "Limits review", "3:00 PM", "Library", 1],
  ["Calc 2", "Series practice", "5:00 PM", "Student Center", 2],
  ["Calc 2", "Exam 1 cram", "7:00 PM", "Online", 3],
  ["Calc 3", "Partial derivatives", "4:00 PM", "Math building", 4],
  ["Linear Algebra", "Eigenvalues", "2:00 PM", "Library", 5],
  ["Discrete Math", "Proofs workshop", "11:00 AM", "Student Center", 6],
  ["Physics 1", "Forces & free body", "1:00 PM", "Science hall", 7],
  ["Physics 1", "Energy problems", "6:00 PM", "Online", 8],
  ["Physics 2", "Circuits lab review", "7:30 PM", "Engineering", 9],
  ["Chemistry 1", "Stoichiometry", "5:00 PM", "Chem building", 10],
  ["Intro to Programming", "Loops & arrays", "3:00 PM", "CS lab", 1],
  ["Intro to Programming", "Project help", "4:00 PM", "Online", 2],
  ["Data Structures", "Trees & heaps", "2:00 PM", "Library", 3],
  ["Data Structures", "Quiz prep", "5:00 PM", "Student Center", 4],
  ["Computer Organization", "Assembly basics", "4:30 PM", "Engineering", 5],
  ["Software Engineering", "Agile review", "6:00 PM", "Online", 6],
  ["Statistics", "Hypothesis testing", "3:30 PM", "Library", 7],
  ["English Comp", "Essay peer review", "1:00 PM", "Writing center", 8],
  ["Calc 2", "Integration bee", "8:00 PM", "Student Center", 9],
  ["Physics 1", "Practice midterm", "10:00 AM", "Science hall", 10],
  ["Discrete Math", "Graph theory", "3:00 PM", "Online", 11],
  ["Linear Algebra", "Matrix ops", "5:30 PM", "Math building", 12],
  ["Chemistry 1", "Exam week study", "7:00 PM", "Chem building", 13],
  ["Statistics", "Regression practice", "6:30 PM", "Library", 14],
] as const;

const STYLES = [
  "Practice problems",
  "Lecture / teach-back",
  "Exam review",
  "Homework help",
  "Concept review",
  "Lab prep",
  "Discussion",
  "Mixed",
];

const HOST_UNIS = [
  "Auburn University",
  "Georgia Institute of Technology-Main Campus",
  "The University of Alabama",
];

function createPrisma(): Db {
  if (process.env.NEON_PRISMA_CLIENT) {
    const { PrismaClient: NeonPrisma } = require(process.env.NEON_PRISMA_CLIENT) as {
      PrismaClient: new () => Db;
    };
    return new NeonPrisma();
  }
  return new PrismaClient();
}

async function nextAccountNo(prisma: Db) {
  const { _max } = await prisma.user.aggregate({ _max: { accountNo: true } });
  return (_max.accountNo ?? 0) + 1;
}

async function takeAccountNo(prisma: Db, desired: number | null | undefined) {
  if (desired != null) {
    const taken = await prisma.user.findUnique({ where: { accountNo: desired } });
    if (!taken) return desired;
  }
  return nextAccountNo(prisma);
}

async function ensureFriend(prisma: Db, fromId: string, toId: string, status: string) {
  if (fromId === toId) return false;
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId, toId },
        { fromId: toId, toId: fromId },
      ],
    },
  });
  if (existing) {
    if (existing.status !== status) {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status } });
      return true;
    }
    return false;
  }
  await prisma.friendship.create({ data: { fromId, toId, status } });
  return true;
}

async function ensureDm(
  prisma: Db,
  fromId: string,
  toId: string,
  text: string,
  extra?: { seen?: boolean; createdAt?: Date },
) {
  const existing = await prisma.directMessage.findFirst({ where: { fromId, toId, text } });
  if (existing) return false;
  await prisma.directMessage.create({
    data: { fromId, toId, text, seen: extra?.seen ?? true, createdAt: extra?.createdAt },
  });
  return true;
}

async function ensureMeeting(
  prisma: Db,
  data: {
    subject: string;
    topic: string;
    time: string;
    offset: number;
    location: string;
    university: string;
    notes: string;
    maxSize: number;
    groupKind: string;
    style: string;
    hostId: string;
    memberIds: string[];
    messages?: { userId: string; text: string }[];
  },
) {
  const existing = data.notes
    ? await prisma.meeting.findFirst({
        where: { hostId: data.hostId, subject: data.subject, notes: data.notes },
      })
    : await prisma.meeting.findFirst({
        where: {
          hostId: data.hostId,
          subject: data.subject,
          topic: data.topic,
          location: data.location,
        },
      });
  if (existing) return false;

  await prisma.meeting.create({
    data: {
      subject: data.subject,
      topic: data.topic,
      time: data.time,
      meetDate: dayOffset(data.offset),
      location: data.location,
      isOnline: inferMeetingOnline(data.location),
      university: data.university,
      notes: data.notes,
      maxSize: data.maxSize,
      groupKind: data.groupKind,
      style: data.style,
      hostId: data.hostId,
      members: { create: [...new Set(data.memberIds)].map((userId) => ({ userId })) },
      messages: data.messages?.length ? { create: data.messages } : undefined,
    },
  });
  return true;
}

export async function seedDemoFill(prisma: Db) {
  const raw = await readFile(path.join(process.cwd(), SNAPSHOT_PATH), "utf8");
  const snapshot = JSON.parse(raw) as AccountSnapshot;
  if (snapshot.version !== 1) throw new Error(`Unsupported snapshot version: ${snapshot.version}`);

  const extras: AccountSnapshot["users"] = [
    {
      email: "tswift.stan@auburn.edu",
      password: "Password1!",
      firstName: "Tay",
      lastName: "Swiftie",
      pronouns: "she/her",
      year: "Junior",
      major: "Music Business",
      university: "Auburn University",
      bio: "It's me hi I'm the problem it's Chemistry 101. Eras tour but make it exam week. All Too Well (10 min version) = my lab report.",
      needHelp: "Chemistry, heartbreak",
      canHelp: "English Comp, memorization",
      examCourse: "",
      examDate: "",
      examTopics: "",
      studyStyle: "",
      isAdmin: false,
      showEmail: false,
      accountNo: null,
    },
  ];
  const users = [
    ...snapshot.users,
    ...extras.filter((u) => !snapshot.users.some((s) => s.email === u.email)),
  ];

  const idByEmail = new Map<string, string>();
  let usersCreated = 0;
  let usersUpdated = 0;

  for (const u of users) {
    const photoKey = await installBundledAvatar(u.email);
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
      ...(photoKey ? { photoKey } : {}),
    };

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      const accountNo =
        existing.accountNo == null ? await takeAccountNo(prisma, u.accountNo) : undefined;
      await prisma.user.update({
        where: { email: u.email },
        data: accountNo != null ? { ...data, accountNo } : data,
      });
      idByEmail.set(u.email, existing.id);
      usersUpdated++;
    } else {
      const row = await prisma.user.create({
        data: {
          email: u.email,
          accountNo: await takeAccountNo(prisma, u.accountNo),
          ...data,
        },
      });
      idByEmail.set(u.email, row.id);
      usersCreated++;
    }
  }

  let friendships = 0;
  for (const f of snapshot.friendships) {
    const fromId = idByEmail.get(f.fromEmail);
    const toId = idByEmail.get(f.toEmail);
    if (!fromId || !toId) continue;
    if (await ensureFriend(prisma, fromId, toId, f.status)) friendships++;
  }
  const taylorId = idByEmail.get("tswift.stan@auburn.edu");
  const jordanFriendId = idByEmail.get("jsmith@auburn.edu");
  const ryanFriendId = idByEmail.get("ryanh@auburn.edu");
  if (taylorId && jordanFriendId && (await ensureFriend(prisma, taylorId, jordanFriendId, "accepted"))) {
    friendships++;
  }
  if (taylorId && ryanFriendId && (await ensureFriend(prisma, taylorId, ryanFriendId, "accepted"))) {
    friendships++;
  }

  const id = (email: string) => idByEmail.get(email);

  const jordan = id("jsmith@auburn.edu");
  const alex = id("alex@auburn.edu");
  const sam = id("sam@auburn.edu");
  const henry = id("henry@auburn.edu");
  const hailey = id("hailey@auburn.edu");
  const ryan = id("ryanh@auburn.edu");
  const aiden = id("aidenb@auburn.edu");
  const bryan = id("bryanm@auburn.edu");
  const daniel = id("danielk@auburn.edu");
  const zuck = id("zuck.meme@auburn.edu");
  const taylor = id("tswift.stan@auburn.edu");
  const elon = id("elon.tusk@auburn.edu");
  const drake = id("drizzy.meme@auburn.edu");
  const abe = id("abe.honest@auburn.edu");
  const duo = id("duo.lingo@auburn.edu");
  const mrBeast = id("mr.beast.meme@auburn.edu");
  const gordon = id("gordon.ramsay.meme@auburn.edu");
  const chatgpt = id("chatgpt.meme@auburn.edu");
  const walter = id("walter.white.meme@auburn.edu");

  let meetingsCreated = 0;

  if (alex && sam && jordan) {
    if (
      await ensureMeeting(prisma, {
        subject: "Calc 2",
        topic: "U-sub, Polar, Vectors",
        time: "6:00 PM",
        offset: 0,
        location: "CULC, 2nd floor study pods",
        university: "Georgia Institute of Technology-Main Campus",
        notes: "Bring a calculator. We’ll work from the practice midterm PDF.",
        maxSize: 7,
        groupKind: "small",
        style: "Exam review",
        hostId: alex,
        memberIds: [alex, sam, jordan],
        messages: [
          { userId: alex, text: "Yo guys, meeting time is 6:00pm at Tech" },
          { userId: sam, text: "Driving up from Tuscaloosa lol" },
          { userId: jordan, text: "Auburn squad rolling too" },
        ],
      })
    ) {
      meetingsCreated++;
    }
  }

  if (ryan && aiden && bryan && daniel) {
    const teamMeetings = [
      {
        host: ryan,
        subject: "Calc 2",
        topic: "Integration techniques & polar coords",
        time: "7:00 PM",
        offset: 1,
        location: "RBD Library, 3rd floor",
        notes: "Dev crew exam prep — whiteboard room if we can grab it.",
        style: "Exam review",
        memberIds: [ryan, aiden, bryan, daniel],
        messages: [
          { userId: ryan, text: "Who's bringing the practice exam?" },
          { userId: daniel, text: "I'll print copies" },
          { userId: bryan, text: "Snagging room 302" },
        ],
      },
      {
        host: aiden,
        subject: "Data Structures",
        topic: "Trees, heaps & Big-O review",
        time: "5:30 PM",
        offset: 2,
        location: "Shelby Center lobby",
        notes: "Walk through past exam problems. Laptop required.",
        style: "Practice problems",
        memberIds: [aiden, ryan, daniel],
        messages: [
          { userId: aiden, text: "Posted this for the team — join if you're free" },
          { userId: ryan, text: "in" },
        ],
      },
      {
        host: bryan,
        subject: "Software Engineering",
        topic: "Design patterns & sprint planning",
        time: "4:00 PM",
        offset: 0,
        location: "Student Center, room B",
        notes: "SE midterm review + mock standup for our project.",
        style: "Discussion",
        memberIds: [bryan, ryan, aiden],
        messages: [
          { userId: bryan, text: "Need a fourth for the group project demo run-through" },
          { userId: aiden, text: "Daniel said he's coming after lab" },
        ],
      },
      {
        host: daniel,
        subject: "Discrete Math",
        topic: "Proofs, sets & induction",
        time: "8:00 PM",
        offset: 3,
        location: "RBD Library, group study",
        notes: "Induction proofs are killing me — let's work through the homework together.",
        style: "Homework help",
        memberIds: [daniel, aiden, bryan],
        messages: [
          { userId: daniel, text: "Anyone else stuck on problem 4?" },
          { userId: bryan, text: "Yeah I'll be there" },
        ],
      },
    ];
    for (const m of teamMeetings) {
      if (
        await ensureMeeting(prisma, {
          ...m,
          university: "Auburn University",
          maxSize: 8,
          groupKind: "small",
          hostId: m.host,
        })
      ) {
        meetingsCreated++;
      }
    }
  }

  if (henry) {
    if (
      await ensureMeeting(prisma, {
        subject: "Physics 1",
        topic: "Kinematics & forces",
        time: "3:00 PM",
        offset: 1,
        location: "Main Library, west wing",
        university: "University of Georgia",
        notes: "UGA physics study group — open to anyone nearby.",
        maxSize: 6,
        groupKind: "small",
        style: "Concept review",
        hostId: henry,
        memberIds: [henry],
        messages: [{ userId: henry, text: "Looking for a study partner before the quiz" }],
      })
    ) {
      meetingsCreated++;
    }
  }

  if (hailey && jordan) {
    if (
      await ensureMeeting(prisma, {
        subject: "Calc 2",
        topic: "Series & sequences",
        time: "2:00 PM",
        offset: 2,
        location: "Cooper Library",
        university: "Clemson University",
        notes: "Clemson calc crew — bring notes from lecture.",
        maxSize: 5,
        groupKind: "small",
        style: "Exam review",
        hostId: hailey,
        memberIds: [hailey, jordan],
        messages: [
          { userId: hailey, text: "Series convergence is rough this week" },
          { userId: jordan, text: "I'll drive up from Auburn if there's room" },
        ],
      })
    ) {
      meetingsCreated++;
    }
  }

  const hosts = [jordan, alex, sam].filter(Boolean) as string[];
  if (hosts.length) {
    for (let i = 0; i < EXTRA.length; i++) {
      const [subject, topic, time, location, offset] = EXTRA[i];
      const host = hosts[i % hosts.length];
      const memberIds = i % 4 === 0 && jordan && host !== jordan ? [host, jordan] : [host];
      const sizeRoll = i % 5;
      const maxSize = sizeRoll === 0 ? 2 : sizeRoll === 1 ? 4 : sizeRoll === 2 ? 6 : sizeRoll === 3 ? 8 : 12;
      const groupKind = maxSize <= 2 ? "partner" : maxSize <= 7 ? "small" : "big";
      if (
        await ensureMeeting(prisma, {
          subject,
          topic,
          time,
          offset,
          location,
          university: HOST_UNIS[i % HOST_UNIS.length],
          notes: "",
          maxSize,
          groupKind,
          style: STYLES[i % STYLES.length],
          hostId: host,
          memberIds,
        })
      ) {
        meetingsCreated++;
      }
    }
  }

  const memeMeetups = await seedMemeMeetups(prisma);
  meetingsCreated += memeMeetups.created;

  const meetings = await prisma.meeting.findMany({ select: { id: true, location: true, isOnline: true } });
  for (const meeting of meetings) {
    const isOnline = inferMeetingOnline(meeting.location);
    if (meeting.isOnline !== isOnline) {
      await prisma.meeting.update({ where: { id: meeting.id }, data: { isOnline } });
    }
  }

  const ago = (mins: number) => new Date(Date.now() - mins * 60 * 1000);
  let dms = 0;
  const dmSpecs: Array<[string | undefined, string | undefined, string, { seen?: boolean; createdAt?: Date }?]> = [
    [ryan, bryan, "Library at 7? Calc 2 grind", { createdAt: ago(30) }],
    [aiden, daniel, "Did you finish the DS homework?", { createdAt: ago(45) }],
    [bryan, ryan, "Yeah I'll grab the whiteboard room", { createdAt: ago(20) }],
    [daniel, aiden, "Almost — meet at the group I posted?", { createdAt: ago(10) }],
    [alex, jordan, "Hey!", { createdAt: ago(24) }],
    [henry, jordan, "We're so cooked 😭", { createdAt: ago(5 * 60) }],
    [hailey, jordan, "Can you share the Quizlet?", { createdAt: ago(2 * 24 * 60) }],
    [zuck, jordan, "Hello fellow students. I am normal. Join my metaverse study pod?", { createdAt: ago(90) }],
    [taylor, jordan, "bestie are we still on for the chem grind tonight 💅", { createdAt: ago(45) }],
    [elon, jordan, "Thinking about acquiring your flashcards. Thoughts?", { seen: false, createdAt: ago(180) }],
    [abe, jordan, "Four score and seven problems. Meet at the library?", { createdAt: ago(300) }],
    [duo, jordan, "👀 You forgot your Spanish streak. I'm outside.", { seen: false, createdAt: ago(15) }],
    [mrBeast, jordan, "I'm giving $1000 to whoever joins my 24-hour library livestream study session", { createdAt: ago(60) }],
    [gordon, jordan, "Your last lab report was an IDIOT SANDWICH. Fix it and meet me at 6.", { seen: false, createdAt: ago(120) }],
    [
      chatgpt,
      jordan,
      "Hello! I'd be happy to help explain u-substitution. As an AI language model— wait I'm a student now. Anyway want to grind Calc 2?",
      { createdAt: ago(200) },
    ],
    [walter, jordan, "Jesse. We need to cook… up a study plan for Chem.", { createdAt: ago(400) }],
    [jordan, ryan, "Yo Ryan — Calc 2 study tonight?", { seen: false }],
    [ryan, jordan, "Yeah RBD at 7 works"],
    [alex, ryan, "Got extra practice exam PDFs if you want them"],
    [zuck, ryan, "Join my metaverse study pod?", { seen: false }],
    [taylor, ryan, "bestie are we still on for the chem grind 💅", { seen: false }],
    [duo, ryan, "👀 You forgot your streak. Study now.", { seen: false }],
  ];
  for (const [fromId, toId, text, extra] of dmSpecs) {
    if (!fromId || !toId) continue;
    if (await ensureDm(prisma, fromId, toId, text, extra)) dms++;
  }

  const missing = await prisma.user.findMany({
    where: { accountNo: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (missing.length) {
    let next = (await prisma.user.aggregate({ _max: { accountNo: true } }))._max.accountNo ?? 0;
    for (const user of missing) {
      next += 1;
      await prisma.user.update({ where: { id: user.id }, data: { accountNo: next } });
    }
  }

  const userCount = await prisma.user.count();
  const meetingCount = await prisma.meeting.count();
  const friendCount = await prisma.friendship.count();
  const dmCount = await prisma.directMessage.count();

  return {
    usersCreated,
    usersUpdated,
    friendships,
    meetingsCreated,
    memeMeetups: memeMeetups.created,
    dms,
    totals: { users: userCount, meetings: meetingCount, friendships: friendCount, dms: dmCount },
  };
}

function isDirectRun() {
  const argv = process.argv[1] || "";
  return argv.replace(/\\/g, "/").includes("seed-demo-fill");
}

function isPostgresUrl(raw: string) {
  return /^(postgres|postgresql):/i.test(raw);
}

async function main() {
  const url = process.env.DATABASE_URL || "";
  if (!isPostgresUrl(url) && !process.env.VERCEL) {
    console.error("Refusing to fill demo data against a non-Postgres DATABASE_URL (protects local sqlite).");
    process.exit(1);
  }

  const prisma = createPrisma();
  try {
    const before = {
      users: await prisma.user.count(),
      meetings: await prisma.meeting.count(),
    };
    console.log(`demo-fill start: ${before.users} users, ${before.meetings} meetings`);
    const stats = await seedDemoFill(prisma);
    console.log("demo-fill done", JSON.stringify(stats));
    console.log("logins: ryanh@auburn.edu / RyanH · aidenb / AidenB · bryanm / BryanM · danielk / DanielK");
    console.log("meme + extra accounts: Password1!");
  } finally {
    await prisma.$disconnect();
  }
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
