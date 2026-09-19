# StudyBuddyBoard

SASEHack 2026 — study group matching for college students.

## Demo accounts

**Main demo user**

- Email: `jsmith@auburn.edu`
- Password: `Password1!`
- School: Auburn University

**Dev team (Auburn, admin)**

| Email | Password |
|-------|----------|
| `ryanh@auburn.edu` | `RyanH` |
| `aidenb@auburn.edu` | `AidenB` |
| `bryanm@auburn.edu` | `BryanM` |
| `danielk@auburn.edu` | `DanielK` |

**Other demo users** (spread across schools for browse/find demos)

| Email | School |
|-------|--------|
| `alex@auburn.edu` | Georgia Tech |
| `sam@auburn.edu` | The University of Alabama |
| `henry@auburn.edu` | University of Georgia |
| `hailey@auburn.edu` | Clemson University |

All demo passwords above except the dev team use `Password1!`. The seed also includes ~39 meme parody accounts.

## How to run

```bash
npm install
npm run db:reset   # push schema + seed demo data
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

To refresh dev-team accounts on an existing DB without wiping messages:

```bash
npm run db:restore-team
npm run db:patch-demo
```
