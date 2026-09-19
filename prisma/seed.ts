import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function hash(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

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

async function main() {
  await prisma.friendship.deleteMany();
  await prisma.message.deleteMany();
  await prisma.member.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();

  const jordan = await prisma.user.create({
    data: {
      email: "jsmith@auburn.edu",
      password: hash("Password1!"),
      firstName: "Jordan",
      lastName: "Taylor",
      pronouns: "they/them",
      year: "Sophomore",
      major: "Computer Science",
      university: "Auburn University",
      bio: "Sophomore CS. I like whiteboard sessions and late library nights — usually grinding calc or discrete.",
      needHelp: "Calc 2, Physics 1",
      canHelp: "Intro to Programming, Discrete Math",
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: "alex@auburn.edu",
      password: hash("Password1!"),
      firstName: "Alex",
      lastName: "Nguyen",
      pronouns: "he/him",
      year: "Junior",
      major: "Software Engineering",
      university: "Auburn University",
      bio: "SE junior. I host exam reviews and I'm always down to walk through practice problems.",
      needHelp: "Data Structures",
      canHelp: "Calc 2, Linear Algebra",
    },
  });

  const sam = await prisma.user.create({
    data: {
      email: "sam@auburn.edu",
      password: hash("Password1!"),
      firstName: "Sam",
      lastName: "Rivera",
      pronouns: "she/her",
      year: "Freshman",
      major: "Computer Science",
      university: "Auburn University",
      bio: "First year still figuring campus out. Looking for a regular calc buddy so I don't cram alone.",
      needHelp: "Calc 2",
      canHelp: "College Algebra",
    },
  });

  const hosts = [jordan, alex, sam];

  await prisma.friendship.create({
    data: { fromId: jordan.id, toId: alex.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: sam.id, toId: jordan.id, status: "pending" },
  });

  await prisma.meeting.create({
    data: {
      subject: "Calc 2",
      topic: "U-sub, Polar, Vectors",
      time: "6:00 PM",
      meetDate: dayOffset(0),
      location: "Student Center",
      university: "Auburn University",
      notes: "Bring a calculator. We’ll work from the practice midterm PDF.",
      maxSize: 7,
      groupKind: "small",
      style: "Exam review",
      hostId: alex.id,
      members: {
        create: [{ userId: alex.id }, { userId: sam.id }, { userId: jordan.id }],
      },
      messages: {
        create: [
          { userId: alex.id, text: "Yo guys, meeting time is 6:00pm" },
          { userId: sam.id, text: "???" },
          { userId: jordan.id, text: "lol bet" },
        ],
      },
    },
  });

  const styles = [
    "Practice problems",
    "Lecture / teach-back",
    "Exam review",
    "Homework help",
    "Concept review",
    "Lab prep",
    "Discussion",
    "Mixed",
  ];

  for (let i = 0; i < EXTRA.length; i++) {
    const [subject, topic, time, location, offset] = EXTRA[i];
    const host = hosts[i % hosts.length];
    const members =
      i % 4 === 0 && host.id !== jordan.id
        ? { create: [{ userId: host.id }, { userId: jordan.id }] }
        : { create: [{ userId: host.id }] };

    const sizeRoll = i % 5;
    const maxSize = sizeRoll === 0 ? 2 : sizeRoll === 1 ? 4 : sizeRoll === 2 ? 6 : sizeRoll === 3 ? 8 : 12;
    const groupKind = maxSize <= 2 ? "partner" : maxSize <= 7 ? "small" : "big";

    await prisma.meeting.create({
      data: {
        subject,
        topic,
        time,
        meetDate: dayOffset(offset),
        location,
        university: "Auburn University",
        maxSize,
        groupKind,
        style: styles[i % styles.length],
        hostId: host.id,
        members,
      },
    });
  }

  console.log("seeded. login: jsmith@auburn.edu / Password1!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
