# Demo data reference

**Source of truth:** `prisma/seed.ts` (full wipe + recreate).  
**Account profiles (git backup):** `prisma/accounts.snapshot.json` — all 51 live demo users + friendships.  
**Non-destructive add-ons:** `scripts/patch-demo-world.ts`, `scripts/seed-ryan-friends.ts`, `scripts/restore-team.ts`.

Use this doc to restore demo profiles, friendships, DMs, and group chats after schema changes or accidental DB edits.

---

## Quick restore

### Full demo (recommended for judges / fresh clone)

```bash
npm run db:demo-full
```

Runs `db:reset` (schema + seed), `db:ryan-friends` (Ryan’s buddy list + DMs), `db:restore-accounts` (sync profiles from `prisma/accounts.snapshot.json`), and `db:backfill-online` (online/in-person tags on meetings).

Optional — re-download profile photos (needs network):

```bash
npm run db:refresh-avatars
```

### Without wiping existing data

```bash
npm run db:restore-team    # dev accounts + dev↔dev friendships
npm run db:patch-demo      # universities, exam fields, dev meetups, dev DMs
npm run db:ryan-friends    # Ryan’s ~18 buddies + Ryan DMs
npm run db:backfill-online # set isOnline from location (after patch/meme scripts)
npm run db:refresh-avatars # optional
```

---

## Password cheat sheet

| Account type | Password |
|--------------|----------|
| Dev team (`ryanh`, `aidenb`, `bryanm`, `danielk`) | `RyanH`, `AidenB`, `BryanM`, `DanielK` |
| Everyone else (Jordan, cross-school users, all meme accounts) | `Password1!` |

All accounts use `@auburn.edu` emails (meme accounts too — they’re Auburn parodies).

---

## Dev team (admin, Auburn)

All four are `isAdmin: true` and fully friends with each other.

| Email | Password | Name | Year | Major | needHelp | canHelp |
|-------|----------|------|------|-------|----------|---------|
| `ryanh@auburn.edu` | `RyanH` | Ryan H | Junior | Computer Science | Calc 2 | Intro to Programming |
| `aidenb@auburn.edu` | `AidenB` | Aiden B | Sophomore | Computer Science | Data Structures | Intro to Programming |
| `bryanm@auburn.edu` | `BryanM` | Bryan M | Junior | Software Engineering | Physics 1 | Software Engineering |
| `danielk@auburn.edu` | `DanielK` | Daniel K | Sophomore | Computer Science | Discrete Math | Calc 1 |

**Bios**

- Ryan: “Dev. Usually in the library or on a whiteboard.”
- Aiden: “Dev. Down to grind practice problems.”
- Bryan: “Dev. Exam reviews and late night debugging.”
- Daniel: “Dev. Looking for a regular study crew.”

**Best login for demos:** `ryanh@auburn.edu` / `RyanH` → `/friends`, `/dashboard`, `/admin`

---

## Core demo users (cross-school browse / find)

| Email | Password | Name | School | Year | Major |
|-------|----------|------|--------|------|-------|
| `jsmith@auburn.edu` | `Password1!` | Jordan Taylor (they/them) | Auburn University | Sophomore | Computer Science |
| `alex@auburn.edu` | `Password1!` | Alex Nguyen (he/him) | Georgia Tech | Junior | Software Engineering |
| `sam@auburn.edu` | `Password1!` | Sam Rivera (she/her) | The University of Alabama | Freshman | Computer Science |
| `henry@auburn.edu` | `Password1!` | Henry Park (he/him) | University of Georgia | Junior | Computer Science |
| `hailey@auburn.edu` | `Password1!` | Hailey Brooks (she/her) | Clemson University | Sophomore | Mathematics |

**Jordan (`jsmith`) — main judge demo account**

- Bio: Sophomore CS, whiteboard sessions, calc/discrete grind.
- needHelp: Calc 2, Physics 1 · canHelp: Intro to Programming, Discrete Math
- Exam prep: Calc 2 · topics: Series, U-substitution, Integration by parts · style: Exam review

**Alex** — Exam: Data Structures (trees, heaps, Big-O) · style: Practice problems  
**Sam** — Exam: Calc 2 (U-sub, polar) · style: Homework help  
**Hailey** — Exam: Calc 2 (series, Taylor) · style: Exam review  
**Henry** — No exam fields seeded (Physics 1 needHelp)

---

## Meme / parody accounts (39 total)

All at **Auburn University**. Password: **`Password1!`** for every account.

| Email | Display name |
|-------|--------------|
| `zuck.meme@auburn.edu` | Mark Zuckerborg |
| `elon.tusk@auburn.edu` | Elon Tusk |
| `tswift.stan@auburn.edu` | Tay Swiftie |
| `drizzy.meme@auburn.edu` | Drizzy SixGod |
| `ye.west.meme@auburn.edu` | Ye Best |
| `beyonce.meme@auburn.edu` | Bea Yoncé |
| `napoleon.meme@auburn.edu` | Napoleon Bonapart |
| `abe.honest@auburn.edu` | Abe Honest |
| `shakespeare.meme@auburn.edu` | Will ShakeSpeare |
| `cleo.patra@auburn.edu` | Cleo Patra |
| `donny.trunk@auburn.edu` | Donny Trunk |
| `joe.byden@auburn.edu` | Joe Byden |
| `jeff.bezos.meme@auburn.edu` | Jeff Bezos |
| `bill.gates.meme@auburn.edu` | Bill Gate$ |
| `ari.grande.meme@auburn.edu` | Ari Grande |
| `travis.scotty@auburn.edu` | Travis Scotty |
| `al.einstein@auburn.edu` | Al Einstein |
| `soc.rattes@auburn.edu` | Soc Rattes |
| `kendrick.lamar.meme@auburn.edu` | Ken Duckworth |
| `timothee.chalamet.meme@auburn.edu` | Timmy Chalamet |
| `mr.beast.meme@auburn.edu` | Jimmy Beast |
| `duo.lingo@auburn.edu` | Duo Owl |
| `gordon.ramsay.meme@auburn.edu` | Gordon Ramsey |
| `walter.white.meme@auburn.edu` | Walter White |
| `oppenheimer.meme@auburn.edu` | J. Oppenheimer |
| `steve.jobs.meme@auburn.edu` | Steve Jobs |
| `gabe.newell@auburn.edu` | Gabe Newell |
| `wednesday.addams@auburn.edu` | Wednesday Addams |
| `michael.scott@auburn.edu` | Michael Scott |
| `chatgpt.meme@auburn.edu` | Chat GPT |
| `barbie.meme@auburn.edu` | Barbie Roberts |
| `shrek.meme@auburn.edu` | Shrek Swamp |
| `naruto.meme@auburn.edu` | Naruto Uzumaki |
| `lana.del.rey@auburn.edu` | Lana Del Rey |
| `charli.xcx@auburn.edu` | Charli XCX |
| `marie.curie@auburn.edu` | Marie Curie |
| `leonardo.da.vinci@auburn.edu` | Leo Da Vinci |
| `rihanna.meme@auburn.edu` | Rihanna Fenty |
| `sabrina.carpenter@auburn.edu` | Sabrina Carpenter |

Full bios, pronouns, majors, needHelp/canHelp: see `MEME_ACCOUNTS` in `prisma/seed.ts`.  
Profile photos: Wikipedia thumbnails where mapped in `MEME_WIKI`, else random portrait API.

---

## Friendships

### Jordan (`jsmith@auburn.edu`)

| Buddy | Status |
|-------|--------|
| Alex Nguyen | accepted |
| Henry Park | accepted |
| Hailey Brooks | accepted |
| Sam Rivera | **pending** (Sam → Jordan) |
| Mark Zuckerborg (zuck) | accepted |
| Tay Swiftie (taylor) | accepted |
| Drizzy SixGod | **pending** (Drake → Jordan) |
| Jimmy Beast (mr.beast) | accepted |
| Duo Owl | accepted |
| Chat GPT | **pending** (ChatGPT → Jordan) |

### Dev team

All pairs among Ryan, Aiden, Bryan, Daniel: **accepted**.

### Ryan (after `db:ryan-friends`)

**Accepted (Ryan sent request):** Jordan, Alex, Sam, Henry, Hailey, Zuck, Taylor, MrBeast, Duo, ChatGPT, Gordon  
**Pending (they sent to Ryan):** Elon, Drake  
**Pending (Ryan sent):** Abe, Naruto  

Plus dev team (4) → ~18 total buddy edges on Ryan’s `/friends`.

---

## Direct messages (DMs)

### Dev team ↔ dev team (seed + patch)

| From | To | Message |
|------|-----|---------|
| Ryan | Bryan | Library at 7? Calc 2 grind |
| Aiden | Daniel | Did you finish the DS homework? |
| Bryan | Ryan | Yeah I'll grab the whiteboard room |
| Daniel | Aiden | Almost — meet at the group I posted? |

### Jordan inbox (log in as `jsmith@auburn.edu`)

| From | Message | Seen |
|------|---------|------|
| Alex | Hey! | yes |
| Henry | We're so cooked 😭 | yes |
| Hailey | Can you share the Quizlet? | yes |
| Zuck | Hello fellow students. I am normal. Join my metaverse study pod? | yes |
| Taylor | bestie are we still on for the chem grind tonight 💅 | yes |
| Elon | Thinking about acquiring your flashcards. Thoughts? | **no** |
| Abe | Four score and seven problems. Meet at the library? | yes |
| Duo | 👀 You forgot your Spanish streak. I'm outside. | **no** |
| MrBeast | I'm giving $1000 to whoever joins my 24-hour library livestream study session | yes |
| Gordon | Your last lab report was an IDIOT SANDWICH. Fix it and meet me at 6. | **no** |
| ChatGPT | Hello! I'd be happy to help explain u-substitution… want to grind Calc 2? | yes |
| Walter | Jesse. We need to cook… up a study plan for Chem. | yes |

### Ryan inbox (after `db:ryan-friends`, log in as `ryanh@auburn.edu`)

| From | To | Message | Seen |
|------|-----|---------|------|
| Jordan | Ryan | Yo Ryan — Calc 2 study tonight? | **no** |
| Ryan | Jordan | Yeah RBD at 7 works | yes |
| Alex | Ryan | Got extra practice exam PDFs if you want them | yes |
| Zuck | Ryan | Join my metaverse study pod? | **no** |
| Taylor | Ryan | bestie are we still on for the chem grind 💅 | **no** |
| Duo | Ryan | 👀 You forgot your streak. Study now. | **no** |

Plus dev-team DMs above when viewing as Ryan.

---

## Group chats (meetings + messages)

Meet dates are relative to seed time (`dayOffset` in seed). Subjects/locations are stable.

### Meme study groups (chaotic group chat)

Seeded via `scripts/meme-meetups.ts` (10 groups). Meme accounts join as members and argue in chat.

| Host | Subject | Drama |
|------|---------|-------|
| Zuck | Intro to Programming | Tech billionaires fight over the whiteboard (Elon, Bill, Steve, Gabe, ChatGPT) |
| Taylor | Chemistry 101 | Gordon vs Walter “cooking” + Duo stalking + MrBeast bribes |
| Kendrick | Calc 2 | Kendrick vs Drake beef during u-sub review |
| Shakespeare | English Comp | Shakespeare vs ChatGPT citation war + Michael Scott |
| Oppenheimer | Physics 1 | Existential dread vs Einstein vs Elon on Mars |
| MrBeast | Calc 2 | 24-hour integration livestream with Naruto & Travis Scott |
| Socrates | Philosophy | Politicians argue; nobody studies |
| Beyoncé | Statistics | Beyoncé vs Bezos on group project leadership |
| Marie Curie | Chemistry 1 | Gordon yells at everyone in lab prep |
| Shrek | Biology | “Get out of my swamp study room” |

Add on existing DB: `npm run db:meme-meetups` (idempotent). Included automatically in `db:reset` / seed.

### Featured groups (good for live demo)

| Host | Subject | Location | University | Members | Sample chat |
|------|---------|----------|------------|---------|-------------|
| Alex | Calc 2 | CULC, 2nd floor study pods | Georgia Tech | Alex, Sam, Jordan | Tech meetup, Tuscaloosa drive, Auburn squad |
| Ryan | Calc 2 | RBD Library, 3rd floor | Auburn | Ryan, Aiden, Bryan, Daniel | Practice exam / print copies / room 302 |
| Aiden | Data Structures | Shelby Center lobby | Auburn | Aiden, Ryan, Daniel | “Posted this for the team” |
| Bryan | Software Engineering | Student Center, room B | Auburn | Bryan, Ryan, Aiden | Group project demo run-through |
| Daniel | Discrete Math | RBD Library, group study | Auburn | Daniel, Aiden, Bryan | Stuck on problem 4? |
| Henry | Physics 1 | Main Library, west wing | UGA | Henry | Looking for quiz partner |
| Hailey | Calc 2 | Cooper Library | Clemson | Hailey, Jordan | Series convergence / drive from Auburn |

### Extra browse filler

Seed also creates **15 additional meetings** (`EXTRA` array in `seed.ts`) hosted by Jordan/Alex/Sam across Auburn, GT, and Bama — various subjects (Calc 2, Physics, Chem, Stats, English, etc.) with mixed group sizes.

---

## npm scripts

| Script | What it does |
|--------|----------------|
| `db:reset` | `prisma db push --force-reset` + `prisma db seed` — **wipes all users, chats, meetups** |
| `db:seed` | Run seed only (no schema reset) |
| `db:demo-full` | `db:reset` + `db:ryan-friends` + `db:restore-accounts` — **full demo in one command** |
| `db:backup-accounts` | Export live DB users → `prisma/accounts.snapshot.json` (commit to git) |
| `db:restore-accounts` | Upsert users + friendships from `prisma/accounts.snapshot.json` (idempotent) |
| `db:restore-team` | Upsert 4 dev accounts + mutual friendships (no wipe) |
| `db:patch-demo` | Fix universities, exam fields, dev/cross-school meetups, dev DMs (idempotent) |
| `db:ryan-friends` | Ryan’s extended buddies + Ryan-specific DMs (idempotent) |
| `db:meme-meetups` | Meme study groups + funny group chat threads (idempotent) |
| `db:refresh-avatars` | Re-fetch profile photos for users missing `photoKey` |

---

## Extra demo accounts (in snapshot)

These are not in `seed.ts` but are restored from **`prisma/accounts.snapshot.json`**:

| Email | Password | Name | University |
|-------|----------|------|------------|
| `spiderman@esu.edu` | `Password1!` | Spider-Man | Stark University |
| `marlon@streamer.edu` | `Password1!` | Marlon Garcia | Streamer University |
| `messi@intermiami.org` | `Password1!` | Lionel Messi | FC Barcelona |
| `cr7@alnassr.org` | `Password1!` | Cristiano Ronaldo | Al Nassr |

---

## Editing demo data

1. Edit profiles in the app (or DB), then run **`npm run db:backup-accounts`** and commit **`prisma/accounts.snapshot.json`**.
2. Change **`prisma/seed.ts`** for meetups, DMs, and base structure on `db:reset`.
3. Change **`scripts/seed-ryan-friends.ts`** for Ryan-only buddy/DM extras.
4. Change **`scripts/patch-demo-world.ts`** for idempotent patches on live DBs.
5. Update **this file** when adding accounts or chat content so the team can restore.

**Do not** rely on manual DB edits alone — run `db:backup-accounts` and commit the snapshot so GitHub/demo clones get the same users.
