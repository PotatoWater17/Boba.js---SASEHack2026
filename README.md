# StudyBuddyBoard

StudyBuddyBoard matches students by course, campus, and study style. No messy GroupMe posts or random feeds. Just targeted groups, native chat, and shared goals. Same exam. Same grind. Max efficiency.

SASEHack 2026 · Auburn University — Ryan · Aiden · Bryan · Daniel

## For judges

**Live demo:** [https://studybuddyboard.vercel.app](https://studybuddyboard.vercel.app)

1. Open the live URL (or follow **How to run it** below and use **http://localhost:3000**)
2. Log in as **`ryanh@auburn.edu` / `RyanH`** (fullest demo: buddies, DMs, groups, admin)
3. Try **Find Buddies** → **Browse** groups → open a group chat → **Buddy Board** dashboard

Backup login: `jsmith@auburn.edu` / `Password1!`

The Vercel site auto-deploys from GitHub `main`. Local SQLite still works if you want to run it offline.

---

## Inspiration

It’s hard to find classmates for an upcoming exam. You end up in a huge GroupMe or a random Discord server, and you still don’t know who’s in your class, on your campus, or studying the same way you are. We wanted one place to match with people grinding the same test, then actually show up and stay coordinated.

## What it does

StudyBuddyBoard matches students by course, campus, and study style. You can find exam-prep buddies, browse or host study groups (in-person or online), DM and group-chat with attachments and reactions, and keep upcoming sessions on a Buddy Board dashboard.

- **Find Buddies** — match by class, exam topics, major, campus, and study style
- **Browse / create study groups** — public groups with filters (subject, format, size, style)
- **Buddy DMs + group chat** — attachments, reactions, meetup invites
- **Buddy Board dashboard** — upcoming groups, calendar, unread messages

## How we built it

We built a full-stack web app in Next.js (App Router, React Server Components, Server Actions) with React and Tailwind. Profiles, groups, chat, and matching live in SQLite via Prisma. Auth uses signed HTTP-only session cookies and hashed passwords. File uploads (profile photos, chat attachments) stay on disk locally. Demo accounts, tailored bios, and PFPs are backed up in git so a fresh clone looks like the live app. Production is on Vercel at [studybuddyboard.vercel.app](https://studybuddyboard.vercel.app).

## Challenges we ran into

Keeping demo data honest was harder than it sounds — people edited real profiles and photos, and a reset would wipe them unless we snapshot users and commit avatars. Matching had to feel useful (same class, topics, campus, give/get help) without turning into a noisy social feed. Chat, buddy requests, blocks, join requests, and online vs in-person groups all had to stay consistent across pages. Windows vs Mac/Linux setup also bit us (Prisma file locks, copying `.env`), so we tightened the README for everybody. Making the desktop UI work on a phone was its own fight: nav pills got clipped, the sticky header needed to stay opaque, and section heads had to stack instead of overflowing.

## Accomplishments that we're proud of

We shipped a complete loop in one weekend: signup, match, join a group, talk, and show up on a calendar. Matching is course-first, not “people you might know.” Groups and chat are native — you don’t bounce to GroupMe. Safety is built in (block, leave, join requests). The demo is actually demoable: 67 accounts, photos, friendships, and chats restore with one command, and the same world is live on Vercel.

## What we learned

Scope the product around one job (exam prep with the right people) and cut everything that looks like a social network. Server Actions plus a simple SQLite schema moved faster than a split frontend/backend. Demo data is part of the product — if clones don’t look like the live app, users won’t see the work. Small UX details (filters, unread badges, photo crop, online/in-person, mobile nav) matter more than extra pages.

## What's next for StudyBuddyBoard

Branch out to countries outside of the U.S. After that: more campuses, calendar sync, and better exam-date reminders. The hosted deploy is already live so students can try it without cloning the repo.

---

## How to run it (Mac, Windows, and Linux)

Follow these steps in order. The only commands that differ by operating system are **opening a terminal** and **copying the `.env` file**. Everything else is the same.

### Before you start

Install these two things if you do not already have them:

1. **Git** — [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. **Node.js 20 or newer** (this also installs `npm`) — [https://nodejs.org](https://nodejs.org) (LTS)

Check that they work:

```bash
git --version
node -v
npm -v
```

You should see version numbers, not an error. If `node -v` is below 20, install a newer Node.js and open a **new** terminal.

---

### Step 1 — Open a terminal

**Mac:** open **Terminal** (Spotlight → type `Terminal`).

**Windows:** open **PowerShell** (Start menu → type `PowerShell`). Git Bash also works.

**Linux:** open your terminal app (or press `Ctrl+Alt+T` on many distros).

---

### Step 2 — Download the project

If you **already have the folder**, skip the clone and just `cd` into it.

```bash
git clone https://github.com/PotatoWater17/Boba.js---SASEHack2026.git
cd Boba.js---SASEHack2026
```

Stay in this folder for every later step.

---

### Step 3 — Install packages

```bash
npm install
```

Wait until it finishes with no errors.

---

### Step 4 — Create the `.env` file

This copies the example settings. Default values are fine for local use.

**Mac / Linux:**

```bash
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**Windows (Command Prompt):**

```cmd
copy .env.example .env
```

You do not need to edit `.env` to run locally. (On Windows Git Bash, the Mac/Linux `cp` command also works.)

For a real deployment, set `SESSION_SECRET` in `.env` to a long random string.

---

### Step 5 — Set up the database (first time only)

This creates the SQLite database and loads demo users, groups, and chats:

```bash
npx prisma db push
npx prisma generate
npm run db:demo-full
```

Run this again later if the app looks empty, or after someone changes the database schema.

---

### Step 6 — Start the app

```bash
npm run dev
```

Leave this terminal open. Then in a browser go to:

**http://localhost:3000**

To stop the server, click that terminal and press `Ctrl+C` (same on Mac, Windows, and Linux).

---

### Step 7 — Log in with a demo account

| Who | Email | Password |
|-----|-------|----------|
| Main demo (Johnny) | `jsmith@auburn.edu` | `Password1!` |
| Dev / admin (Ryan) | `ryanh@auburn.edu` | `RyanH` |
| Dev team | `aidenb@`, `bryanm@`, `danielk@` `@auburn.edu` | `AidenB`, `BryanM`, `DanielK` |

More accounts: **[DEMO-DATA.md](./DEMO-DATA.md)**

---

### Optional — production build

Same on Mac, Windows, and Linux:

```bash
npm run build
npm start
```

Then open **http://localhost:3000**.

---

## How it is implemented

### Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite via [Prisma](https://www.prisma.io) (`prisma/dev.db`) |
| Auth | Signed HTTP-only session cookie (`userId` + HMAC); passwords hashed with scrypt |
| File uploads | Local disk under `uploads/` (avatars, chat attachments) |

### Architecture (high level)

```
Browser
  → Next.js pages (src/app/**)     — server-rendered UI, forms post to Server Actions
  → Server Actions (src/app/actions.ts) — login, CRUD, chat, matching, moderation
  → Prisma (src/lib.ts)            — SQLite queries
  → prisma/dev.db                  — users, friendships, meetings, messages, DMs
  → uploads/                       — images/files referenced by DB keys
```

**Routing** lives under `src/app/`:

| Path | Purpose |
|------|---------|
| `/` | About / landing |
| `/login`, `/signup` | Auth |
| `/dashboard` | Buddy Board (calendar, next up, buddy requests) |
| `/find`, `/find/buddies`, `/find/browse`, `/find/create` | Matching and groups |
| `/friends`, `/friends/[id]` | Buddy list and DMs |
| `/groups`, `/meetings/[id]` | Joined groups and group chat |
| `/profile/[id]` | Profiles and preferences |
| `/admin` | User admin (dev team accounts) |

**Shared logic** — `src/lib.ts` (matching scores, auth helpers), `src/ui.tsx` (forms, pickers), `src/chat-compose.tsx` (shared chat input).

**Demo data** — `prisma/seed.ts` creates users and sample content; `prisma/accounts.snapshot.json` backs up profiles for restore scripts. See [DEMO-DATA.md](./DEMO-DATA.md).

### Database models (main)

- `User` — profile, exam prefs, classes need/can help
- `Friendship` — buddy requests (`pending` / `accepted`)
- `Meeting` + `Member` — study groups and membership
- `DirectMessage`, `Message` — 1:1 and group chat
- `Block`, `MeetingJoinRequest`, `MeetupInvite` — safety and join flows

After cloning or pulling schema changes, always sync the DB **and** regenerate the Prisma client (`npx prisma db push`, then `npx prisma generate`).

---

## npm scripts (reference)

| Script | What it does |
|--------|----------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run db:seed` | Seed demo data only |
| `npm run db:demo-full` | Full demo reset (recommended for judges) |
| `npm run db:restore-accounts` | Restore profiles + PFPs from snapshot and `prisma/seed-avatars/` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `git` / `node` / `npm` not found | Install Git and Node.js 20+, then **close and reopen** the terminal |
| `cp` is not recognized (Windows) | Use `Copy-Item .env.example .env` in PowerShell, or `copy .env.example .env` in Command Prompt |
| `Unknown argument …` from Prisma | Stop the server (`Ctrl+C`) → `npx prisma db push` → `npx prisma generate` → `npm run dev` |
| `EPERM` on `prisma generate` (Windows) | The dev server is locking files — stop it with `Ctrl+C`, then run generate again |
| Empty app / no users | From the project folder, run `npm run db:demo-full` |
| Login fails after a git pull | Stop the server, run `npx prisma generate`, then `npm run dev` again |
| Port 3000 already in use | Stop the other process, or run `npx next dev -p 3001` and open that port instead |

---

## Team

Ryan · Aiden · Bryan · Daniel — Auburn University, SASEHack 2026
