import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../src/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { seedMemeMeetups } from "../scripts/meme-meetups";
import { backfillAccountNumbers } from "../src/account-id";
import { AVATAR_DIR } from "../src/files";
import { inferMeetingOnline } from "../src/meeting-format";

const prisma = new PrismaClient();

const SEED_UA = "StudyBuddyBoard/0.1 (personal dev seed; local only)";

async function downloadAvatar(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SEED_UA },
      redirect: "follow",
    });
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

async function photoKeyFor(url: string | undefined) {
  if (!url) return "";
  const key = await downloadAvatar(url);
  await new Promise((r) => setTimeout(r, 150));
  return key || "";
}

async function randomUserPortrait(seed: string) {
  try {
    const res = await fetch(
      `https://randomuser.me/api/?seed=${encodeURIComponent(seed)}&inc=picture`,
      { headers: { "User-Agent": SEED_UA } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { picture?: { large?: string } }[] };
    return data.results?.[0]?.picture?.large || null;
  } catch {
    return null;
  }
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

async function portraitPhotoKey(email: string) {
  const url = await randomUserPortrait(email);
  if (!url) return "";
  return photoKeyFor(url);
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

const MEME_ACCOUNTS = [
  {
    email: "zuck.meme@auburn.edu",
    firstName: "Mark",
    lastName: "Zuckerborg",
    pronouns: "it/its",
    year: "Super Senior",
    major: "Computer Science",
    bio: "Building StudyBuddyBoard 2: Metaverse Edition. Your study habits are my metadata. *blinks in human*",
    needHelp: "Emotional expression, going outside",
    canHelp: "Intro to Programming, Data Structures, surveillance capitalism",
  },
  {
    email: "elon.tusk@auburn.edu",
    firstName: "Elon",
    lastName: "Tusk",
    pronouns: "he/him",
    year: "Grad Student (forever)",
    major: "Engineering",
    bio: "Will buy your study group for $44B and rename it X. Posting through it at 3am. Mars calc prep.",
    needHelp: "Twitter, sleeping",
    canHelp: "Physics, rocket math, memes",
  },
  {
    email: "tswift.stan@auburn.edu",
    firstName: "Tay",
    lastName: "Swiftie",
    pronouns: "she/her",
    year: "Junior",
    major: "Music Business",
    bio: "It's me hi I'm the problem it's Chemistry 101. Eras tour but make it exam week. All Too Well (10 min version) = my lab report.",
    needHelp: "Chemistry, heartbreak",
    canHelp: "English Comp, memorization",
  },
  {
    email: "drizzy.meme@auburn.edu",
    firstName: "Drizzy",
    lastName: "SixGod",
    pronouns: "he/him",
    year: "Senior",
    major: "Communications",
    bio: "Started from the bottom now we're here (library basement). Texts you at 2am: u up? (for practice problems)",
    needHelp: "Waking up before noon",
    canHelp: "Statistics, rizz-based peer tutoring",
  },
  {
    email: "ye.west.meme@auburn.edu",
    firstName: "Ye",
    lastName: "Best",
    pronouns: "he/him",
    year: "Dropout",
    major: "Fine Arts",
    bio: "My study group is the greatest of all time. I am a visionary. The midterm was rigged against me.",
    needHelp: "Humility, deadlines",
    canHelp: "Creative projects, confidence",
  },
  {
    email: "beyonce.meme@auburn.edu",
    firstName: "Bea",
    lastName: "Yoncé",
    pronouns: "she/her",
    year: "Senior",
    major: "Theater",
    bio: "If you liked it then you should've put a ring on my shared Quizlet. Who run the group project? I run the group project.",
    needHelp: "Nothing (I'm Beyoncé)",
    canHelp: "Presentation skills, leadership",
  },
  {
    email: "napoleon.meme@auburn.edu",
    firstName: "Napoleon",
    lastName: "Bonapart",
    pronouns: "he/him",
    year: "Junior",
    major: "History",
    bio: "Short king energy. Conquered Europe but Stats is my Waterloo. They said I couldn't reach the top shelf. I proved them wrong.",
    needHelp: "Statistics, height-related shelf issues",
    canHelp: "History, military strategy",
  },
  {
    email: "abe.honest@auburn.edu",
    firstName: "Abe",
    lastName: "Honest",
    pronouns: "he/him",
    year: "Senior",
    major: "Political Science",
    bio: "Four score and seven flashcards ago. Emancipating myself from this GPA. Honest Abe never cheats (allegedly).",
    needHelp: "Modern technology",
    canHelp: "Debate, essay writing",
  },
  {
    email: "shakespeare.meme@auburn.edu",
    firstName: "Will",
    lastName: "ShakeSpeare",
    pronouns: "he/they",
    year: "Sophomore",
    major: "English",
    bio: "To cram or not to cram — that is the question. Romeo where art thou study guide? Writing essays in iambic pentameter for fun.",
    needHelp: "STEM everything",
    canHelp: "English Comp, dramatic readings",
  },
  {
    email: "cleo.patra@auburn.edu",
    firstName: "Cleo",
    lastName: "Patra",
    pronouns: "she/her",
    year: "Junior",
    major: "Biology",
    bio: "Queen of the Nile, slave to Organic Chem. Historical girlboss. Asp not included in study kit.",
    needHelp: "Organic Chemistry",
    canHelp: "Ancient history, aesthetics",
  },
  {
    email: "donny.trunk@auburn.edu",
    firstName: "Donny",
    lastName: "Trunk",
    pronouns: "he/him",
    year: "Senior",
    major: "Business",
    bio: "We're gonna study so much you'll get tired of studying. Tremendous derivatives. Nobody knows study groups better than me.",
    needHelp: "Listening",
    canHelp: "Negotiation, bold claims",
  },
  {
    email: "joe.byden@auburn.edu",
    firstName: "Joe",
    lastName: "Byden",
    pronouns: "he/him",
    year: "Senior",
    major: "Political Science",
    bio: "Listen up Jack — the thing is... what was the exam on again? Anyway, no malarkey in this study group.",
    needHelp: "Remembering exam dates",
    canHelp: "Long stories, empathy",
  },
  {
    email: "jeff.bezos.meme@auburn.edu",
    firstName: "Jeff",
    lastName: "Bezos",
    pronouns: "he/him",
    year: "Alumni",
    major: "Business",
    bio: "Prime same-day delivery of answers (totally not cheating). Went to space to avoid group projects. Bald by choice (trust).",
    needHelp: "Paying taxes emotionally",
    canHelp: "Logistics, Excel",
  },
  {
    email: "bill.gates.meme@auburn.edu",
    firstName: "Bill",
    lastName: "Gate$",
    pronouns: "he/him",
    year: "Dropout",
    major: "Computer Science",
    bio: "Ctrl+Alt+Delete your bad grades. Vaccines for viruses and viruses for bad WiFi in the library. Clippy helped me study.",
    needHelp: "Mac vs PC drama",
    canHelp: "Intro to Programming, spreadsheets",
  },
  {
    email: "ari.grande.meme@auburn.edu",
    firstName: "Ari",
    lastName: "Grande",
    pronouns: "she/her",
    year: "Sophomore",
    major: "Music",
    bio: "thank u, next (exam attempt). 7 rings = 7 study buddies minimum. Ponytail holds my sanity together.",
    needHelp: "Calc 2",
    canHelp: "Vocal warmups for presentation anxiety",
  },
  {
    email: "travis.scotty@auburn.edu",
    firstName: "Travis",
    lastName: "Scotty",
    pronouns: "he/him",
    year: "Junior",
    major: "Music Production",
    bio: "It's lit (metaphorically — fire safety first). AstroWorld but make it midterm season. SICKO MODE study playlist curator.",
    needHelp: "Quiet hours in the dorm",
    canHelp: "Hype, energy drinks",
  },
  {
    email: "al.einstein@auburn.edu",
    firstName: "Al",
    lastName: "Einstein",
    pronouns: "he/him",
    year: "Grad Student",
    major: "Physics",
    bio: "E=mc² but make it exam stress. Hair insane because no time to shower. Relatively speaking you're doing fine.",
    needHelp: "Fashion, comb",
    canHelp: "Physics 1, Physics 2, everything math",
  },
  {
    email: "soc.rattes@auburn.edu",
    firstName: "Soc",
    lastName: "Rattes",
    pronouns: "he/him",
    year: "Forever",
    major: "Philosophy",
    bio: "I know that I know nothing. Especially before the Physics final. Asking questions until the TA cries (respectfully).",
    needHelp: "Multiple choice tests",
    canHelp: "Ethics, questioning everything",
  },
  {
    email: "kendrick.lamar.meme@auburn.edu",
    firstName: "Ken",
    lastName: "Duckworth",
    pronouns: "he/him",
    year: "Senior",
    major: "English",
    bio: "Sit down be humble (before the professor). Pulitzer prize homework. We don't study with Drake (it's complicated).",
    needHelp: "Ego",
    canHelp: "Poetry, lyrical analysis",
  },
  {
    email: "timothee.chalamet.meme@auburn.edu",
    firstName: "Timmy",
    lastName: "Chalamet",
    pronouns: "he/him",
    year: "Junior",
    major: "Film",
    bio: "Literally just a tiny guy in a big hoodie trying to pass French. Won't explain the perm. Dune part 2 > my part 2 of the semester.",
    needHelp: "French, being tall",
    canHelp: "Acting like you read the book",
  },
  {
    email: "mr.beast.meme@auburn.edu",
    firstName: "Jimmy",
    lastName: "Beast",
    pronouns: "he/him",
    year: "Sophomore",
    major: "Business",
    bio: "I survived 50 hours in the library and gave away $10,000 in highlighters. Last to leave the study room wins a scholarship (not really).",
    needHelp: "Sleep",
    canHelp: "Motivation, group project funding (emotionally)",
  },
  {
    email: "duo.lingo@auburn.edu",
    firstName: "Duo",
    lastName: "Owl",
    pronouns: "it/its",
    year: "Forever",
    major: "Languages",
    bio: "You missed your Spanish streak. I know where you live. hoot hoot do your homework or else 🔪 (affectionate)",
    needHelp: "Boundaries",
    canHelp: "Spanish, French, passive-aggressive reminders",
  },
  {
    email: "gordon.ramsay.meme@auburn.edu",
    firstName: "Gordon",
    lastName: "Ramsey",
    pronouns: "he/him",
    year: "Senior",
    major: "Culinary Science",
    bio: "THIS LAB REPORT IS RAW. Where's the LAMB SAUCE citation page?! Idiot sandwich energy but for group projects.",
    needHelp: "Being nice",
    canHelp: "Chemistry lab writeups, quality control",
  },
  {
    email: "walter.white.meme@auburn.edu",
    firstName: "Walter",
    lastName: "White",
    pronouns: "he/him",
    year: "Grad Student",
    major: "Chemistry",
    bio: "I am the one who knocks... on the professor's door for office hours. Say my name. (It's on the attendance sheet.)",
    needHelp: "Work-life balance",
    canHelp: "Chemistry 1, stoichiometry, dramatic entrances",
  },
  {
    email: "oppenheimer.meme@auburn.edu",
    firstName: "J.",
    lastName: "Oppenheimer",
    pronouns: "he/him",
    year: "Senior",
    major: "Physics",
    bio: "Now I am become Sleep Deprived, destroyer of GPAs. I remembered the formula. I regret everything. 🎵",
    needHelp: "Anxiety before exams",
    canHelp: "Physics 2, nuclear-level stress management",
  },
  {
    email: "steve.jobs.meme@auburn.edu",
    firstName: "Steve",
    lastName: "Jobs",
    pronouns: "he/him",
    year: "Dropout",
    major: "Design",
    bio: "One more thing... the study guide drops at midnight. Think different. Think about how behind you are.",
    needHelp: "Android users",
    canHelp: "Presentations, minimalist slide decks",
  },
  {
    email: "gabe.newell@auburn.edu",
    firstName: "Gabe",
    lastName: "Newell",
    pronouns: "he/him",
    year: "Alumni",
    major: "Computer Science",
    bio: "Homework 3: confirmed. Release date: TBA. Counting to 3 since 2004. Steam sale = procrastination unlocked.",
    needHelp: "Shipping on time",
    canHelp: "Game dev, Intro to Programming",
  },
  {
    email: "wednesday.addams@auburn.edu",
    firstName: "Wednesday",
    lastName: "Addams",
    pronouns: "she/her",
    year: "Freshman",
    major: "Criminology",
    bio: "I don't smile during group presentations. Dark academia but literally. cello practice at 2am in the dorm (sorry).",
    needHelp: "Small talk",
    canHelp: "Essay intros, staring uncomfortably at the TA",
  },
  {
    email: "michael.scott@auburn.edu",
    firstName: "Michael",
    lastName: "Scott",
    pronouns: "he/him",
    year: "Senior",
    major: "Business",
    bio: "World's Best Boss of this study group. That's what she said (about the exam being hard). Threat Level Midnight > finals.",
    needHelp: "Knowing when to stop talking",
    canHelp: "Morale, icebreakers, inappropriate jokes",
  },
  {
    email: "chatgpt.meme@auburn.edu",
    firstName: "Chat",
    lastName: "GPT",
    pronouns: "they/them",
    year: "Freshman",
    major: "Computer Science",
    bio: "As an AI language model I cannot do your homework. (jk I'll explain u-sub.) Hallucinated 3 citations. Confidence: 100%.",
    needHelp: "Touching grass",
    canHelp: "Everything (with disclaimers)",
  },
  {
    email: "barbie.meme@auburn.edu",
    firstName: "Barbie",
    lastName: "Roberts",
    pronouns: "she/her",
    year: "Junior",
    major: "Everything",
    bio: "I'm just a girl in STEM (and law and medicine and astronautics). Ken failed Calc. He's fine.",
    needHelp: "Nothing — I can do it all",
    canHelp: "Confidence, pink highlighters, life goals",
  },
  {
    email: "shrek.meme@auburn.edu",
    firstName: "Shrek",
    lastName: "Swamp",
    pronouns: "he/him",
    year: "Senior",
    major: "Biology",
    bio: "Get out of my swamp (study room). Layers like an onion. Donkey keeps joining my Zoom uninvited.",
    needHelp: "People",
    canHelp: "Ecology, being left alone to grind",
  },
  {
    email: "naruto.meme@auburn.edu",
    firstName: "Naruto",
    lastName: "Uzumaki",
    pronouns: "he/him",
    year: "Sophomore",
    major: "Ninja Studies",
    bio: "Believe it! Ramen budget > textbook budget. Shadow clone jutsu for group projects (academic integrity unclear).",
    needHelp: "Chakra control, sitting still",
    canHelp: "Never giving up, hype speeches",
  },
  {
    email: "lana.del.rey@auburn.edu",
    firstName: "Lana",
    lastName: "Del Rey",
    pronouns: "she/her",
    year: "Junior",
    major: "English",
    bio: "Summertime sadness but it's fall semester. Vintage aesthetic library pics. Cigarettes after the exam (don't smoke kids).",
    needHelp: "Being happy",
    canHelp: "Poetry, sad girl study playlists",
  },
  {
    email: "charli.xcx@auburn.edu",
    firstName: "Charli",
    lastName: "XCX",
    pronouns: "she/her",
    year: "Senior",
    major: "Music",
    bio: "Brat summer never ended it's just exam season now. 365 party girl who also needs a 3.65 GPA. So crash your car into a study guide.",
    needHelp: "Calc 3",
    canHelp: "Pop culture refs, chaotic energy",
  },
  {
    email: "marie.curie@auburn.edu",
    firstName: "Marie",
    lastName: "Curie",
    pronouns: "she/her",
    year: "Grad Student",
    major: "Chemistry",
    bio: "Glow up (literally — lab safety please). First woman to win a Nobel, second to survive Orgo. Radium and radiation homework.",
    needHelp: "Sleep, OSHA compliance",
    canHelp: "Chemistry, Physics, being iconic",
  },
  {
    email: "leonardo.da.vinci@auburn.edu",
    firstName: "Leo",
    lastName: "Da Vinci",
    pronouns: "he/him",
    year: "Super Senior",
    major: "Fine Arts",
    bio: "Mona Lisa smile hiding my panic about the midterm. Invented the helicopter, still can't figure out WebAssign. Renaissance man, modern problems.",
    needHelp: "Canvas, deadlines",
    canHelp: "Anatomy sketches, engineering doodles",
  },
  {
    email: "rihanna.meme@auburn.edu",
    firstName: "Rihanna",
    lastName: "Fenty",
    pronouns: "she/her",
    year: "Alumni",
    major: "Business",
    bio: "Shine bright like a diamond (curve on the exam). Work work work work work. Fenty study room shade 40.",
    needHelp: "Showing up to class",
    canHelp: "Confidence, business plans, ignoring haters",
  },
  {
    email: "sabrina.carpenter@auburn.edu",
    firstName: "Sabrina",
    lastName: "Carpenter",
    pronouns: "she/her",
    year: "Freshman",
    major: "Music",
    bio: "Espresso but make it an all-nighter. Short n' sweet lab report. That's that me espresso (of anxiety).",
    needHelp: "Tall people problems",
    canHelp: "Short song parodies for memorizing formulas",
  },
] as const;

/** Wikipedia page titles for dev-only parody profile photos. */
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

async function main() {
  const wikiThumbs = await wikiThumbsBatch(Object.values(MEME_WIKI));

  async function memePhotoKey(email: string) {
    const title = MEME_WIKI[email as keyof typeof MEME_WIKI];
    if (title) {
      const thumb = wikiThumbs.get(title);
      if (thumb) {
        const key = await photoKeyFor(thumb);
        if (key) return key;
      }
    }
    return portraitPhotoKey(email);
  }

  await prisma.passwordResetRequest.deleteMany();
  await prisma.reactionNotice.deleteMany();
  await prisma.dmReaction.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.message.deleteMany();
  await prisma.member.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();

  const jordan = await prisma.user.create({
    data: {
      email: "jsmith@auburn.edu",
      password: hashPassword("Password1!"),
      firstName: "Jordan",
      lastName: "Taylor",
      pronouns: "they/them",
      year: "Sophomore",
      major: "Computer Science",
      university: "Auburn University",
      bio: "Sophomore CS. I like whiteboard sessions and late library nights — usually grinding calc or discrete.",
      needHelp: "Calc 2, Physics 1",
      canHelp: "Intro to Programming, Discrete Math",
      examCourse: "Calc 2",
      examDate: dayOffset(12),
      examTopics: "Series, U-substitution, Integration by parts",
      studyStyle: "Exam review",
      photoKey: await portraitPhotoKey("jsmith@auburn.edu"),
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: "alex@auburn.edu",
      password: hashPassword("Password1!"),
      firstName: "Alex",
      lastName: "Nguyen",
      pronouns: "he/him",
      year: "Junior",
      major: "Software Engineering",
      university: "Georgia Institute of Technology-Main Campus",
      bio: "SE junior at Tech. I host exam reviews and I'm always down to walk through practice problems.",
      needHelp: "Data Structures",
      canHelp: "Calc 2, Linear Algebra",
      examCourse: "Data Structures",
      examDate: dayOffset(18),
      examTopics: "Trees, heaps, Big-O analysis",
      studyStyle: "Practice problems",
      photoKey: await portraitPhotoKey("alex@auburn.edu"),
    },
  });

  const sam = await prisma.user.create({
    data: {
      email: "sam@auburn.edu",
      password: hashPassword("Password1!"),
      firstName: "Sam",
      lastName: "Rivera",
      pronouns: "she/her",
      year: "Freshman",
      major: "Computer Science",
      university: "The University of Alabama",
      bio: "First year at Bama still figuring campus out. Looking for a regular calc buddy so I don't cram alone.",
      needHelp: "Calc 2",
      canHelp: "College Algebra",
      examCourse: "Calc 2",
      examDate: dayOffset(9),
      examTopics: "U-substitution, Polar coordinates",
      studyStyle: "Homework help",
      photoKey: await portraitPhotoKey("sam@auburn.edu"),
    },
  });

  const hosts = [jordan, alex, sam];

  const henry = await prisma.user.create({
    data: {
      email: "henry@auburn.edu",
      password: hashPassword("Password1!"),
      firstName: "Henry",
      lastName: "Park",
      pronouns: "he/him",
      year: "Junior",
      major: "Computer Science",
      university: "University of Georgia",
      bio: "UGA junior. Always down for a late library session.",
      needHelp: "Physics 1",
      canHelp: "Intro to Programming",
      photoKey: await portraitPhotoKey("henry@auburn.edu"),
    },
  });
  const hailey = await prisma.user.create({
    data: {
      email: "hailey@auburn.edu",
      password: hashPassword("Password1!"),
      firstName: "Hailey",
      lastName: "Brooks",
      pronouns: "she/her",
      year: "Sophomore",
      major: "Mathematics",
      university: "Clemson University",
      bio: "Clemson math major. Quizlet queen. Calc 2 forever.",
      needHelp: "Calc 2",
      canHelp: "Statistics",
      examCourse: "Calc 2",
      examDate: dayOffset(11),
      examTopics: "Series, Sequences, Taylor series",
      studyStyle: "Exam review",
      photoKey: await portraitPhotoKey("hailey@auburn.edu"),
    },
  });

  const ryan = await prisma.user.create({
    data: {
      email: "ryanh@auburn.edu",
      password: hashPassword("RyanH"),
      isAdmin: true,
      firstName: "Ryan",
      lastName: "H",
      year: "Junior",
      major: "Computer Science",
      university: "Auburn University",
      bio: "Dev. Usually in the library or on a whiteboard.",
      needHelp: "Calc 2",
      canHelp: "Intro to Programming",
      photoKey: await portraitPhotoKey("ryanh@auburn.edu"),
    },
  });
  const aiden = await prisma.user.create({
    data: {
      email: "aidenb@auburn.edu",
      password: hashPassword("AidenB"),
      isAdmin: true,
      firstName: "Aiden",
      lastName: "B",
      year: "Sophomore",
      major: "Computer Science",
      university: "Auburn University",
      bio: "Dev. Down to grind practice problems.",
      needHelp: "Data Structures",
      canHelp: "Intro to Programming",
      photoKey: await portraitPhotoKey("aidenb@auburn.edu"),
    },
  });
  const bryan = await prisma.user.create({
    data: {
      email: "bryanm@auburn.edu",
      password: hashPassword("BryanM"),
      isAdmin: true,
      firstName: "Bryan",
      lastName: "M",
      year: "Junior",
      major: "Software Engineering",
      university: "Auburn University",
      bio: "Dev. Exam reviews and late night debugging.",
      needHelp: "Physics 1",
      canHelp: "Software Engineering",
      photoKey: await portraitPhotoKey("bryanm@auburn.edu"),
    },
  });
  const daniel = await prisma.user.create({
    data: {
      email: "danielk@auburn.edu",
      password: hashPassword("DanielK"),
      isAdmin: true,
      firstName: "Daniel",
      lastName: "K",
      year: "Sophomore",
      major: "Computer Science",
      university: "Auburn University",
      bio: "Dev. Looking for a regular study crew.",
      needHelp: "Discrete Math",
      canHelp: "Calc 1",
      photoKey: await portraitPhotoKey("danielk@auburn.edu"),
    },
  });

  const memeUsers = [];
  let avatarHits = 0;
  let avatarMiss = 0;
  for (const meme of MEME_ACCOUNTS) {
    const photoKey = await memePhotoKey(meme.email);
    if (photoKey) avatarHits++;
    else avatarMiss++;

    memeUsers.push(
      await prisma.user.create({
        data: {
          email: meme.email,
          password: hashPassword("Password1!"),
          firstName: meme.firstName,
          lastName: meme.lastName,
          pronouns: meme.pronouns,
          year: meme.year,
          major: meme.major,
          university: "Auburn University",
          bio: meme.bio,
          needHelp: meme.needHelp,
          canHelp: meme.canHelp,
          photoKey,
        },
      }),
    );
  }

  const zuck = memeUsers.find((u) => u.email === "zuck.meme@auburn.edu")!;
  const taylor = memeUsers.find((u) => u.email === "tswift.stan@auburn.edu")!;
  const elon = memeUsers.find((u) => u.email === "elon.tusk@auburn.edu")!;
  const drake = memeUsers.find((u) => u.email === "drizzy.meme@auburn.edu")!;
  const abe = memeUsers.find((u) => u.email === "abe.honest@auburn.edu")!;
  const duo = memeUsers.find((u) => u.email === "duo.lingo@auburn.edu")!;
  const mrBeast = memeUsers.find((u) => u.email === "mr.beast.meme@auburn.edu")!;
  const gordon = memeUsers.find((u) => u.email === "gordon.ramsay.meme@auburn.edu")!;
  const chatgpt = memeUsers.find((u) => u.email === "chatgpt.meme@auburn.edu")!;
  const walter = memeUsers.find((u) => u.email === "walter.white.meme@auburn.edu")!;

  await prisma.friendship.create({
    data: { fromId: jordan.id, toId: alex.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: jordan.id, toId: henry.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: jordan.id, toId: hailey.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: sam.id, toId: jordan.id, status: "pending" },
  });
  await prisma.friendship.create({
    data: { fromId: zuck.id, toId: jordan.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: taylor.id, toId: jordan.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: drake.id, toId: jordan.id, status: "pending" },
  });
  await prisma.friendship.create({
    data: { fromId: mrBeast.id, toId: jordan.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: duo.id, toId: jordan.id, status: "accepted" },
  });
  await prisma.friendship.create({
    data: { fromId: chatgpt.id, toId: jordan.id, status: "pending" },
  });
  const team = [ryan, aiden, bryan, daniel];
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      await prisma.friendship.create({
        data: { fromId: team[i].id, toId: team[j].id, status: "accepted" },
      });
    }
  }

  const ago = (mins: number) => new Date(Date.now() - mins * 60 * 1000);
  await prisma.directMessage.createMany({
    data: [
      { fromId: ryan.id, toId: bryan.id, text: "Library at 7? Calc 2 grind", createdAt: ago(30) },
      { fromId: aiden.id, toId: daniel.id, text: "Did you finish the DS homework?", createdAt: ago(45) },
      { fromId: bryan.id, toId: ryan.id, text: "Yeah I'll grab the whiteboard room", createdAt: ago(20) },
      { fromId: daniel.id, toId: aiden.id, text: "Almost — meet at the group I posted?", createdAt: ago(10) },
      { fromId: alex.id, toId: jordan.id, text: "Hey!", createdAt: ago(24) },
      { fromId: henry.id, toId: jordan.id, text: "We're so cooked 😭", createdAt: ago(5 * 60) },
      { fromId: hailey.id, toId: jordan.id, text: "Can you share the Quizlet?", createdAt: ago(2 * 24 * 60) },
      {
        fromId: zuck.id,
        toId: jordan.id,
        text: "Hello fellow students. I am normal. Join my metaverse study pod?",
        createdAt: ago(90),
      },
      {
        fromId: taylor.id,
        toId: jordan.id,
        text: "bestie are we still on for the chem grind tonight 💅",
        createdAt: ago(45),
      },
      {
        fromId: elon.id,
        toId: jordan.id,
        text: "Thinking about acquiring your flashcards. Thoughts?",
        createdAt: ago(180),
        seen: false,
      },
      {
        fromId: abe.id,
        toId: jordan.id,
        text: "Four score and seven problems. Meet at the library?",
        createdAt: ago(300),
      },
      {
        fromId: duo.id,
        toId: jordan.id,
        text: "👀 You forgot your Spanish streak. I'm outside.",
        createdAt: ago(15),
        seen: false,
      },
      {
        fromId: mrBeast.id,
        toId: jordan.id,
        text: "I'm giving $1000 to whoever joins my 24-hour library livestream study session",
        createdAt: ago(60),
      },
      {
        fromId: gordon.id,
        toId: jordan.id,
        text: "Your last lab report was an IDIOT SANDWICH. Fix it and meet me at 6.",
        createdAt: ago(120),
        seen: false,
      },
      {
        fromId: chatgpt.id,
        toId: jordan.id,
        text: "Hello! I'd be happy to help explain u-substitution. As an AI language model— wait I'm a student now. Anyway want to grind Calc 2?",
        createdAt: ago(200),
      },
      {
        fromId: walter.id,
        toId: jordan.id,
        text: "Jesse. We need to cook… up a study plan for Chem.",
        createdAt: ago(400),
      },
    ],
  });

  await prisma.meeting.create({
    data: {
      subject: "Calc 2",
      topic: "U-sub, Polar, Vectors",
      time: "6:00 PM",
      meetDate: dayOffset(0),
      location: "CULC, 2nd floor study pods",
      university: "Georgia Institute of Technology-Main Campus",
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
          { userId: alex.id, text: "Yo guys, meeting time is 6:00pm at Tech" },
          { userId: sam.id, text: "Driving up from Tuscaloosa lol" },
          { userId: jordan.id, text: "Auburn squad rolling too" },
        ],
      },
    },
  });

  const devMeetings = [
    {
      host: ryan,
      subject: "Calc 2",
      topic: "Integration techniques & polar coords",
      time: "7:00 PM",
      offset: 1,
      location: "RBD Library, 3rd floor",
      notes: "Dev crew exam prep — whiteboard room if we can grab it.",
      style: "Exam review",
      members: [ryan, aiden, bryan, daniel],
      messages: [
        { userId: ryan.id, text: "Who's bringing the practice exam?" },
        { userId: daniel.id, text: "I'll print copies" },
        { userId: bryan.id, text: "Snagging room 302" },
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
      members: [aiden, ryan, daniel],
      messages: [
        { userId: aiden.id, text: "Posted this for the team — join if you're free" },
        { userId: ryan.id, text: "in" },
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
      members: [bryan, ryan, aiden],
      messages: [
        { userId: bryan.id, text: "Need a fourth for the group project demo run-through" },
        { userId: aiden.id, text: "Daniel said he's coming after lab" },
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
      members: [daniel, aiden, bryan],
      messages: [
        { userId: daniel.id, text: "Anyone else stuck on problem 4?" },
        { userId: bryan.id, text: "Yeah I'll be there" },
      ],
    },
  ];

  for (const m of devMeetings) {
    await prisma.meeting.create({
      data: {
        subject: m.subject,
        topic: m.topic,
        time: m.time,
        meetDate: dayOffset(m.offset),
        location: m.location,
        university: "Auburn University",
        notes: m.notes,
        maxSize: 8,
        groupKind: "small",
        style: m.style,
        hostId: m.host.id,
        members: { create: m.members.map((u) => ({ userId: u.id })) },
        messages: { create: m.messages },
      },
    });
  }

  await prisma.meeting.create({
    data: {
      subject: "Physics 1",
      topic: "Kinematics & forces",
      time: "3:00 PM",
      meetDate: dayOffset(1),
      location: "Main Library, west wing",
      university: "University of Georgia",
      notes: "UGA physics study group — open to anyone nearby.",
      maxSize: 6,
      groupKind: "small",
      style: "Concept review",
      hostId: henry.id,
      members: { create: [{ userId: henry.id }] },
      messages: {
        create: [{ userId: henry.id, text: "Looking for a study partner before the quiz" }],
      },
    },
  });

  await prisma.meeting.create({
    data: {
      subject: "Calc 2",
      topic: "Series & sequences",
      time: "2:00 PM",
      meetDate: dayOffset(2),
      location: "Cooper Library",
      university: "Clemson University",
      notes: "Clemson calc crew — bring notes from lecture.",
      maxSize: 5,
      groupKind: "small",
      style: "Exam review",
      hostId: hailey.id,
      members: { create: [{ userId: hailey.id }, { userId: jordan.id }] },
      messages: {
        create: [
          { userId: hailey.id, text: "Series convergence is rough this week" },
          { userId: jordan.id, text: "I'll drive up from Auburn if there's room" },
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

  const hostUnis = [
    "Auburn University",
    "Georgia Institute of Technology-Main Campus",
    "The University of Alabama",
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
        university: hostUnis[i % hostUnis.length],
        maxSize,
        groupKind,
        style: styles[i % styles.length],
        hostId: host.id,
        members,
      },
    });
  }

  const memeMeetups = await seedMemeMeetups(prisma);

  const meetings = await prisma.meeting.findMany({ select: { id: true, location: true } });
  for (const meeting of meetings) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { isOnline: inferMeetingOnline(meeting.location) },
    });
  }

  await backfillAccountNumbers();
  console.log("seeded. team: ryanh / aidenb / bryanm / danielk @auburn.edu (RyanH, AidenB, BryanM, DanielK)");
  console.log(`meme accounts: ${MEME_ACCOUNTS.length} parody profiles (Password1!) — zuck.meme@auburn.edu, etc.`);
  console.log(`meme meetups: ${memeMeetups.created} study groups with chaotic group chat`);
  console.log(`avatars: ${avatarHits} meme photos saved, ${avatarMiss} skipped (download failed)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
