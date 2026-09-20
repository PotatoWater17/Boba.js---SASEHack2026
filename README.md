# StudyBuddyBoard

SASEHack 2026 — study group matching for college students.

## Demo accounts

See **[DEMO-DATA.md](./DEMO-DATA.md)** for full profiles, 51 demo accounts (backed up in `prisma/accounts.snapshot.json`), friendships, DMs, group chats, and restore commands.

**Quick reference**

| Who | Email | Password |
|-----|-------|----------|
| Main demo (Daniel) | `jsmith@auburn.edu` | `Password1!` |
| Dev / admin (Ryan) | `ryanh@auburn.edu` | `RyanH` |
| Dev / admin | `aidenb@auburn.edu` | `AidenB` |
| Dev / admin | `bryanm@auburn.edu` | `BryanM` |
| Dev / admin | `danielk@auburn.edu` | `DanielK` |

Cross-school users: `alex@`, `sam@`, `henry@`, `hailey@` — all `Password1!`. Meme accounts: `*.meme@auburn.edu` etc. — all `Password1!`.

## How to run

```bash
npm install
npm run db:demo-full   # reset DB + seed + Ryan buddies + account snapshot (see DEMO-DATA.md)
npm run dev
```

Or step by step:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Then open http://localhost:3000

To refresh without wiping (keeps existing messages where possible):

```bash
npm run db:restore-team
npm run db:patch-demo
npm run db:ryan-friends
npm run db:restore-accounts  # sync profiles from prisma/accounts.snapshot.json
npm run db:refresh-avatars   # optional — re-download profile photos
```

After editing demo profiles locally, back them up for git:

```bash
npm run db:backup-accounts   # writes prisma/accounts.snapshot.json — commit this file
```
