# Marshee

[![CI](https://github.com/brycemarsh6/family-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/brycemarsh6/family-hub/actions/workflows/ci.yml)

A private web app for the family: groceries and pantry inventory today, with
room to grow into a shared calendar, chore charts, recipes, and more.

This README is written for future-you, not just other developers — it explains
*why* things are set up this way, not just *how* to run them.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Leave that terminal window running while you
work — it's the "kitchen" that serves the pages, and it reloads automatically
whenever you save a file.

The very first time, if there's no `.env` file yet:

```bash
cp .env.example .env
```

This just tells the app where its database file lives. It's excluded from git
(see "Why some files aren't saved to git" below) so every clone of the project
needs its own copy — copying the example is that copy.

## What's actually in here

| Folder | What it is |
|---|---|
| `src/app/` | Every page you can visit. `layout.tsx` at the root wraps the whole app (just the logo bar); each branch folder (e.g. `kitchen/`) has its own `layout.tsx` for that branch's own nav |
| `src/app/actions/` | The functions that change the database (add an item, check something off, etc.) |
| `src/components/` | Reusable pieces of screen — a row, a stepper, the nav bar |
| `src/lib/` | Shared plumbing: the database connection, and the list of categories/locations |
| `prisma/schema.prisma` | The one file that describes the shape of our data |
| `prisma/dev.db` | The actual database — a single file, not committed to git (see below) |

**A rule this project follows:** the list of categories and storage locations
lives in exactly one place, `src/lib/constants.ts`. Every dropdown, filter, and
heading reads from that list. Want a fifth storage location, or a tenth
category? Add one line there and it shows up everywhere automatically.

## The technology, and why

- **Next.js** — the framework. It's what turns the files in `src/app/` into an
  actual website, and lets a button click run code on the server without us
  writing a separate backend.
- **TypeScript** — JavaScript with a built-in proofreader. It catches typos and
  mismatched data *before* you run the app, not after something breaks.
- **Tailwind CSS** — styling written directly on the element it affects
  (`className="text-lg font-bold"` instead of a separate stylesheet). Easier to
  see cause and effect while learning.
- **Prisma** — the translator between our code and the database. `prisma/schema.prisma`
  describes the data once; Prisma generates the code we use to read and write it.
- **SQLite** — the database itself, for now. It's a single file
  (`prisma/dev.db`) with nothing to install or log into. See "Going online"
  below for why this will eventually change.

## Two things this schema deliberately avoids

Reusable knowledge, not just trivia — this is the kind of thing that saves a
rewrite later:

1. **No "enum" types in the database schema.** An enum would be a nice way to
   say "category can ONLY be one of these five words" at the database level.
   But SQLite doesn't support them, and this project will move to a different
   database eventually (see below). So instead, the database just stores plain
   text, and `src/lib/constants.ts` is what enforces the valid list, in
   TypeScript, before anything is saved.
2. **No database-specific column types.** Keeping to the plainest possible
   column types (text, numbers, true/false, dates) means the schema works
   unchanged on SQLite, Postgres, or MySQL.

Both rules exist for the same reason: **today's database is temporary, and the
schema is written so switching databases later is a small, boring change
instead of a rewrite.**

## Going online (a future step, not done yet)

Right now the database is a file on this laptop, and there's no login — anyone
who could reach the app could see and change everything. That's fine as long
as it *only* runs here. Two things have to happen before this goes on the
internet or the kitchen tablet joins over Wi-Fi:

1. **Move the database.** Swap SQLite for a hosted Postgres database (Neon and
   Supabase both have free tiers). Because of the two rules above, this is
   mostly: change `DATABASE_URL` in `.env`, swap the adapter in `src/lib/db.ts`,
   and run `npx prisma migrate deploy` once against the new database.
2. **Add a login.** Something as simple as one shared family password, or
   real individual accounts — but *something*, before the app is reachable by
   anyone other than you on this laptop.

## Useful commands

```bash
npm run dev         # start the app for development
npm run build       # check that it builds cleanly for real use
npm run lint        # check code style / catch likely mistakes
npm run db:seed     # wipe and refill the database with sample data
npm run db:studio   # opens a visual browser for the database in your browser
npm run db:reset    # wipe the database completely and reapply the schema
```

## Why some files aren't saved to git

Git (via `.gitignore`) is deliberately not tracking a few things:

- **`prisma/dev.db`** — this is *data*, not code. It changes every time you use
  the app, it's personal, and every machine should keep its own copy rather
  than sharing one through version control.
- **`.env`** — will eventually hold a real database password. Secrets don't
  belong in git history, which is effectively permanent and, if this repo is
  ever pushed anywhere public, world-readable.
- **`node_modules/`** and **`src/generated/prisma/`** — both are entirely
  regenerated from `package.json` and `schema.prisma` by `npm install`, so
  saving them would just be dead weight.

## What's not built yet (on purpose)

Calendar, family profiles, chore charts, recipes, meal planning, photos, habit
trackers, sign-in, and putting this on the actual internet. The navigation and
folder structure leave room for all of it, but none of it is stubbed out with
placeholder pages — better to add each piece when it's actually being built.
