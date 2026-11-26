# Mission: Rewards R2, the star flight, its switch and the all-done words

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
**Started:** 2026-11-24 · **Updated:** 2026-11-25
**Branch:** `claude/rewards-r2-earn-animation-991ed6`, cut from main after
PR brycemarsh6/family-hub#124 (R1) merged. R3 (mission 81) runs at the same
time in its own session.

## Brief

- **Goal:** Second PR of `.avengers/plans/rewards-v1.md` (R2 entry). When a
  check pays stars, a ring of gold stars appears at the check, slides and
  shrinks into that person's star bank, and the number counts up. A
  per-login switch turns it off; Reduce Motion always wins. The daily
  confetti gains a short line of words.
- **Done means:**
  1. On the iPad family view the stars land on the bank of the person whose
     check it was (every participant for a Together habit).
  2. On Mine the stars land on the bank in the count line; on a dashboard
     tile (no bank on screen) the ring pops in place.
  3. Fast taps are never blocked: the layer never takes taps, and a second
     tap mid-flight works.
  4. Switch off, or Reduce Motion on, means no flight and no count-up (the
     number changes at once, as in R1).
  5. Un-checking never flies stars; the number drops at once.
  6. The tablet's switch on `/settings/wall-tablet` works for parents,
     admins and the tablet.
  7. The daily confetti shows the approved words.
  8. Gauntlet green in both timezones; Vision, Strange and Captain PASS;
     merged; production deploy checked.
- **Out of scope:** the Rewards page and redeem rain (R3); PIN (R4); bonus
  stars and history (R5); sound; stars for hours habits; a Stars dashboard
  widget; the R1 follow-ups listed in `.avengers/status.md`.

## Danger register

Same as AGENTS.md, plus:
- `.env` is a symlink to the main checkout's `.env`; its `DATABASE_URL`
  host was checked as the Neon dev branch
  (`ep-hidden-pine-a6ajzk11-pooler`) on 2026-11-24. Never print `.env`
  beyond the hostname.
- **The plan says "no migration", but `UserPreferences.starAnimations` is a
  new column, so R2 needs one small additive migration** (one Boolean
  column with a default). SQL is shown before it is applied, applied with
  `npx prisma migrate deploy` only. Never `prisma migrate dev`, never
  `db:seed` / `db:reset`.
- Stage by explicit path; `git show --stat HEAD` after each commit. No
  direct pushes to `main`. Leave the untracked `.agents/` and `.codex/` out.
- Shared files (CLAUDE.md, STRUCTURE.md, `docs/structure/rewards.md`,
  `src/lib/rewardVocabulary.ts`, `prisma/schema.prisma`, `package.json`):
  small edits only; sync with main right before merging (R3 edits them
  too).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (count goes up)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: the flight, the words and two switches are all visible.
- Captain: new files (`StarFlightLayer.tsx`, `useCountUp.ts`,
  `rewards/starMotion.ts`) and a migration.
- Banner: out. Fury read the touched files inline (they are small).

## Bryce's answers (2026-11-24, from the mock)

1. **All-done words:** "You did it! All done today." (his pick over Fury's
   "All done for today!"). A pill in the middle of the screen while the
   confetti falls, gone after 3 seconds, never takes taps. This replaces
   habits-plan decision 99 ("Confetti has no words").
2. **One switch, "Celebrations"** ("Flying stars and the all-done
   confetti"): off means no star flight and no daily confetti. Fury's
   reading, for Bryce to overturn: off also means no all-done words (the
   switch is named Celebrations). Because the switch now covers more than
   stars, the column is named `celebrations`, not the plan's
   `starAnimations` (structure call, Fury).
3. **The flight as mocked:** 8 filled gold stars pop out in a ring round
   the check, fly to that person's bank and shrink, then the number counts
   up. About 1 second.
4. **Reduce Motion:** no flight, no count-up, no confetti, but the words
   still show (they do not move).

## Contracts

C1 then C2, in order (C2 builds on C1's exports). Docs (DESIGN.md,
`docs/structure/rewards.md`, the habits plan's decision 99, CLAUDE.md) are
Fury's, after C2.

### C1 — The Celebrations switch end to end, and the pure motion and pay rules
- **Status:** DONE (commit 95dfce0)
- **Objective:** Add `UserPreferences.celebrations`, its per-login and
  tablet switches, and the two pure, tested rule files C2 will animate with.
- **Boundaries:** may touch: `prisma/schema.prisma` (one column on
  `UserPreferences`, with a `///` comment), new
  `prisma/migrations/20261124100000_celebrations_switch/migration.sql`,
  `src/lib/dal.ts`, `src/app/actions/preferences.ts`, new
  `src/lib/tabletCelebrationsRead.ts`, `src/components/HabitsChoresSettings.tsx`,
  `src/app/(app)/settings/page.tsx` (pass the value only),
  new `src/components/TabletCelebrationsSetting.tsx`,
  `src/app/(app)/settings/wall-tablet/page.tsx`, `src/lib/rewardVocabulary.ts`
  (switch words only), `src/lib/habitVocabulary.ts` (the all-done line
  only), new `src/lib/rewards/starMotion.ts`, new
  `src/lib/rewards/starMotion.test.ts`, new `src/lib/starFlights.ts`, new
  `src/lib/starFlights.test.ts` (top of `src/lib/` because it imports
  `habitChanges.ts`, the `starDiffReducer.test.ts` precedent). The schema
  is exempt from the size cap (STRUCTURE.md, the `prisma/schema.prisma`
  exception). · must not
  touch: every component C2 names, `src/lib/rewards/starDiff.ts`,
  `src/lib/rewards/stars.ts`, `src/lib/habitChanges.ts`, `package.json`,
  any other migration, `.env`.
- **Details:**
  - Migration SQL is exactly one additive statement:
    `ALTER TABLE "UserPreferences" ADD COLUMN "celebrations" BOOLEAN NOT NULL DEFAULT true;`
    Write it by hand. **Do not apply it** (Fury applies it with
    `npx prisma migrate deploy` after reading it). Run `npx prisma generate`.
  - `dal.ts`: `VerifiedUser.celebrations: boolean`, selected beside
    `showStreaks`, `?? true`.
  - `actions/preferences.ts`: `saveCelebrations(input: unknown)` (the
    `saveShowStreaks` shape: device refused, real boolean only) and
    `saveTabletCelebrations(input: unknown)` (the `saveTabletStartPage`
    shape: managers or `tabletMayChangeWallTablet`, writes every active
    device login in one transaction).
  - `tabletCelebrationsRead.ts` (`server-only`, no auth, the
    `loadTabletStartPage` precedent): `loadTabletCelebrations()` reads the
    oldest active device login's value; null when there is no device login.
  - `HabitsChoresSettings.tsx`: a second switch row under Show streaks,
    icon Lucide `Sparkles`, title "Celebrations", a muted second line
    "Flying stars and the all-done confetti", same optimistic save shape.
    `TabletCelebrationsSetting.tsx`: the same row for the tablet, shown on
    `/settings/wall-tablet` when `loadTabletCelebrations()` is not null.
  - Words: `CELEBRATIONS_WORDS` (title, sub, save error, not allowed) in
    `rewardVocabulary.ts` (keep it import-free); `ALL_DONE_LINE = "You did
    it! All done today."` in `habitVocabulary.ts`.
  - `rewards/starMotion.ts` (pure, imports nothing outside `src/lib/rewards/`
    and `rewardVocabulary.ts`): `RING_STARS = 8`, `FLIGHT_MS`, `STAGGER_MS`,
    `COUNT_MS`, `ringOffsets(count, radius)`, `flightKeyframes(from, to |
    null, ringOffset)` returning plain keyframe objects (with a target: pop
    out to the ring by ~30%, fly and shrink to the target, fade at the end;
    with null: pop out to the ring and fade in place), `landsAfterMs(index)`
    (when the count-up should start), `countUpValue(from, to, elapsedMs,
    durationMs)` (integer, clamped, never past `to`). Tests cover each,
    including a 0 or negative elapsed, an elapsed past the duration, and
    from greater than to.
  - `starFlights.ts`: `starPayments(rows, change, lateStars)` returns
    `starDiff(rows, applyHabitChange(rows, change), lateStars)` (the one
    pay rule, no second one). Tests: a check pays the value, an uncheck is
    negative, a Together habit pays every participant who flips, a carried
    row under Half pays half rounded up, a skip pays nothing, a 0-star
    habit pays nothing.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint .` clean;
  `npm test` passes with the count up by the new tests; the UTC command
  passes; `npx prisma validate` passes.
- **Evidence required:** the migration file's full text; the test counts
  before and after; the output of each command; `git diff --stat`.
- **Done criteria:** Fury reads the SQL (one ADD COLUMN, nothing else),
  re-runs the commands, and the new tests fail if `starPayments` stops
  using `starDiff` or `countUpValue` overshoots.
- **Report:** DONE. Tests 2174 to 2193 (+11 starMotion, +8 starFlights);
  UTC 2193, 10 skipped (existing). tsc, eslint, prisma validate clean.
  Mutations (`starPayments` returning {}, `countUpValue` overshooting)
  each failed tests. Timings chosen: FLIGHT_MS 800, STAGGER_MS 30,
  COUNT_MS 400. Fury re-ran tsc and tests (2193 pass), read the SQL (one
  ADD COLUMN), split a device-refusal line (`deviceRefused`) from
  `notAllowed` at Stark's note, and applied the migration to the dev
  branch with `npx prisma migrate deploy`.

### C2 — The star flight layer, the count-up and the all-done pill
- **Status:** DONE (see Report)
- **Objective:** Make a paying check send a ring of stars from the tapped
  button to the right person's visible star bank (or pop in place), count
  the bank up, and show "You did it! All done today." with the confetti.
- **Boundaries:** may touch: new `src/components/StarFlightLayer.tsx`, new
  `src/lib/useCountUp.ts`, `src/components/StarBank.tsx`,
  `src/components/LogButton.tsx`, `src/components/HabitRow.tsx`,
  `src/components/HabitFamilyColumn.tsx`,
  `src/components/HabitFamilyWideColumn.tsx`,
  `src/components/HabitFamilyWide.tsx`, `src/components/HabitFamilyView.tsx`,
  `src/components/HabitsTile.tsx`, `src/components/HabitTodayList.tsx`,
  `src/components/HabitConfetti.tsx`, `src/app/(app)/layout.tsx` (mount the
  layer round `children` only). · must not touch: C1's files (read them),
  `src/lib/rewards/starDiff.ts`, `src/lib/habitChanges.ts`, `prisma/`,
  `package.json`, any action file.
- **Details:**
  - `StarFlightLayer({ enabled, children })` (client): a provider plus one
    `aria-hidden` `pointer-events-none fixed inset-0` layer above the page.
    Context: `useCelebrations()` (the switch), `useStarFlight()` returning
    `fly(from: HTMLElement | null, payments: Record<string, number>)`, and
    `useStarLanding(userId)` (when that person's count-up starts, or null).
    A safe no-op default outside the provider.
  - `fly`: does nothing when the switch is off or `usePrefersReducedMotion`
    is true. For each person paid a positive amount: find a
    `[data-star-bank="<id>"]` element that has a box and is on screen (both
    family layouts are in the page; the hidden one has no box). Found: a
    ring of `RING_STARS` filled `text-star` Lucide stars flies there with
    `element.animate(...)` using `flightKeyframes`, and that person's
    landing is set. Not found: one ring pops in place at the button.
    Negative amounts cancel that person's flights in the air and clear
    the landing (an un-check never flies, and a ring never lands on a bank
    that went down). Every flight removes itself when done and on unmount.
    No new library.
  - `useCountUp(target, startAt)`: with no landing pending it returns
    `target` in the same render (no frame of an old number; under Reduce
    Motion or the switch off the bank behaves exactly as in R1). An
    increase with a landing holds the old number until `startAt`, then
    steps by `countUpValue` over `COUNT_MS` with `requestAnimationFrame`. A
    decrease shows at once and stops any count. The number read is always
    the `stars` prop, which callers pass from `shownBanks` (unchanged).
  - `StarBank`: becomes a client component with a required `userId`; puts
    `data-star-bank={userId}` on its element; the visible number is the
    count-up, the `aria-label` stays the real `stars`.
  - `LogButton.onClick` receives the button (`event.currentTarget`); row
    `onToggle` props pass it up (`(from?: HTMLElement) => void`, family
    `(row, from?)`). `habitRowTaps` takes the flight and `lateStars` and,
    on a check or uncheck, calls `fly(from, starPayments([row], change,
    lateStars))` **before** `run(...)`. `HabitFamilyView.toggle` does the
    same with the family change. Fast taps are never blocked or delayed:
    `run` is called exactly as today, on every tap.
  - `HabitConfetti`: with the switch off nothing fires and no marker is
    set. Under Reduce Motion: no confetti, but the words show and the
    marker is set. Otherwise confetti plus the words. The words: one pill
    (`role="status"`), centred, `pointer-events-none`, `ALL_DONE_LINE`,
    gone after 3 seconds; DESIGN.md tokens only (`bg-surface`,
    `border-line`, `text-fg`), rem sizes.
  - Layout: `<StarFlightLayer enabled={user?.celebrations ?? true}>` round
    `{children}` inside `AppChrome`.
- **Verification:** the C1 commands plus `npm run build`. In the dev server
  (dev database only, existing test-data scripts only): on the iPad size
  (1024x768) family view a check on Emily's column flies to Emily's bank,
  not the other column's; Mine flies to the count line bank; a dashboard
  tile pops in place; two checks tapped fast both save; the switch off and
  an emulated Reduce Motion both give no flight.
- **Evidence required:** command outputs; for the browser checks, the
  measured rects (button, chosen bank) from `document.getAnimations()` or
  equivalent, and which steps could not be checked.
- **Done criteria:** Fury and Vision re-run it; Strange watches it.
- **Report:** DONE for code; tsc, eslint, 2193 tests, UTC (10 existing
  skips) and build green. In-browser checks not done (no sign-in): Strange
  runs them. Notes: count-up starts at `landsAfterMs(0)` (800ms) and runs
  400ms; `HabitConfetti` reads `matchMedia` in its effect (the hook is
  false on hydration); a transformed ancestor of `main` would offset the
  fixed layer (unchecked). Stark flagged `PlannedTodayCard.tsx` (outside
  the boundary) still calling `habitRowTaps(row, run)`, so its checks would
  not fly. Fury's one-line fix: `habitRowTaps`' star argument is now
  required and `PlannedTodayCard` passes `{ fly, lateStars }`.

### C3 — Gate fixes: motion numbers home, confetti behind the words, cancel on a failed save, inverted pill

**Status:** DONE (2026-11-25). Stark: tsc, eslint and build clean; Denver 2197 pass; UTC 2187 pass + 10 old skips; 4 tests added; no typed motion number left.

1. **Objective:** Clear the pass-1 blockers (Vision + Captain: flight
   numbers typed in `StarFlightLayer.tsx`; Strange: confetti paints over
   the all-done words) and apply Hill's two behaviour calls (cancel the ring
   on a failed save; the inverted pill).
2. **Boundaries.** May touch: `src/lib/rewards/starMotion.ts`,
   `src/lib/rewards/starMotion.test.ts`, `src/lib/starFlights.ts`,
   `src/lib/starFlights.test.ts`, `src/components/StarFlightLayer.tsx`,
   `src/components/HabitConfetti.tsx`, `src/components/HabitsTile.tsx`,
   `src/components/HabitFamilyView.tsx`; `src/components/HabitTodayList.tsx`
   and `src/components/PlannedTodayCard.tsx` only if a type change forces
   it. Must not touch: DESIGN.md, STRUCTURE.md, `docs/`, `.avengers/`,
   CLAUDE.md, `prisma/`, `package.json`, `src/lib/useOptimisticRun.ts`,
   any other file.
3. **Work:**
   - `starMotion.ts` gains, each with a one-line doc comment:
     `RING_RADIUS_REM = 2.25`, `FLIGHT_EASING = "ease-in-out"`,
     `LANDING_GRACE_MS = 200`, `landingClearsAfterMs()` (returns
     `landsAfterMs(RING_STARS - 1) + COUNT_MS + LANDING_GRACE_MS`),
     `ALL_DONE_WORDS_MS = 3000`, `CONFETTI_Z_INDEX = 65` (above sheets at
     z-60/61, below the pill and the flight layer at z-70). Tests: 
     `landingClearsAfterMs()` is later than
     `landsAfterMs(RING_STARS - 1) + COUNT_MS`; `CONFETTI_Z_INDEX` is
     above 61 and below 70.
   - `StarFlightLayer.tsx` imports those and types no motion number itself
     (only the rem-to-px step stays).
   - `HabitConfetti.tsx`: `WORDS_MS` replaced by `ALL_DONE_WORDS_MS`; the
     `confetti(...)` call gains `zIndex: CONFETTI_Z_INDEX`; the pill's
     classes become `rounded-full bg-fg px-6 py-3 text-center text-xl
     font-bold text-bg` (no border, no shadow; decided by Hill). Nothing
     else about the pill changes.
   - Failed save (decided by Hill): `starFlights.ts` gains
     `takeBackPayments(payments)` (every positive amount made negative,
     others dropped), tested. In `habitRowTaps` (HabitsTile.tsx) and
     `HabitFamilyView`'s `toggle`, a **check** passes `run` an `onError`
     (the 4th argument `useOptimisticRun` already has) that calls
     `fly(null, takeBackPayments(payments))`, cancelling any ring still in
     the air for those people. An uncheck is unchanged. Widen
     `habitRowTaps`'s `run` parameter type to accept the two optional
     callbacks. Keep the existing success behaviour byte for byte.
4. **Verification:** the full gauntlet (tsc, eslint, `npm test` count up
   from 2193, the UTC command, `npm run build`); `grep -n "2.25\|200\|ease-in-out\|3000\|zIndex" src/components/StarFlightLayer.tsx src/components/HabitConfetti.tsx`
   shows no typed motion number.
5. **Evidence and done:** diff stat inside the boundaries, gauntlet output
   tails, the grep output, test names added. Do not commit (Fury commits).

### C4 — The dashboard tile passes the failed-save cancel through

**Status:** DONE (2026-11-25). Stark: gauntlet green, 2197 Denver; 2187 + 10 skips UTC.

1. **Objective:** Vision pass-2 blocker: on a dashboard Habits tile a
   failed check must cancel its ring, as Today and the family view do.
2. **Boundaries.** May touch only `src/components/HabitsTile.tsx`. Must not
   touch `src/components/HoursLogSheet.tsx` (`RunChange` stays as it is) or
   anything else.
3. **Work:** `keep` in `HabitTileRows` also takes an optional `onError` and
   passes it to `run` as the 4th argument (its held-rows `onSuccess` step
   unchanged); line 107 passes `keep` (or a lambda forwarding all four
   arguments) to `habitRowTaps`. `run={keep}` for the hours log sheet must
   still type-check against `RunChange`.
4. **Verification:** the full gauntlet, test count still 2197 Denver /
   2187 + 10 skips UTC.
5. **Evidence and done:** the diff, the gauntlet tails. Do not commit.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 (fb464dc) | Vision | BLOCKED | Flight numbers typed in `StarFlightLayer.tsx` (`RING_RADIUS_REM`, `LANDING_GRACE_MS`, the expiry sum, the easing) belong in `starMotion.ts` | Gauntlet re-run green (Denver 2193; UTC 2183 pass + 10 old skips; build OK). A failed save still flies stars (bank number stays right). Only one ring pops when no bank is on screen. `HoursLogButton` onClick type is loose. |
| 1 (fb464dc) | Captain | BLOCKED | Same as Vision: motion constants out of `starMotion.ts` | Move `WORDS_MS` too (optional). rewards.md wording: name both Reduce Motion readers, "the only client reader", add file paths. Settings switch row duplicated in two components. rewards.md grew 113 to 139 lines. |
| 1 (fb464dc) | Strange | (no verdict) | | Stalled opening the preview at 23:28 on 2026-11-24 and never reported; stopped 2026-11-25 and re-dispatched (pass 1 again). |
| 1 (fb464dc, rerun) | Strange | BLOCKED | Confetti canvas is z-index 100 (library default), above the all-done pill's z-[70], so it paints over the words; DESIGN.md says it falls behind. Fix: `zIndex: 65` in the `confetti(...)` call. | Flight lands on the right bank on every layout (iPad wide: 8 stars to each bank for a Together check); count-up lands with the stars; un-check drops at once; layer never blocks taps; switch rows match; switch off and Reduce Motion behave as written; pill contrast 8:1 light, 14:1 dark. Ruled both Vision NOTEs as NOTEs. Ring wording gap in DESIGN.md is a docs fix. Pill barely stands apart in dark (polish idea). Dev data put back; noted the R3 session also writing the same dev database. |
| 2 (f7ecb39) | Captain | BLOCKED | Two rewards.md sentences Fury wrote in C3 were untrue: the "celebration layer number" rule is broken by the two `z-[70]` classes; "only client reader ... `useCelebrations()`" is wrong (StarFlightLayer takes `enabled` from the layout; HabitConfetti calls the hook). Docs only. | Code clean, pass-1 blocker cleared, `takeBackPayments` home correct. Confetti particle numbers still typed (pre-mission, later). Settings switch row still duplicated. Fury's fix to the record introduced both blockers: the doctrine's "a correction is a change" law, again. |
| 2 (f7ecb39) | Vision | BLOCKED | Dashboard tile drops the failed-save cancel: `HabitsTile.tsx:107` wraps `run` as `(change, action) => keep(change, action)`, and `keep: RunChange` has no `onError`, so the 4th argument is thrown away. | Gauntlet re-run green (Denver 2197; UTC 2187 + 10 old skips; build OK). Family and Today paths cancel correctly. Two overlapping checks for one person where one fails cancel both rings (final number still right). Docs wording NOTEs as Captain's. |
| 2 (f7ecb39) | Strange | PASS | | Confetti at z 65 under the pill at 70, all sizes and themes; inverted pill about 6.9:1 light, 15:1 dark, centred, never takes taps; flight still lands on the Mine bank. NOTE: the pill now looks like the UndoBar if both ever show together. Reviewed this worktree's code on port 3001 (port 3000 was R3's). |

## Handoff log

- 2026-11-24 — Mission opened. Setup done (`.env` linked and ignored, dev
  branch host confirmed, `npm ci`). Mock and questions sent to Bryce.
- 2026-11-24 — Bryce answered (see "Bryce's answers"). C1 and C2 written;
  preflight's only failure is the schema cap, which STRUCTURE.md exempts.
  Baseline `npm test` 2174. C1 dispatched to Stark at 7721a1a. Fury wrote
  the DESIGN.md flight rules, the `docs/structure/rewards.md` homes and the
  decision-99 replacement (outside both contracts' boundaries).
  `HabitConfetti.tsx`'s comment still cites decision 99: C2 fixes it.
- 2026-11-24 — Bryce went to bed and said in chat that Hill steps in for
  him, **on Opus 5.5 for this session** (dispatch Hill with the `opus`
  model override). Content and design calls go to Hill and are recorded as
  "decided by Hill"; logins, real-device tests, money and the danger
  register still wait for Bryce. Merge does not wait for him (standing
  rule); his phone test goes in `.avengers/status.md`.
- 2026-11-24 — C1 committed (95dfce0), migration applied to dev. C2
  dispatched to Stark at 95dfce0.
- 2026-11-24 — C2 done; Fury wired `PlannedTodayCard` and made the star
  argument required. Committed; Vision, Captain and Strange dispatched in
  parallel (all read-only).

- 2026-11-25 — Vision and Captain pass 1 recorded (both BLOCKED on the
  same motion-constants finding). Strange had stalled overnight with no
  report; stopped and re-dispatched at fb464dc. **Bryce is back and took
  over from Hill: Hill is dismissed.** Content and design calls go to
  Bryce again. No calls were made by Hill this mission.
- 2026-11-25 (later) — **Bryce put Hill back in charge**, in this chat:
  "I am having Hill now take over", on **Opus 5.5 with high effort**
  (dispatch Hill with `model: "opus"`, `effort: "high"`). This is Bryce's
  direct instruction, so it holds even outside bypass mode. Content and
  design calls go to Hill and are recorded as "decided by Hill"; logins,
  real-device tests, money and the danger register still wait for Bryce.
- 2026-11-25 — Strange pass 1 BLOCKED (confetti over the words). Three
  design calls sent to Hill: cancel the ring on a failed save, the DESIGN.md
  ring wording, the pill's look in dark mode.
- 2026-11-25 — **Decided by Hill** (Bryce to review; Opus 5.5, high
  effort): (1) a failed save cancels any ring still in the air (Option B);
  (2) DESIGN.md wording: "Each person paid whose star bank is on screen
  gets their own ring, flying to their bank. Anyone paid whose bank is not
  on screen (a dashboard tile) is shown by one shared ring that pops in
  place where the tap was and fades."; (3) the all-done pill takes the
  UndoBar's inverted `bg-fg text-bg` look, no border, no shadow (medium
  confidence: Bryce should check it on his phone in dark mode first).
  C2's pill tokens are superseded by this. Bryce back online; C3 written
  and dispatched.
- Fixes held until Strange reports, so all blockers go to Stark in one
  contract (C3) and the gates re-run once.

## Delivery

(Pending.)
