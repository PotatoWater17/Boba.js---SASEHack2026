# Revert motion animations

These animations are isolated in `src/motion/` for easy removal.

## Quick revert

1. Remove this line from `src/app/layout.tsx`:
   ```ts
   import "../motion/motion.css";
   ```

2. Delete the folder `src/motion/` and this file (`REVERT-MOTION.md`).

3. Remove motion class names from pages (search for `motion-`):
   - `src/app/page.tsx` — hero stagger classes
   - `src/app/dashboard/page.tsx` — page enter + list stagger
   - `src/app/find/page.tsx` — page enter + hub stagger
   - `src/app/find/buddies/page.tsx` — page enter + match list stagger
   - `src/app/profile/[id]/page.tsx` — page enter

## Git revert (if committed together)

```bash
git revert <commit-sha>
```

Or restore specific files:

```bash
git checkout HEAD~1 -- src/app/layout.tsx src/app/page.tsx src/app/dashboard/page.tsx src/app/find/page.tsx src/app/find/buddies/page.tsx src/app/profile/[id]/page.tsx
rm -rf src/motion REVERT-MOTION.md
```

## What was added

| Feature | Classes | Pages |
|---------|---------|-------|
| Hero load stagger | `motion-hero-item`, `motion-hero-d1`…`d6` | About (`/`) |
| Page enter | `motion-page-enter` | Dashboard, Find, Find Buddies, Profile |
| List stagger | `motion-stagger-item` + `--motion-delay` | Buddy matches, dashboard friends, find hub |
