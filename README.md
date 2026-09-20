# StudyBuddyBoard

SASEHack 2026 — a campus study-group app for finding exam prep buddies, joining study groups, and coordinating over chat.

## What it does

- **Find Buddies** — match students by class, exam topics, major, campus, and study style
- **Browse / create study groups** — public groups with filters (subject, format, size, style)
- **Buddy DMs + group chat** — attachments, reactions, meetup invites
- **Buddy Board dashboard** — upcoming groups, calendar, unread messages

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

## Optional: public dev URL (temporary)

During the hackathon, a Cloudflare quick tunnel may be used so judges can try the app without cloning:

**https://lawn-guests-cologne-dancing.trycloudflare.com**

This only works while someone’s laptop is running both `npm run dev` and `cloudflared tunnel --url http://127.0.0.1:3000`. The URL changes when the tunnel restarts. For a reliable demo, run locally or deploy to a host (Vercel, Railway, etc.) with a real database and `SESSION_SECRET`.

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
