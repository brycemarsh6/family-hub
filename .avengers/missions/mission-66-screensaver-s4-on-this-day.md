# Mission 66: Screensaver S4, "On this day"

**Project:** family-hub (Marshee)
**Status:** DELIVERING
**Started:** 2026-11-10 · **Updated:** 2026-11-10

## Brief

- **Goal:** slideshow photos taken on today's date in an earlier year show
  early in each shuffle round, and their date line reads "2 years ago today".
  Plan: `.avengers/plans/screensaver-slideshow-v1.md` (S4).
- **Done means:** on the Tablet's slideshow, a photo whose `takenOn` month
  and day match today in Denver (earlier year) is picked before any other
  photo in each round, and shows "A year ago today" / "N years ago today" in
  a warm yellow in place of the date; other photos are unchanged; the
  gauntlet passes in both timezones; it is live on production.
- **Out of scope:** a new setting or switch, any schema change, a date window
  wider than one day, the S2 and S3 open notes.

## Bryce's decisions (2026-11-10)

Approved the mock [On This Day mock](https://claude.ai/artifact/FDwcGJmqQbraf7146MWSvF)
with Fury's four picks:

1. **Which photos count:** same month and day as today (Denver), any earlier
   year. A February 29 photo counts on February 28 in non-leap years. Photos
   with no `takenOn` never count. A photo taken earlier today (same year) is
   not a memory.
2. **How early:** in every shuffle round, today's matching photos that have
   not shown this round are picked first (randomly among themselves), then
   the rest shuffle as before. The match is worked out at each pick, so
   midnight moves to the new day's photos without a restart.
3. **Words:** "A year ago today" for 1, "N years ago today" for 2 or more.
   They replace the normal taken date on that photo only, in a warm yellow,
   and follow the existing "When it was taken" switch (off: no date line).
4. **No new switch**, no database change.

## Team

Stark + Vision + Strange (a visible change). Captain not assembled: no new
files, no new module, a small diff; Vision carries file length and
dependency direction.

## Danger register

As AGENTS.md: no `db:seed` / `db:reset`, no production database, stage by
explicit path, no push to `main`. This mission writes no data.

## Gauntlet

`npx tsc --noEmit`, `npx eslint .`, `npm test`, the direct UTC run from
AGENTS.md, `npm run build`.

## Contracts

### C1: the rule, the words and the slide

- **Objective:** add the "on this day" rule and words to the pure screensaver
  module and use them in the slideshow.
- **May touch:** `src/lib/screensaver.ts`, `src/lib/screensaver.test.ts`,
  `src/components/ScreensaverSlide.tsx`.
- **Must not touch:** everything else, including `prisma/`, the host,
  settings pages and docs.
- **Build:**
  - `yearsAgoToday(takenOn: string | null, today: CalendarDate): number | null`
    (pure): years since the photo when month and day match `today` (Feb 29
    matches Feb 28 when `today.year` is not a leap year) and the photo's
    year is earlier; else null. Bad or null text gives null.
  - `formatTakenLine(takenOn, today)` returning
    `{ text: string; onThisDay: boolean } | null`: the "ago" words when
    `yearsAgoToday` is a number, else `formatTakenOn`'s text.
  - Words in `SCREENSAVER_WORDS` (`yearAgoToday: "A year ago today"` and a
    `yearsAgoToday(n)` form or equivalent), nowhere else.
  - `pickNextPhoto` gains an optional `firstIds` argument (default empty):
    while any id in `firstIds` is usable and not shown this round, pick only
    among those. Existing behaviour unchanged when it is empty, including
    "never open a new round with `lastId`" (unless that is the only photo).
  - `ScreensaverSlide`: at each pick, compute today with
    `calendarDateInZone(new Date(), HOUSEHOLD_TIME_ZONE)` and pass the ids of
    photos with a non-null `yearsAgoToday` as `firstIds`. `PhotoLayer` uses
    `formatTakenLine`; an on-this-day line uses a warm yellow (for example
    `text-amber-200`, full opacity, medium weight) instead of `text-white/80`.
  - Update the header comment of `screensaver.ts` if it lists contents.
- **Verification:** the gauntlet. New tests cover: match, 1 year vs N years
  words, same-year today is null, different day null, null and bad text,
  Feb 29 on Feb 28 in a non-leap year and not on Feb 28 in a leap year,
  `firstIds` picked first, then the rest, round reset still avoids `lastId`.
- **Evidence:** test counts before and after for `npm test` and the UTC run,
  tsc/eslint/build output tails, the diff stat.
- **Done:** all of the above pass, and only the three files changed.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1 | Stark | DONE | none | 3 files; +5 tests (1787 to 1792) |
| 1 | Vision (HEAD f0a592a) | PASS | none | Re-ran: tsc 0, eslint 0, `npm test` 0 (1792), UTC 0 (1792, 1785 pass, 7 DST skips), build 0. Denver today, Feb 29, `firstIds` vs no-repeat and `lastId`, failed photos, midnight rollover all checked. Notes: the number 65 was already taken on main by `mission-65-calendar-pinch-zoom.md` (renamed this file to 66, Fury rechecked origin/main); records sat outside C1's may-touch list (Fury's own, inert); a memory picked at 11:59 PM keeps its words up to one photo past midnight (by design); `text-amber-200` is a raw colour, consistent with the overlay's raw white. |
| 1 | Strange (HEAD f0a592a, stand-in markup on the dev server, no Tablet login) | PASS | none | Amber line 10.1 to 11.9:1 on orange and pink, 8.5 worst on white, 16.9 on black, clock on (the default); higher than the white/80 line it replaces at 1366x1024 and 1180x820. Reads as part of the same block, a step above the caption subline, not loud. Notes: contrast computed from compiled colours, not sampled pixels; already true before S4: with the clock switched off, both date lines fall to about 2.4 to 3.5:1 on bright photos (caption gradient only), a separate small fix; on yellow photos the hue blends but contrast holds. Not seen: the real Tablet mount, real photos, the crossfade, midnight rollover, the tablet's screen. |

## Delivery

- **What shipped:** `yearsAgoToday`, `formatTakenLine` and `firstIds` on
  `pickNextPhoto` in `src/lib/screensaver.ts`, used by
  `src/components/ScreensaverSlide.tsx`; 5 tests. Also mission 64's shipped
  check (PR #105), CLAUDE.md's Screensaver line, `docs/structure/slideshow.md`
  and Bryce's tablet check in `.avengers/status.md`.
- **Not seen yet:** the Tablet login's real slideshow with a real anniversary
  photo (on Bryce's checklist).
- **Open notes for later:** with "Clock and date" off, the caption and date
  lines are hard to read on bright photos (Strange; existed before S4; fix
  by giving the caption gradient the clock shade's stops).
- This was the plan's last PR: `.avengers/plans/screensaver-slideshow-v1.md`
  is finished.

- **Shipped check:** (filled at merge.)
