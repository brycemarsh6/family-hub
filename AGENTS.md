<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Danger register — read before running ANY command

This applies to every agent and every tool (Claude, Codex, anything else)
working in this repo:

- **The dev `DATABASE_URL` currently points at the LIVE family database** —
  real household inventory (~467 items), real family accounts. Until a
  dev/prod database split exists (Neon branching — planned), treat every
  database write as touching production.
- **NEVER run `npm run db:seed` or `npm run db:reset`.** They replace the
  family's real inventory with sample data. Test data goes only through the
  scoped `db:seed-*` / `db:clean-*` scripts, which refuse to delete what
  they didn't create.
- **NEVER write a clean/reset script for the `User` table.** It holds the
  family's credentials.
- Database migrations are **additive only**; review the SQL before applying.
- Secrets live in `.env` (gitignored) and Vercel env vars only — never in
  git, chat, or code.
- Pushing `main` deploys to the family's production app on Vercel.

Full context and history: CLAUDE.md. Design rules: DESIGN.md. Structure
rules: STRUCTURE.md.
