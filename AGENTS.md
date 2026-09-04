<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Danger register — read before running ANY command

This applies to every agent and every tool (Claude, Codex, anything else)
working in this repo:

- **Local dev runs against the Neon `dev` branch** (a copy-on-write clone
  of production; split done and isolation-proven 2026-09-01). The
  production connection string lives ONLY in Vercel's env vars — no dev
  environment should ever hold it. If you find a `DATABASE_URL` whose host
  is not the dev branch endpoint, stop and say so.
- **`npm run db:seed` / `npm run db:reset` remain forbidden by default.**
  Against the dev branch they destroy "only" the disposable copy — but the
  copy is what makes dev data realistic, and a branch reset (Neon console)
  is the sanctioned way to refresh it. The scoped `db:seed-*` /
  `db:clean-*` scripts, which refuse to delete what they didn't create,
  are still the only test-data mechanism.
- **The dev branch contains a real snapshot of family data** — including
  password hashes and personal info. Isolation stops *writes* from reaching
  production; it does not make the data fake. Treat it as private.
- **NEVER write a clean/reset script for the `User` table.** It holds the
  family's credentials.
- Database migrations are **additive only**; review the SQL before applying.
- Secrets live in `.env` (gitignored) and Vercel env vars only — never in
  git, chat, or code.
- Pushing `main` deploys to the family's production app on Vercel.

- **The test script pins `TZ=America/Denver` inside `package.json`**, so
  `TZ=UTC npm test` silently runs Denver twice. Only the direct
  `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  proves both timezones.
- **`package.json`'s test glob is a hand-enumerated two-directory list, not
  recursive.** Any new test directory must ship its glob entry in the same
  commit, or its tests silently vanish from `npm test` **and CI** while the
  suite still reports green at a lower count.

Full context and history: CLAUDE.md. Design rules: DESIGN.md. Structure
rules: STRUCTURE.md. **Calendar work: read
`.avengers/plans/calendar-v2.md` first** — it supersedes the K3–K7 ordering
in `calendar-v1.md`.
