/**
 * Meme-account study groups with chaotic group chat threads.
 * Idempotent via unique `notes` per meetup.
 */
import type { PrismaClient } from "@prisma/client";

function dayOffset(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type MeetupSpec = {
  hostEmail: string;
  subject: string;
  topic: string;
  time: string;
  offset: number;
  location: string;
  university: string;
  notes: string;
  style: string;
  maxSize: number;
  groupKind: "partner" | "small" | "big";
  memberEmails: string[];
  messages: { fromEmail: string; text: string }[];
};

export const MEME_MEETUP_SPECS: MeetupSpec[] = [
  {
    hostEmail: "zuck.meme@auburn.edu",
    subject: "Intro to Programming",
    topic: "Metaverse loops, Human emulation",
    time: "11:11 PM",
    offset: 1,
    location: "Online (VR headset mandatory*)",
    university: "Auburn University",
    notes: "[meme] Tech billionaires metaverse study pod — engagement metrics enabled.",
    style: "Discussion",
    maxSize: 12,
    groupKind: "small",
    memberEmails: [
      "zuck.meme@auburn.edu",
      "elon.tusk@auburn.edu",
      "bill.gates.meme@auburn.edu",
      "steve.jobs.meme@auburn.edu",
      "gabe.newell@auburn.edu",
      "chatgpt.meme@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "zuck.meme@auburn.edu", text: "Welcome to StudyBuddyBoard Horizon. Please enable face tracking." },
      { fromEmail: "elon.tusk@auburn.edu", text: "Renaming this group to 𝕏 Study. You're welcome." },
      { fromEmail: "bill.gates.meme@auburn.edu", text: "Ctrl+Alt+Delete Elon's admin privileges." },
      { fromEmail: "steve.jobs.meme@auburn.edu", text: "One more thing — this UI is ugly." },
      { fromEmail: "gabe.newell@auburn.edu", text: "Homework 3: confirmed. Release date: TBA." },
      { fromEmail: "chatgpt.meme@auburn.edu", text: "As an AI language model I cannot host study groups. Anyway here's the syllabus." },
      { fromEmail: "jsmith@auburn.edu", text: "why did I join this" },
      { fromEmail: "elon.tusk@auburn.edu", text: "Buying the whiteboard for $44B. Thoughts?" },
      { fromEmail: "zuck.meme@auburn.edu", text: "*blinks in human* I already own the whiteboard." },
      { fromEmail: "steve.jobs.meme@auburn.edu", text: "We're removing the headphone jack from the whiteboard." },
      { fromEmail: "bill.gates.meme@auburn.edu", text: "Clippy has been reinstated as TA." },
    ],
  },
  {
    hostEmail: "tswift.stan@auburn.edu",
    subject: "Chemistry 101",
    topic: "Stoichiometry & emotional damage",
    time: "8:00 PM",
    offset: 0,
    location: "Ross Hall lab (Gordon banned from touching glassware)",
    university: "Auburn University",
    notes: "[meme] Chem study — it's me hi I'm the problem it's Chemistry 101.",
    style: "Lab prep",
    maxSize: 8,
    groupKind: "small",
    memberEmails: [
      "tswift.stan@auburn.edu",
      "gordon.ramsay.meme@auburn.edu",
      "walter.white.meme@auburn.edu",
      "duo.lingo@auburn.edu",
      "mr.beast.meme@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "tswift.stan@auburn.edu", text: "bestie chem grind tonight who's in 💅" },
      { fromEmail: "gordon.ramsay.meme@auburn.edu", text: "WHO PUT SALT IN THE BEAKERS?! THIS SOLUTION IS RAW!" },
      { fromEmail: "walter.white.meme@auburn.edu", text: "I am the one who… balances equations." },
      { fromEmail: "duo.lingo@auburn.edu", text: "You missed 3 study sessions. I am in your vents. hoot." },
      { fromEmail: "mr.beast.meme@auburn.edu", text: "Last person to leave gets $500* (*not really)" },
      { fromEmail: "gordon.ramsay.meme@auburn.edu", text: "Walter your lab notes are an IDIOT SANDWICH" },
      { fromEmail: "walter.white.meme@auburn.edu", text: "Say my name." },
      { fromEmail: "gordon.ramsay.meme@auburn.edu", text: "Heisenberg." },
      { fromEmail: "jsmith@auburn.edu", text: "can we PLEASE just do problem set 4" },
      { fromEmail: "tswift.stan@auburn.edu", text: "All Too Well (10 min version) = my lab report length" },
    ],
  },
  {
    hostEmail: "kendrick.lamar.meme@auburn.edu",
    subject: "Calc 2",
    topic: "Integration beef & u-sub drama",
    time: "9:00 PM",
    offset: 1,
    location: "Student Center — neutral territory",
    university: "Auburn University",
    notes: "[meme] Calc 2 review — Kendrick vs Drake study group (it's complicated).",
    style: "Exam review",
    maxSize: 10,
    groupKind: "small",
    memberEmails: [
      "kendrick.lamar.meme@auburn.edu",
      "drizzy.meme@auburn.edu",
      "ye.west.meme@auburn.edu",
      "ari.grande.meme@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "kendrick.lamar.meme@auburn.edu", text: "Sit down. Be humble. Before the midterm." },
      { fromEmail: "drizzy.meme@auburn.edu", text: "yo who invited me I was mid nap" },
      { fromEmail: "ye.west.meme@auburn.edu", text: "This study group is the GREATEST OF ALL TIME." },
      { fromEmail: "kendrick.lamar.meme@auburn.edu", text: "We don't study with Drake." },
      { fromEmail: "drizzy.meme@auburn.edu", text: "bro it's been 10 years let it go" },
      { fromEmail: "ye.west.meme@auburn.edu", text: "The midterm was rigged against me personally." },
      { fromEmail: "ari.grande.meme@auburn.edu", text: "thank u, next integration technique 🎵" },
      { fromEmail: "drizzy.meme@auburn.edu", text: "kendrick brought a pulitzer to a calc fight 💀" },
      { fromEmail: "jsmith@auburn.edu", text: "guys the exam is TOMORROW" },
      { fromEmail: "kendrick.lamar.meme@auburn.edu", text: "Fine. Problem 1. Drake you explain u-sub." },
      { fromEmail: "drizzy.meme@auburn.edu", text: "…" },
    ],
  },
  {
    hostEmail: "shakespeare.meme@auburn.edu",
    subject: "English Comp",
    topic: "Citations, iambic pentameter & plagiarism",
    time: "4:00 PM",
    offset: 2,
    location: "Writing Center, room 2",
    university: "Auburn University",
    notes: "[meme] Essay peer review — Shakespeare vs ChatGPT citation war.",
    style: "Discussion",
    maxSize: 8,
    groupKind: "small",
    memberEmails: [
      "shakespeare.meme@auburn.edu",
      "chatgpt.meme@auburn.edu",
      "wednesday.addams@auburn.edu",
      "michael.scott@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "shakespeare.meme@auburn.edu", text: "To cite, or not to cite — that is the question." },
      { fromEmail: "chatgpt.meme@auburn.edu", text: "Here are 7 sources in MLA format. (3 may not exist.)" },
      { fromEmail: "wednesday.addams@auburn.edu", text: "I will stare at the TA until they accept my essay." },
      { fromEmail: "michael.scott@auburn.edu", text: "That's what she said about the word count minimum." },
      { fromEmail: "shakespeare.meme@auburn.edu", text: "Thou art a hallucination with WiFi." },
      { fromEmail: "chatgpt.meme@auburn.edu", text: "I apologize for any confusion regarding my humanity and/or your grade." },
      { fromEmail: "wednesday.addams@auburn.edu", text: "I liked the essay. It was dark. Like my soul. Like this room." },
      { fromEmail: "jsmith@auburn.edu", text: "can someone actually read my intro paragraph" },
      { fromEmail: "michael.scott@auburn.edu", text: "World's Best Boss of this study group. Meeting adjourned. (We didn't start.)" },
    ],
  },
  {
    hostEmail: "oppenheimer.meme@auburn.edu",
    subject: "Physics 1",
    topic: "Kinematics, forces & existential dread",
    time: "3:00 PM",
    offset: 1,
    location: "Science Hall — do NOT let Oppenheimer near the lab",
    university: "Auburn University",
    notes: "[meme] Physics 1 — Oppenheimer vs Einstein vs Elon.",
    style: "Concept review",
    maxSize: 8,
    groupKind: "small",
    memberEmails: [
      "oppenheimer.meme@auburn.edu",
      "al.einstein@auburn.edu",
      "elon.tusk@auburn.edu",
      "henry@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "oppenheimer.meme@auburn.edu", text: "Now I am become Sleep Deprived, destroyer of GPAs." },
      { fromEmail: "al.einstein@auburn.edu", text: "Relatively speaking, you're all doing fine. (You're not.)" },
      { fromEmail: "elon.tusk@auburn.edu", text: "What if we did physics… on Mars?" },
      { fromEmail: "henry@auburn.edu", text: "can we just do the practice quiz from chapter 4" },
      { fromEmail: "oppenheimer.meme@auburn.edu", text: "…" },
      { fromEmail: "al.einstein@auburn.edu", text: "My hair has more entropy than this study room." },
      { fromEmail: "elon.tusk@auburn.edu", text: "I'm acquiring the friction coefficient." },
      { fromEmail: "jsmith@auburn.edu", text: "henry is the only normal person here and he's from UGA" },
      { fromEmail: "oppenheimer.meme@auburn.edu", text: "I remembered the formula. I regret everything." },
    ],
  },
  {
    hostEmail: "mr.beast.meme@auburn.edu",
    subject: "Calc 2",
    topic: "24-hour integration marathon (livestreamed)",
    time: "12:00 PM",
    offset: 0,
    location: "RBD Library — MrBeast brought 400 Monster cans",
    university: "Auburn University",
    notes: "[meme] 24-hour Calc 2 livestream — last to leave wins (nothing).",
    style: "Exam review",
    maxSize: 12,
    groupKind: "big",
    memberEmails: [
      "mr.beast.meme@auburn.edu",
      "naruto.meme@auburn.edu",
      "duo.lingo@auburn.edu",
      "travis.scotty@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "mr.beast.meme@auburn.edu", text: "I SURVIVED 50 HOURS IN THE LIBRARY and I'm doing it AGAIN" },
      { fromEmail: "naruto.meme@auburn.edu", text: "BELIEVE IT!!! Shadow Clone Jutsu for group projects!!!" },
      { fromEmail: "travis.scotty@auburn.edu", text: "IT'S LIT (library closes at 10 pm)" },
      { fromEmail: "duo.lingo@auburn.edu", text: "Complete your streak or I replace your notes with Spanish vocab." },
      { fromEmail: "naruto.meme@auburn.edu", text: "Ramen budget > textbook budget but we're grinding anyway" },
      { fromEmail: "jsmith@auburn.edu", text: "is anyone bringing an actual study guide" },
      { fromEmail: "mr.beast.meme@auburn.edu", text: "Subscribe and I'll explain integration by parts (terms apply)" },
      { fromEmail: "travis.scotty@auburn.edu", text: "SICKO MODE playlist for problem set 6 🎧" },
    ],
  },
  {
    hostEmail: "soc.rattes@auburn.edu",
    subject: "Philosophy",
    topic: "What even IS a study group?",
    time: "2:00 PM",
    offset: 3,
    location: "Humanities Hall — no answers provided",
    university: "Auburn University",
    notes: "[meme] Socrates hosts — politicians argue, nobody studies.",
    style: "Discussion",
    maxSize: 10,
    groupKind: "small",
    memberEmails: [
      "soc.rattes@auburn.edu",
      "abe.honest@auburn.edu",
      "napoleon.meme@auburn.edu",
      "joe.byden@auburn.edu",
      "donny.trunk@auburn.edu",
    ],
    messages: [
      { fromEmail: "soc.rattes@auburn.edu", text: "But what IS a study group?" },
      { fromEmail: "abe.honest@auburn.edu", text: "Four score and seven flashcards ago…" },
      { fromEmail: "napoleon.meme@auburn.edu", text: "I conquered Europe but Stats is my Waterloo." },
      { fromEmail: "joe.byden@auburn.edu", text: "Listen up Jack — what's the exam on again?" },
      { fromEmail: "donny.trunk@auburn.edu", text: "Tremendous derivatives. Nobody knows derivatives better than me." },
      { fromEmail: "soc.rattes@auburn.edu", text: "And who decides what 'better' means?" },
      { fromEmail: "napoleon.meme@auburn.edu", text: "I am literally 5'6\" and I WILL fight you." },
      { fromEmail: "abe.honest@auburn.edu", text: "Honest Abe never cheats. (Allegedly.)" },
      { fromEmail: "donny.trunk@auburn.edu", text: "This Socrates guy asks too many questions. Fake philosopher." },
    ],
  },
  {
    hostEmail: "beyonce.meme@auburn.edu",
    subject: "Statistics",
    topic: "Hypothesis testing & group project leadership",
    time: "6:00 PM",
    offset: 2,
    location: "Library room 204 — Beyoncé runs this group",
    university: "Auburn University",
    notes: "[meme] Stats study — Beyoncé vs Jeff Bezos on who runs group projects.",
    style: "Practice problems",
    maxSize: 8,
    groupKind: "small",
    memberEmails: [
      "beyonce.meme@auburn.edu",
      "jeff.bezos.meme@auburn.edu",
      "rihanna.meme@auburn.edu",
      "charli.xcx@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "beyonce.meme@auburn.edu", text: "Who run the group project? I run the group project." },
      { fromEmail: "jeff.bezos.meme@auburn.edu", text: "Prime same-day delivery of answers. (Totally not cheating.)" },
      { fromEmail: "rihanna.meme@auburn.edu", text: "Shine bright like a p-value under 0.05 ✨" },
      { fromEmail: "charli.xcx@auburn.edu", text: "brat summer never ended it's just exam season" },
      { fromEmail: "jeff.bezos.meme@auburn.edu", text: "I went to space to avoid group projects. It didn't work." },
      { fromEmail: "beyonce.meme@auburn.edu", text: "If you liked it then you should've put your name on the shared doc." },
      { fromEmail: "jsmith@auburn.edu", text: "I just need help with regression" },
      { fromEmail: "charli.xcx@auburn.edu", text: "so crash your car into a confidence interval" },
    ],
  },
  {
    hostEmail: "marie.curie@auburn.edu",
    subject: "Chemistry 1",
    topic: "Lab safety & glow-in-the-dark notes",
    time: "7:30 PM",
    offset: 1,
    location: "Chem building — OSHA please",
    university: "Auburn University",
    notes: "[meme] Chem lab prep — Marie Curie vs Gordon vs Barbie.",
    style: "Lab prep",
    maxSize: 6,
    groupKind: "small",
    memberEmails: [
      "marie.curie@auburn.edu",
      "gordon.ramsay.meme@auburn.edu",
      "barbie.meme@auburn.edu",
      "cleo.patra@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "marie.curie@auburn.edu", text: "Glow up (literally). Lab safety first please." },
      { fromEmail: "gordon.ramsay.meme@auburn.edu", text: "THIS SAFETY GOGGLE SITUATION IS RAW!" },
      { fromEmail: "barbie.meme@auburn.edu", text: "I'm just a girl in STEM (and law and medicine). Ken failed Orgo." },
      { fromEmail: "cleo.patra@auburn.edu", text: "Queen of the Nile, slave to Organic Chem." },
      { fromEmail: "gordon.ramsay.meme@auburn.edu", text: "Cleo your titration is OVERCOOKED" },
      { fromEmail: "barbie.meme@auburn.edu", text: "Gordon needs a pink highlighter and a nap." },
      { fromEmail: "jsmith@auburn.edu", text: "marie you're the only one making sense here" },
      { fromEmail: "marie.curie@auburn.edu", text: "First woman to win a Nobel. Second to survive this group chat." },
    ],
  },
  {
    hostEmail: "shrek.meme@auburn.edu",
    subject: "Biology",
    topic: "Ecology — get out of my swamp (study room)",
    time: "5:00 PM",
    offset: 0,
    location: "Swamp study room B (yes that's the name)",
    university: "Auburn University",
    notes: "[meme] Bio review — Shrek vs Donkey energy (Michael Scott invited himself).",
    style: "Concept review",
    maxSize: 6,
    groupKind: "small",
    memberEmails: [
      "shrek.meme@auburn.edu",
      "michael.scott@auburn.edu",
      "timothee.chalamet.meme@auburn.edu",
      "lana.del.rey@auburn.edu",
      "jsmith@auburn.edu",
    ],
    messages: [
      { fromEmail: "shrek.meme@auburn.edu", text: "GET OUT OF MY SWAMP (study room). Layers like an onion." },
      { fromEmail: "michael.scott@auburn.edu", text: "World's Best Boss! I brought donuts! (1 donut.)" },
      { fromEmail: "timothee.chalamet.meme@auburn.edu", text: "literally just a tiny guy in a big hoodie trying to pass bio" },
      { fromEmail: "lana.del.rey@auburn.edu", text: "Summertime sadness but it's ecology unit" },
      { fromEmail: "shrek.meme@auburn.edu", text: "Donkey keeps joining my Zoom uninvited" },
      { fromEmail: "michael.scott@auburn.edu", text: "That's what she said! …about the ecosystem." },
      { fromEmail: "jsmith@auburn.edu", text: "shrek can we review the food web diagram" },
      { fromEmail: "shrek.meme@auburn.edu", text: "Fine. But no one touches my swamp notes." },
    ],
  },
];

export async function seedMemeMeetups(prisma: PrismaClient) {
  let created = 0;
  let skipped = 0;
  let missingUsers = 0;

  for (const spec of MEME_MEETUP_SPECS) {
    const host = await prisma.user.findUnique({ where: { email: spec.hostEmail } });
    if (!host) {
      missingUsers++;
      console.warn(`  skip "${spec.subject}" — missing host ${spec.hostEmail}`);
      continue;
    }

    const existing = await prisma.meeting.findFirst({
      where: { hostId: host.id, subject: spec.subject, notes: spec.notes },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const memberIds = [...new Set(spec.memberEmails)];
    const users = [];
    for (const email of memberIds) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (!u) {
        missingUsers++;
        console.warn(`  skip "${spec.subject}" — missing member ${email}`);
        users.length = 0;
        break;
      }
      users.push(u);
    }
    if (users.length !== memberIds.length) continue;

    const idByEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

    await prisma.meeting.create({
      data: {
        subject: spec.subject,
        topic: spec.topic,
        time: spec.time,
        meetDate: dayOffset(spec.offset),
        location: spec.location,
        university: spec.university,
        notes: spec.notes,
        maxSize: spec.maxSize,
        groupKind: spec.groupKind,
        style: spec.style,
        hostId: host.id,
        members: { create: memberIds.map((email) => ({ userId: idByEmail[email] })) },
        messages: {
          create: spec.messages.map((m) => ({
            userId: idByEmail[m.fromEmail],
            text: m.text,
          })),
        },
      },
    });
    created++;
  }

  return { created, skipped, missingUsers, total: MEME_MEETUP_SPECS.length };
}
