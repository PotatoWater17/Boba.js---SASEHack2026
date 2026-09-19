/**
 * Non-destructive patch: spread demo users across schools, keep devs at Auburn,
 * and seed dev-team meetings + cross-school meetups if missing.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function dayOffset(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DEMO_UNIS: Record<string, string> = {
  "jsmith@auburn.edu": "Auburn University",
  "alex@auburn.edu": "Georgia Institute of Technology-Main Campus",
  "sam@auburn.edu": "The University of Alabama",
  "henry@auburn.edu": "University of Georgia",
  "hailey@auburn.edu": "Clemson University",
};

const DEV_EMAILS = ["ryanh@auburn.edu", "aidenb@auburn.edu", "bryanm@auburn.edu", "danielk@auburn.edu"];

async function ensureMeeting(
  hostId: string,
  subject: string,
  notes: string,
  data: {
    topic: string;
    time: string;
    offset: number;
    location: string;
    university: string;
    style: string;
    memberIds: string[];
    messages?: { userId: string; text: string }[];
  },
) {
  const existing = await prisma.meeting.findFirst({
    where: { hostId, subject, notes },
  });
  if (existing) return existing;

  return prisma.meeting.create({
    data: {
      subject,
      topic: data.topic,
      time: data.time,
      meetDate: dayOffset(data.offset),
      location: data.location,
      university: data.university,
      notes,
      maxSize: 8,
      groupKind: "small",
      style: data.style,
      hostId,
      members: { create: data.memberIds.map((userId) => ({ userId })) },
      messages: data.messages?.length ? { create: data.messages } : undefined,
    },
  });
}

async function ensureDm(fromId: string, toId: string, text: string) {
  const existing = await prisma.directMessage.findFirst({
    where: { fromId, toId, text },
  });
  if (existing) return;
  await prisma.directMessage.create({ data: { fromId, toId, text } });
}

async function main() {
  for (const [email, university] of Object.entries(DEMO_UNIS)) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      await prisma.user.update({ where: { email }, data: { university } });
      console.log(`  ${email} → ${university}`);
    }
  }

  for (const email of DEV_EMAILS) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u && u.university !== "Auburn University") {
      await prisma.user.update({ where: { email }, data: { university: "Auburn University" } });
    }
  }

  const byEmail = async (email: string) => {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) throw new Error(`Missing user: ${email}`);
    return u;
  };

  const ryan = await byEmail("ryanh@auburn.edu");
  const aiden = await byEmail("aidenb@auburn.edu");
  const bryan = await byEmail("bryanm@auburn.edu");
  const daniel = await byEmail("danielk@auburn.edu");
  const jordan = await prisma.user.findUnique({ where: { email: "jsmith@auburn.edu" } });
  const alex = await prisma.user.findUnique({ where: { email: "alex@auburn.edu" } });
  const henry = await prisma.user.findUnique({ where: { email: "henry@auburn.edu" } });
  const hailey = await prisma.user.findUnique({ where: { email: "hailey@auburn.edu" } });

  if (alex) {
    await prisma.meeting.updateMany({
      where: { hostId: alex.id, subject: "Calc 2" },
      data: {
        university: "Georgia Institute of Technology-Main Campus",
        location: "CULC, 2nd floor study pods",
      },
    });
  }

  await ensureMeeting(ryan.id, "Calc 2", "Dev crew exam prep — whiteboard room if we can grab it.", {
    topic: "Integration techniques & polar coords",
    time: "7:00 PM",
    offset: 1,
    location: "RBD Library, 3rd floor",
    university: "Auburn University",
    style: "Exam review",
    memberIds: [ryan.id, aiden.id, bryan.id, daniel.id],
    messages: [
      { userId: ryan.id, text: "Who's bringing the practice exam?" },
      { userId: daniel.id, text: "I'll print copies" },
    ],
  });

  await ensureMeeting(aiden.id, "Data Structures", "Walk through past exam problems. Laptop required.", {
    topic: "Trees, heaps & Big-O review",
    time: "5:30 PM",
    offset: 2,
    location: "Shelby Center lobby",
    university: "Auburn University",
    style: "Practice problems",
    memberIds: [aiden.id, ryan.id, daniel.id],
    messages: [{ userId: aiden.id, text: "Posted this for the team — join if you're free" }],
  });

  await ensureMeeting(bryan.id, "Software Engineering", "SE midterm review + mock standup for our project.", {
    topic: "Design patterns & sprint planning",
    time: "4:00 PM",
    offset: 0,
    location: "Student Center, room B",
    university: "Auburn University",
    style: "Discussion",
    memberIds: [bryan.id, ryan.id, aiden.id],
    messages: [{ userId: bryan.id, text: "Need a fourth for the group project demo run-through" }],
  });

  await ensureMeeting(
    daniel.id,
    "Discrete Math",
    "Induction proofs are killing me — let's work through the homework together.",
    {
      topic: "Proofs, sets & induction",
      time: "8:00 PM",
      offset: 3,
      location: "RBD Library, group study",
      university: "Auburn University",
      style: "Homework help",
      memberIds: [daniel.id, aiden.id, bryan.id],
      messages: [{ userId: daniel.id, text: "Anyone else stuck on problem 4?" }],
    },
  );

  if (henry) {
    await ensureMeeting(henry.id, "Physics 1", "UGA physics study group — open to anyone nearby.", {
      topic: "Kinematics & forces",
      time: "3:00 PM",
      offset: 1,
      location: "Main Library, west wing",
      university: "University of Georgia",
      style: "Concept review",
      memberIds: [henry.id],
      messages: [{ userId: henry.id, text: "Looking for a study partner before the quiz" }],
    });
  }

  if (hailey && jordan) {
    await ensureMeeting(hailey.id, "Calc 2", "Clemson calc crew — bring notes from lecture.", {
      topic: "Series & sequences",
      time: "2:00 PM",
      offset: 2,
      location: "Cooper Library",
      university: "Clemson University",
      style: "Exam review",
      memberIds: [hailey.id, jordan.id],
      messages: [{ userId: hailey.id, text: "Series convergence is rough this week" }],
    });
  }

  await ensureDm(ryan.id, bryan.id, "Library at 7? Calc 2 grind");
  await ensureDm(aiden.id, daniel.id, "Did you finish the DS homework?");
  await ensureDm(bryan.id, ryan.id, "Yeah I'll grab the whiteboard room");
  await ensureDm(daniel.id, aiden.id, "Almost — meet at the group I posted?");

  console.log("Demo world patched (universities + dev meetups).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
