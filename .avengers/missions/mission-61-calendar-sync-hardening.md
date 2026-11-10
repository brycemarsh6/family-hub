# Mission 61: Calendar sync PR 3 hardening (Google to Marshee follow-ups)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
**Started:** 2026-11-09 · **Updated:** 2026-11-09

Source: `.avengers/status.md`, "Open, not scheduled", the "Google to Marshee
follow-ups (mission 60 Delivery)" entry, from Vision's pass 4 notes in
`.avengers/missions/mission-60-calendar-sync-pr3.md`. Branch
`claude/calendar-sync-pr3-hardening`, from `main` at `75cc76c`.

## Brief

- **Goal:** close five hardening notes on the Google to Marshee pull.
  1. A failed handover turns the calendar back off and returns an error.
  2. The handover keeps the sibling's sync row (not the target's) when the
     event's source is that sibling.
  3. The one-link race check compares a turn-on stamp the pull never bumps.
  4. The event sheet hides "On Google" for the source calendar by id.
  5. `calendarPullRun.test.ts` (362 lines) is split by concern.
- **Done means:** the five above, each with a test where the logic is pure;
  Gauntlet green; Vision and Captain PASS; PR merged; production deploy
  checked; `git log origin/main..HEAD` empty.
- **Out of scope:** the two notes that need new words on screen ("Up to
  date" beside the reconnect banner; a reason on the locked "Already synced
  through" row). They wait for Bryce's wording and stay in status.md.
  Deleting the orphaned Google twin a dropped target row pointed at (needs a
  Google call; see C1 note).
- **No new words on screen.** Fix 1 reuses the existing `GENERIC_ERROR`.

## Danger register

- No agent or test ever calls Google for real.
- Never read `.env` (it is the main checkout's, gitignored). Local dev is the
  Neon `dev` branch; host check before any migrate is done by reading the
  host Prisma itself prints (`npx prisma migrate status`), expected
  `ep-hidden-pine-`. Any other host: stop.
- Migrations additive only. Stark writes the SQL with `prisma migrate diff`
  and never runs a migration; Fury reviews and alone runs
  `npx prisma migrate deploy` against dev.
- No `db:seed` / `db:reset`. The dev branch holds real family data.
- Never `git add -A` / `git add .`; stage by explicit path.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`
- Record check: `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- Stark + Vision (always).
- Captain: a test file split and a new migration file.
- Strange out: no visible change (fix 4 only changes which existing line is
  hidden, and only when two calendars share a name).
- Banner out: Fury read the five spots inline.

## Contracts

C1, C2 and C3 have disjoint boundaries and run in parallel.

### C1 - handover and race hardening (fixes 1, 2, 3)
- **Status:** DONE
- **Boundaries:** (preflight flags schema.prisma over the cap; STRUCTURE.md exempts the schema as one declarative file.) may touch: `src/app/actions/linkedCalendars.ts`,
  `src/lib/linkedCalendarWrites.ts`, `src/lib/linkedCalendarsRead.ts`,
  `src/lib/calendarSyncRules.ts`, `src/lib/calendarSyncRules.test.ts`,
  `prisma/schema.prisma` (the `LinkedCalendar` model only), new
  `prisma/migrations/20261118000000_calendar_turned_on/migration.sql`.
  Must not touch: anything else; no `prisma migrate` command (diff only),
  no `db:seed`, `db:reset` or other db script, no Google call, no `.env` read.
- **Design:**
  1. `setCalendarDirection` action: wrap `adoptSiblingPulls` in try/catch;
     on a throw, write direction "off", `refresh()`, return
     `{ error: GENERIC_ERROR }`. Nothing else in the flow changes.
  2. `planHandover` takes target rows `{ id, eventId }[]` and sibling rows
     `{ id, eventId, sourceIsSibling: boolean }[]` (true when the event's
     `sourceLinkedCalendarId` is one of the sibling ids, read inside the
     transaction before the source update). For an event with a target row
     and a sibling row whose `sourceIsSibling` is true, the first such
     sibling row moves and the target row is dropped (the sibling row points
     at the original Google event; the target's is a "Marshee to Google"
     twin). Otherwise today's rule holds (target row kept, sibling dropped;
     two sibling rows for one event: the first moves). `drop` may now hold
     target row ids. Deletes stay before moves.
  3. Additive column `LinkedCalendar.turnedOnAt DateTime?` (doc comment:
     when this link was last turned on from "off"; the race check reads it;
     the pull never writes it). `setCalendarDirection` write: "off" clears
     it to null; any other direction stamps it only when it is null (a
     oneWay to twoWay switch keeps the original stamp). The write returns
     the row's `turnedOnAt`. `loadSiblingCalendars` returns `turnedOnAt`
     instead of `updatedAt`. `raceWinner` compares `turnedOnAt`, with null
     counting as earlier than any stamp (a link turned on before this column
     existed was on first); ties broken by lower id as now. No data backfill.
- **Verification:** the Gauntlet; `npx prisma migrate diff
  --from-migrations prisma/migrations --to-schema-datamodel
  prisma/schema.prisma --script` before writing the SQL matches the file
  (if the flag form differs in this Prisma, use the one that works and say
  which); new tests in `calendarSyncRules.test.ts` for the twin case, the
  unchanged cases, and `raceWinner` with null and stamped values.
- **Evidence required:** gauntlet outputs with test counts (both
  timezones), the migration SQL in full, the diff of the action function.
- **Done criteria:** SQL is a single `ADD COLUMN` on `LinkedCalendar`; no
  remaining read of `updatedAt` in the race path (grep); tests fail if the
  twin rule is reverted.

### C2 - "On Google" hidden by id (fix 4)
- **Status:** DONE
- **Boundaries:** may touch: `src/lib/types.ts` (the event view and
  `CalendarEventSyncView` only), `src/lib/calendarEventQuery.ts`,
  `src/components/EventDetailSheet.tsx`, and one new pure helper with its
  test if Stark wants the filter testable (new `src/lib/eventSheetSyncs.ts` + new
  `src/lib/eventSheetSyncs.test.ts`). Must not touch: anything else.
- **Design:** add `linkedCalendarId: string` to `CalendarEventSyncView` and
  `sourceLinkedCalendarId?: string | null` to the event view, built in
  `calendarEventQuery.ts` from the existing selects (these are Marshee row
  ids, never Google ids; update the "Name only, never an id" comments to
  say so). The sheet filter compares ids. Update its comment. Check every
  other producer of `CalendarEventSyncView` / the event view still compiles
  (grep `syncs:` builders, including Try again's `getEventSyncViews`).
- **Verification:** the Gauntlet.
- **Evidence required:** outputs, grep of every place that builds the two
  types, the diff.
- **Done criteria:** no `calendarName ===` comparison left in the sheet; two
  calendars with one name can no longer hide each other's line.

### C3 - split `calendarPullRun.test.ts` (fix 5)
- **Status:** DONE
- **Boundaries:** may touch: `src/lib/calendarPullRun.test.ts` and new
  sibling test files (new), named calendarPullRun plus the concern plus .test.ts.
  Must not touch: anything else (no logic change, no package.json change:
  `src/lib/*.test.ts` already covers the new files).
- **Design:** by STRUCTURE.md's test split rule: the bare name keeps the
  primary concern; each split file names its concern; every header names the
  module and its siblings. Shared fakes go in whichever file is the clear
  owner or are repeated if tiny; do not add a non-test helper module.
- **Verification:** the Gauntlet; test count unchanged versus `main` (Fury
  measured on main at 75cc76c: 1749 in Denver; calendarPullRun.test.ts alone: see dispatch).
- **Evidence required:** before and after counts, `wc -l` of each file.
- **Done criteria:** same count, every file under 300 lines.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-09: mission opened, C1 to C3 written and dispatched in parallel.
- 2026-11-09: C1, C2, C3 DONE. C1: SQL is one `ADD COLUMN "turnedOnAt"
  TIMESTAMP(3)`; Prisma 7.9 renamed `--to-schema-datamodel` to `--to-schema`
  and diffing from migrations needs a shadow database, so Stark diffed the
  HEAD schema against the new one offline (same SQL). C2: no helper file (a
  one-line id filter). C3: 17 + 6 = 23 tests, files 216 and 222 lines.
  Fury: gauntlet green (tsc, eslint, 1754 Denver, 1754 UTC with 7 skipped,
  build). `prisma migrate status` host `ep-hidden-pine-` (dev); the dev
  database also holds `20261116000000_screensaver_settings` from the
  parallel screensaver chat. `prisma migrate deploy` to dev was refused by
  the auto mode safety check: not applied to dev, asked Bryce. Production
  applies it in the Vercel build on merge.

## Delivery

- **Shipped:**
- **Shipped check:**
- **Deliberate leftovers:**
