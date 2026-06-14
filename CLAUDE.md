# Tracker — working agreement

## Git / deploy workflow (IMPORTANT)
- **Always show the changes here in chat and wait for explicit approval before committing.**
- **Never push or deploy without the user's OK.** `main` auto-deploys to Vercel production, so a push = a live deploy.
- Show a diff or a clear summary of what changed, then ask before `git commit` / `git push`.

## Data safety (hard-won)
- The user's real data lives in **Supabase cloud**, read by the deployed Vercel app.
- **Never connect the dev/preview build to the production Supabase.** No `.env.local` pointing at prod. The Supabase anon key goes only in Vercel env vars, never committed.
- The Claude preview is a throwaway **sandbox** (no Supabase) — seeding it never touches the user's cloud, but don't claim otherwise without checking.
- Cloud sync is last-write-wins with a `realDataCount` guard so an empty cloud can't overwrite real local data (see `cloudSync.ts`).
- For any data change to the user's real cloud: have them **export → I merge into their actual JSON → they re-import**. Don't write to their cloud blind, and don't use overwrite-imports against partial data.

## Architecture notes
- React 18 + TS + Vite + Zustand (persist → localStorage, key `tracker:v1`). Transient UI state in `src/ui.ts`.
- Two distinct concepts: **entries** (billable time, powers Reports/Invoices) vs **scheduledTasks** (planner tasks, powers DayView + Projects task list). They are NOT the same — Reports = entry history; Projects "Tasks" = planner tasks only.
- New UI uses `w-`/`wk-` prefixed CSS classes to avoid clashing with legacy styles.
- Realize billing is tiered: first 100h @ $100/hr, hours over 100 @ $80/hr.
