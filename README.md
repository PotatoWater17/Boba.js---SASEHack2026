# StudyBuddyBoard

SASEHack 2026 — a campus study-group app for finding exam prep buddies, joining study groups, and coordinating over chat.

## What it does

- **Find Buddies** — match students by class, exam topics, major, campus, and study style
- **Browse / create study groups** — public groups with filters (subject, format, size, style)
- **Buddy DMs + group chat** — attachments, reactions, meetup invites
- **Buddy Board dashboard** — upcoming groups, calendar, unread messages

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

After cloning or pulling schema changes, always sync the DB **and** regenerate the Prisma client (see below).

---

## Prerequisites

- **Node.js 20+** and npm
- **Git**

---

## Setup and run (local)

### 1. Clone and install

```bash
git clone https://github.com/PotatoWater17/Boba.js---SASEHack2026.git
cd Boba.js---SASEHack2026
npm install
```

### 2. Environment

Copy the example env file:

```bash
cp .env.example .env
```

Default values work for local development:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="generate-a-long-random-string"
```

`SESSION_SECRET` can be any long random string locally. **Required in production** for secure cookies.

### 3. Database (first time or after schema changes)

Apply the schema, generate the client, and load demo data:

```bash
npx prisma db push
npx prisma generate
npm run db:demo-full
```

`db:demo-full` resets the DB, seeds users/groups/chats, restores Ryan’s buddy list, syncs account snapshots, and backfills online/in-person tags.

> **Important:** If you see errors like `Unknown argument isOnline`, the Prisma client is stale. Stop the dev server, run `npx prisma generate`, then start again.

### 4. Start the app

**Development** (hot reload):

```bash
npm run dev
```

Open **http://localhost:3000**

**Production build** (optional):

```bash
npm run build
npm start
```

### 5. Log in with a demo account

| Who | Email | Password |
|-----|-------|----------|
| Main demo (Jordan) | `jsmith@auburn.edu` | `Password1!` |
| Dev / admin (Ryan) | `ryanh@auburn.edu` | `RyanH` |
| Dev team | `aidenb@`, `bryanm@`, `danielk@` `@auburn.edu` | `AidenB`, `BryanM`, `DanielK` |

More accounts, DMs, and restore commands: **[DEMO-DATA.md](./DEMO-DATA.md)**

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
| `npm run db:restore-accounts` | Restore profiles from `accounts.snapshot.json` |

---

## Optional: public dev URL (temporary)

During the hackathon, a Cloudflare quick tunnel may be used so judges can try the app without cloning:

**https://lawn-guests-cologne-dancing.trycloudflare.com**

This only works while someone’s laptop is running both `npm run dev` and `cloudflared tunnel --url http://127.0.0.1:3000`. The URL changes when the tunnel restarts. For a reliable demo, run locally or deploy to a host (Vercel, Railway, etc.) with a real database and `SESSION_SECRET`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Unknown argument …` from Prisma | Stop dev server → `npx prisma db push` → `npx prisma generate` → `npm run dev` |
| `EPERM` on `prisma generate` (Windows) | Dev server is locking files — stop it first |
| Empty app / no users | Run `npm run db:demo-full` |
| Login fails after pull | Re-run `npx prisma generate` and restart dev server |

---

## Team

Ryan · Aiden · Bryan · Daniel — Auburn University, SASEHack 2026
