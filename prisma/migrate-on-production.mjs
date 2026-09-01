// Runs the database migrations during a Vercel *production* build, and
// deliberately does nothing anywhere else.
//
// Why this exists: since 2026-09-01 local dev runs against a Neon `dev`
// branch, so migrating locally no longer migrates production. Something has
// to apply new migration files to the real database at release time, and the
// Vercel build is the one moment that reliably has the production
// DATABASE_URL and runs exactly once per release. This is that moment.
//
// Why the guard: Vercel also builds a preview deployment for every pull
// request, and DATABASE_URL is set for Preview too. Without the check below,
// opening a PR that adds a migration would apply it to production before the
// PR was reviewed or merged. VERCEL_ENV is set by Vercel itself ("production",
// "preview", or "development") and is unset on a laptop and in CI, so both of
// those skip too. CI uses a dummy DATABASE_URL that cannot connect — that's
// fine, because CI never reaches the migrate command.
//
// Why it's safe for the old code still serving during the build: migrations
// in this repo are additive only (see the danger register in AGENTS.md), so
// code that predates a new table or column simply never touches it.
//
// If `prisma migrate deploy` fails, this script exits non-zero, the Vercel
// build fails, and the previous deployment keeps serving. Nothing half-done
// ever goes live — the failure is loud on purpose.
//
// Plain Node, no imports beyond the standard library, so it runs before
// anything else in the project is guaranteed to be installed or generated.

import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;

if (env !== "production") {
  console.log(
    `migrate-on-production: VERCEL_ENV is ${
      env ? `"${env}"` : "unset"
    } — skipping \`prisma migrate deploy\` (only runs for "production").`,
  );
  process.exit(0);
}

console.log(
  'migrate-on-production: VERCEL_ENV is "production" — running `prisma migrate deploy`.',
);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});

if (result.error) {
  console.error("migrate-on-production: could not start prisma:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
