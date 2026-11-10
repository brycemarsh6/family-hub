# Mission 62: Screensaver S2, the tablet slideshow and sleep mode

**Project:** family-hub (Marshee)
**Status:** DELIVERING (all gates PASS; PR next)
**Started:** 2026-11-09 · **Updated:** 2026-11-09
**Branch:** `claude/screensaver-s2-slideshow`, cut from `main` at `e62056c` (the PR #94 merge).

Plan: `.avengers/plans/screensaver-slideshow-v1.md` (approved by Bryce 2026-11-09), "How it works > Screensaver" and the S2 row. S1 is mission 57.

## Step 0 (done 2026-11-09)

- PR #94 is merged on `origin/main` (`e62056c`), and `mission-57-screensaver-s1-photos.md` is on main.
- Production deploy `dpl_ECGfBri8pesymrLFLENYfZgQefr3` for `e62056cde93b59e10772d9726363d68a61ba3c02` is READY; its build log shows "Applying migration `20261115000000_slideshow_photos`" against the production host. Recorded in mission 57's Delivery through this PR.
- Worktree `.env` symlinked to the main checkout's (gitignored). Not read.
- Next free numbers on `origin/main` at step 0: mission 58 (taken by text size before this merged, so this became 61, then 62); migration stamp after `20261115000000_slideshow_photos`.

## Brief

- **Goal:** the wall tablet (the device login) shows a full-screen shuffled slideshow of the S1 photos after N minutes with no taps, and goes fully black during sleep hours. Parents and admins adjust every timing and switch from their own Settings.
- **Done means:**
  - Only a login with `user.isDevice` ever gets the screensaver.
  - After "Start after" minutes with no taps, the slideshow starts; each photo shows for "Seconds per photo"; order is shuffled with no repeat until every photo has shown.
  - Each photo is shown whole, with a blurred copy of itself filling any gap.
  - Clock and date, caption, and taken date each show only when their switch is on.
  - With sleep on, between sleep start and end (Denver), the screen is black. A tap wakes Marshee; with no further tap it is black again after "Back to black" minutes.
  - A tap on the slideshow or the black screen only wakes the app and opens the dashboard; it never presses what is underneath.
  - New photos and changed settings reach the tablet the next time the slideshow starts, without a reload.
  - The settings are one household `ScreensaverSettings` row (additive migration); numbers change only by +/− steppers.
  - Pure rules (`src/lib/screensaver.ts`: state from time, last tap and settings; the shuffle) are tested in Denver and UTC. The gauntlet passes.
- **Out of scope:** the "Open Marshee on" default page (S3), "On this day" (S4), screen power or brightness, a screensaver on any personal login, Winnie, photo management changes.

## Danger register

From AGENTS.md (absolute): never `db:seed` / `db:reset`; migrations additive only, SQL reviewed, merging applies it to production; no `User` clean script; secrets only in `.env` and Vercel, never read or printed; never `git add -A` / `git add .`, stage by path, `git show --stat HEAD` after each commit; no direct push to `main`.

New for this mission:
- Fury alone runs `npx prisma migrate deploy`, against the dev branch only, after checking the hostname starts `ep-hidden-pine-` (hostname only, never the URL).
- Production photos are the family's. Tests use the dev Blob store and made-up photos from `/System/Library/Desktop Pictures/` only.
- Testing the screensaver needs the Tablet login on the dev copy: Bryce signs it in himself in the browser pane. No agent reads `.env` or mints a cookie.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always). Strange (the slideshow, the black screen, the Wall tablet settings). Captain (new table, new files, a writes move, STRUCTURE.md entry).
- Banner: not needed; Fury read the S1 code and Settings inline.

## STRUCTURE.md cleanup pass (first job)

Measured 2026-11-09: STRUCTURE.md is 1,770 lines (trigger 1,783). Since the last pass (`6c97d25`, 1,583 lines) it gained 207 lines, almost all binding rule text (Browser return routes, Slideshow photos, Google calendar link, wide-page rules). The leftover story-shaped passages in the older text were ruled KEEP or restored by both gates in mission 54 (the `withTimeZone` sentence, the `git add -A` record). Fury's estimate: a repeat stories-only pass saves about 10 to 20 lines. Decision for Bryce (C0 below).

## Open questions for Bryce (with the mock, 2026-11-09)

**Answered 2026-11-09: Bryce approved every recommendation below, Q1 to Q11 and C0 (the STRUCTURE.md split becomes its own later PR, not part of S2). He asked whether to plan on Fable; Fury recommended staying on Opus 5.5 (the plan and every content call are settled, and Vision gates on Fable).**

Asked 2026-11-09 with the mock (slideshow, black screen, Wall tablet page). Fury's recommendation first in each:
- Q1 Where: a "Wall tablet" row on Settings opens its own page `/settings/wall-tablet` (else: an inline section on Settings, about nine more rows).
- Q2 The page also links to Slideshow photos; the existing Settings row stays.
- Q3 Stepper ladders: Start after 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120 min; Each photo 5, 10, 15, 20, 30, 45, 60 sec; Black from and Until in 30-minute steps round the clock; Back to black 1, 2, 3, 5, 10, 15, 30 min.
- Q4 Between photos: a 1-second crossfade (else hard cut, 2-second fade, or slow zoom).
- Q5 Wide photos follow the same rule: whole photo, blurred fill, never cropped.
- Q6 Date line reads "June 14, 2023"; clock reads "7:42 PM" with the date "Sunday, November 9" under it.
- Q7 No photos yet: the tablet stays on Marshee (no screensaver) until there is at least one.
- Q8 In sleep hours the wait before black is "Back to black after" (so at 10 PM someone mid-use gets 2 minutes of no taps first).
- Q9 At the sleep end time the black screen becomes the slideshow; the first tap opens Marshee.
- Q10 A tap on the slideshow or black screen opens the dashboard (S3 makes this a setting).
- Q11 All three overlay switches start on.
- C0 STRUCTURE.md: skip the repeat stories pass (saves about 10 to 20 lines, costs two gate runs); its growth is "a trend to watch, never a BLOCKER". Offer splitting the per-domain One source of truth entries into companion files as a separate later PR.

## Design decisions made while contracting (Fury, structure calls)

- **One household row:** `ScreensaverSettings`, `id String @id @default("household")`, every column with its default, plus `updatedAt` and `updatedById String?` (a plain id, no `User` relation, the `SlideshowPhoto` precedent). A missing row reads as the defaults; the first save upserts it. Migration `20261116000000_screensaver_settings`: one `CREATE TABLE`, nothing else.
- **Times are minutes after midnight** (`sleepStartMinute` 1320 = 10 PM, `sleepEndMinute` 360 = 6 AM), Denver wall clock. A new `minuteOfDayInZone(instant, timeZone)` sits beside `hourInZone` in `householdDate.ts` (the zone-math home). Start equal to end means no sleep hours.
- **Ladders, not +1:** every number moves along a fixed list (Q3). The lists and the step functions live in pure `src/lib/screensaver.ts`, and the save action refuses any value not on its list. Sleep times wrap round midnight.
- **The state rule** (`screensaverState`): in sleep hours, "sleep" once idle for `backToBlackMinutes`, else "awake". Outside them, "slideshow" once idle for `startAfterMinutes` and at least one photo exists, else "awake". This one rule gives Q7, Q8 and Q9 with no special cases.
- **No repeats:** `pickNextPhoto(currentIds, shownIds, lastId, random)` picks at random from the photos not yet shown; when none are left it starts a new round, avoiding the last photo when there are two or more. Adds and deletes between rounds need no extra code. `random` is passed in, so tests are fixed.
- **How the tablet reads:** the `(app)` layout already loads the user. For a device login only, it also loads the settings and passes them to `AppChrome`, which mounts `ScreensaverHost`. Each time the host is about to leave "awake" it calls a read action `loadScreensaverShow()` (guard form (a), device logins only, `null` on refusal) for fresh settings and photos, re-checks the rule with them, and only then shows anything. Photos load through the S1 image route.
- **Writes:** `saveScreensaverSetting(field, value)` saves one field per tap (guard form (a), `MANAGER_ROLES` and not a device). Next.js runs one client's Server Actions one at a time, so rapid taps land in order.
- **S1's rule followed:** its STRUCTURE.md entry names "the tablet's slideshow" as the second caller that moves the photo writes into `src/lib/slideshowWrites.ts`. C1 does that move with no behaviour change, and `slideshowRead.ts` gains a narrow `listSlideshowShowItems()` (id, width, height, caption, takenOn).
- **A tap never reaches the page:** the overlay is the hit target from the first touch. It swallows `pointerdown` and wakes on its own `click`, so the whole tap belongs to the overlay; then it routes to `/` (or just closes when already there). Taps anywhere else, captured on `window`, reset the idle clock.

## Contracts

### C1 — Screensaver foundation (table, pure rules, reader, actions, slideshow writes move)
- **Status:** DONE
- **Objective:** Everything S2 needs below the screens: the settings table, the pure rules with tests, the readers, the two actions, and S1's writes moved into `slideshowWrites.ts`.
- **Boundaries:** may touch: `prisma/schema.prisma` (one new model at the end), new `prisma/migrations/20261116000000_screensaver_settings/migration.sql`, new `src/lib/screensaver.ts`, new `src/lib/screensaver.test.ts`, `src/lib/householdDate.ts` and `src/lib/householdDate.test.ts` (add `minuteOfDayInZone` and its tests only), new `src/lib/screensaverRead.ts`, new `src/lib/slideshowWrites.ts`, `src/lib/slideshowRead.ts` (add `listSlideshowShowItems` and its select only), `src/app/actions/slideshowPhotos.ts` (call `slideshowWrites.ts` instead of `db`), new `src/app/actions/screensaver.ts`. Must not touch: everything else, above all `src/components/`, `src/app/(app)/`, `STRUCTURE.md`, `package.json`, `.env`. Never run `prisma migrate` (Fury applies it). No commits.
- **Spec:**
  1. `screensaver.ts` (pure; may import only `householdDate.ts`, `mealPlanDates.ts`, `constants.ts`): `ScreensaverSettings` type; `SCREENSAVER_DEFAULTS` (30, 15, true, true, true, true, 1320, 360, 2); `START_AFTER_STEPS` [1,2,5,10,15,20,30,45,60,90,120], `SECONDS_PER_PHOTO_STEPS` [5,10,15,20,30,45,60], `BACK_TO_BLACK_STEPS` [1,2,3,5,10,15,30], `SLEEP_MINUTE_STEP` 30; `stepLadder(steps, value, dir)` (stops at the ends), `stepSleepMinute(minute, dir)` (wraps); `toScreensaverSettings(row | null)` (repairs anything off its list to the default, never throws); `parseScreensaverField(field, value)` returning the clean `{ field, value }` or `null` (the action's validator; every field name and type checked, numbers must be on their list, sleep minutes a multiple of 30 in 0 to 1410); `isSleepTime(minuteOfDay, settings)`; `screensaverState({ now, lastTapAt, settings, hasPhotos, timeZone })` returning `"awake" | "slideshow" | "sleep"` per the decision above; `pickNextPhoto`; formatters `formatSleepMinute(m)` ("10:00 PM", through `formatHouseholdClock` on a UTC instant), `formatScreensaverDate(now, timeZone)` ("Sunday, November 9", through `calendarDateInZone`, `dayOfWeek`, `FULL_DAY_NAMES`, `FULL_MONTH_NAMES`), `formatTakenOn(takenOn)` ("June 14, 2023" from `YYYY-MM-DD` via `parseDateParam`, no timezone conversion, `null` for null or bad text); and `SCREENSAVER_WORDS`, the page's words from the approved mock (title, sub line, three section names, every row label, the help line).
  2. Tests in `screensaver.test.ts`: every ladder end and middle; wrap at midnight both ways; repair of junk rows; `parseScreensaverField` refusals (unknown field, wrong type, off-list number, 45-minute sleep time); `isSleepTime` across midnight, same-day window, start equal end, sleep off; `screensaverState` for each branch including no photos, exactly-at-threshold, 9:59 PM vs 10:00 PM, 5:59 vs 6:00 AM, and the Denver DST nights (2026-03-08 and 2026-11-01) with instants chosen so a UTC-based mistake fails; `pickNextPhoto` (no repeat within a round over many draws, new round after all shown, never the same photo twice in a row when two or more exist, a deleted id never picked, a new id picked within its round); formatters. Tests must pass under both `TZ=America/Denver` and `TZ=UTC`.
  3. `minuteOfDayInZone` beside `hourInZone`, same Intl style, with tests including a DST night.
  4. `screensaverRead.ts` (`server-only`, no auth): `loadScreensaverSettings()` returns `toScreensaverSettings(row)`; the only reader of `ScreensaverSettings`.
  5. `slideshowWrites.ts` (`server-only`, no auth, no `revalidatePath`): the three `db.slideshowPhoto` writes from the actions moved verbatim in meaning (`createSlideshowPhotoRow`, `updateSlideshowCaptionRow`, `deleteSlideshowPhotoRow`, names may differ), returning what the actions need. The actions keep their guards, Blob calls, validation, results and `revalidatePath`. `grep -n "db\." src/app/actions/slideshowPhotos.ts` returns nothing afterwards.
  6. `actions/screensaver.ts`: `saveScreensaverSetting(field: unknown, value: unknown)`: guard (a) `getVerifiedUser`, refuse `!user || user.isDevice || !MANAGER_ROLES.includes(user.role)` with `{ error }`; `parseScreensaverField` or `{ error }`; upsert `id: "household"` setting that one column and `updatedById`; `revalidatePath("/settings/wall-tablet")`; plain-English errors, never throws. `loadScreensaverShow()`: guard (a); `null` unless `user.isDevice`; returns `{ settings, photos }` from `loadScreensaverSettings()` and `listSlideshowShowItems()` in one `Promise.all`. No type re-exports from this file.
  7. Schema and migration per the design decision. The SQL is a single `CREATE TABLE "ScreensaverSettings"` with the defaults; paste it whole in the report.
- **Verification:** `npx prisma validate`; `npx prisma generate`; `npx tsc --noEmit`; `npx eslint .`; `npm test`; the direct UTC test command from the Gauntlet. Expected all exit 0, test count up only by new tests.
- **Evidence required:** the migration SQL in full; the last lines and pass counts of both test runs; `grep -n "db\." src/app/actions/slideshowPhotos.ts` (empty); `grep -rn "screensaverSettings" src --include=*.ts | grep -v generated` (only `screensaverRead.ts` reads, only `actions/screensaver.ts` writes); `git diff --stat`.
- **Done criteria:** Fury re-runs tsc and both test runs and gets the same counts; Fury applies the migration to the dev branch (host checked) and `npx prisma migrate status` is clean.
- **Report:** DONE (Stark), re-run by Fury 2026-11-09: tsc 0 (after `npm install` in this worktree; `@vercel/blob` was missing, and a stale `.next` removed), eslint 0, `npm test` 1634 pass, UTC run 1634 tests 0 fail 7 skipped; `db.` absent from `actions/slideshowPhotos.ts`; one reader, one writer of `ScreensaverSettings`. Fury replaced Stark's invented `SCREENSAVER_WORDS` with the approved mock's words (Stark had no copy of the mock). Migration applied to the dev branch (host checked `ep-hidden-pine-`), `migrate status` up to date. `pickNextPhoto` returns `{ id, shownIds } | null`; the caller keeps `shownIds`. C1 status: DONE.

### C2 — The Wall tablet page and its Settings row
- **Status:** DONE
- **Objective:** Parents and admins change every screensaver setting from `/settings/wall-tablet`, reached from a new "Wall tablet" row on Settings, exactly as the approved mock.
- **Boundaries:** may touch: new `src/app/(app)/settings/wall-tablet/page.tsx`, new `src/components/WallTabletSettings.tsx`, new `src/components/LadderStepper.tsx`, `src/app/(app)/settings/page.tsx` (one row and its top comment). Must not touch: everything else (C1's files are read-only now; ask, do not edit, if one is wrong).
- **Spec:** page: `requireRole(...MANAGER_ROLES)` like `settings/slideshow/page.tsx`, then `loadScreensaverSettings()` and `countSlideshowPhotos()`; `data-page-width="wide"` root with its content inside `NARROW_PAGE_CLASSES` (STRUCTURE.md "Short pages"); `BackLink` to Settings; words only from `SCREENSAVER_WORDS`. `WallTabletSettings` (client): three sections in the mock's order; each switch a `ToggleSwitch`, each number a `LadderStepper` driven by `stepLadder` / `stepSleepMinute` and shown with its unit ("30 min", "15 sec", "10:00 PM", "2 min"); optimistic like `HabitsChoresSettings` (shows at once, a failed save puts the old value back and says so under that row); the three sleep rows are disabled when "Go black at night" is off; the Slideshow photos row links to `/settings/slideshow` with the count. `LadderStepper`: the `QuantityStepper` look, 48px buttons, `aria-label` "Decrease <label>" / "Increase <label>", a disabled end, the shown text passed in. Settings row: "Wall tablet", Lucide `Tablet` icon, same classes as the Slideshow photos row, `order-3` right after it, gated on `canManageSlideshow`.
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test`.
- **Evidence required:** gauntlet last lines; `git diff --stat`; a `grep` showing no number input (`type="number"`) and no hand-typed label text in the new components.
- **Done criteria:** Strange's pass on the running page.
- **Report:** DONE (Stark): new page, `WallTabletSettings.tsx`, `LadderStepper.tsx`, one Settings row; tsc 0, eslint 0, `npm test` 1634 pass; no number inputs. Stark's note: two taps inside one render could save the same step twice (server rule still holds). Fury re-runs with C3.

### C3 — The ScreensaverHost (idle timer, slideshow, black screen)
- **Status:** DONE
- **Objective:** On a device login only, the tablet shows the slideshow and the black screen by the C1 rule, and a tap only wakes it.
- **Boundaries:** may touch: new `src/components/ScreensaverHost.tsx`, new `src/components/ScreensaverSlide.tsx` (if the slide drawing is worth its own file), `src/components/AppChrome.tsx` (one optional prop and the mount), `src/app/(app)/layout.tsx` (load settings for device logins only and pass them). Must not touch: everything else.
- **Spec:** layout: `const screensaver = user?.isDevice ? await loadScreensaverSettings() : null;` passed as `AppChrome`'s `screensaver` prop; `AppChrome` mounts `<ScreensaverHost initialSettings={screensaver} />` only when it is non-null. Host: last-tap time in a ref, set on mount and by capturing `pointerdown` and `keydown` on `window`; a 1-second interval computes `screensaverState` with `HOUSEHOLD_TIME_ZONE`; before leaving "awake" it awaits `loadScreensaverShow()` (a `null` or a throw means stay awake and try again on a later tick, never more than once a minute), re-checks with the fresh settings and photo count, then shows. Overlay: `createPortal` to `document.body` (only ever rendered after mount), `fixed inset-0`, above everything (higher z than the drawer and sheets), black background, `touch-action: none`. Slideshow: the current photo `object-contain` over a blurred, scaled `object-cover` copy of the same image; the next photo preloaded and decoded before a 1-second crossfade; `secondsPerPhoto` per photo via `pickNextPhoto` (Math.random); overlays per the mock (clock `formatHouseholdClock` with the date under it bottom left; caption over `formatTakenOn` bottom right; a soft dark shade under the words; each only when its switch is on, and the date line hidden when the photo has none). A photo whose image fails to load is skipped. Sleep: the same overlay, pure black, nothing on it. Tap: the overlay's `onPointerDown` calls `preventDefault` and `stopPropagation`; its `onClick` resets the last tap, hides the overlay and calls `router.push("/")` unless the path is already `/`. The tick resumes after wake. When the tab is hidden nothing breaks (intervals may pause). No screen power, brightness or wake-lock calls.
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test`; `npm run build`.
- **Evidence required:** gauntlet last lines; `git diff --stat`; the exact lines that make the overlay swallow the tap; `grep -n "wakeLock\|brightness" src/components/ScreensaverHost.tsx` (empty).
- **Done criteria:** Strange's pass on the dev server with the Tablet login (Bryce signs it in), with "Start after" set to 1 minute and test photos only.
- **Report:** DONE (Stark): host with capture-phase tap listeners, 1-second tick, fresh `loadScreensaverShow()` before leaving awake (retry no sooner than 60 s), portal at `z-[100]` above the drawer's `z-[60]`, wake only on the overlay's own click; `ScreensaverSlide.tsx` two-layer 1-second crossfade with preload and `decode()`. Fury re-ran C2 and C3 together 2026-11-09: tsc 0, eslint 0, `npm test` 1634 pass, UTC 1634 tests 0 fail, `npm run build` 0 with `/settings/wall-tablet` in the route list.

### C5 — Gate pass 1 fix batch
- **Status:** DONE
- **Objective:** Clear Vision's and Captain's pass-1 blockers and the notes Fury took, in one dispatch.
- **Boundaries:** may touch: `src/components/ScreensaverHost.tsx`, `src/components/ScreensaverSlide.tsx`, new `src/app/(app)/settings/wall-tablet/loading.tsx`, `src/components/WallTabletSettings.tsx`, `src/lib/screensaver.ts` (`SCREENSAVER_WORDS` only), `src/lib/screensaver.test.ts` (one comment), `src/lib/slideshowPhotos.ts` and `src/lib/slideshowPhotos.test.ts` (add `slideshowImageUrl` and its test), `src/components/SlideshowPhotoSheet.tsx` and `src/components/SlideshowPhotosManager.tsx` (use `slideshowImageUrl` only). Must not touch: everything else.
- **Blockers:**
  1. (Vision) The host keeps its view of the world fresh. While the tablet has been idle at least a minute, or while an overlay is showing, it calls `loadScreensaverShow()` at most once every 60 seconds and keeps the latest settings and photo count. Every tick decides with those. Before leaving "awake" it still does a fresh load first, as now. A cached photo count of 0 never stops it from looking again. A showing overlay closes by itself (`setShow(null)`, no route change, nothing pressed) when the rule, with fresh data, says "awake": for example the sleep screen at the sleep end with no photos, or the slideshow after every photo is deleted. It switches slideshow to sleep and back as now. A one-line comment states the rule.
  2. (Captain) `src/app/(app)/settings/wall-tablet/loading.tsx` shaped exactly like `src/app/(app)/profile/loading.tsx` (wide root, `NARROW_PAGE_CLASSES` inside, `SkeletonHeader`, three `SkeletonList`s), no hand-typed class strings.
- **Notes taken:**
  3. (Vision) A load that has not settled after 15 seconds counts as a failure (the same as `null`), so a hung request can never stop the screensaver.
  4. (Captain) `slideshowImageUrl(id, size?: "thumb")` in `slideshowPhotos.ts` beside `photoPaths` is the only builder of the image route URL; the slide, the sheet and the manager use it; one test.
  5. (Captain) "Wake Marshee" and the units "min" and "sec" move into `SCREENSAVER_WORDS`.
  6. (Vision) `screensaver.test.ts:140` comment: Mar 7 is MST, not MDT.
- **Not taken:** the rollback of a failed middle tap (rare; the house shape in `HabitsChoresSettings`); a shared class string for the two steppers (waits on Bryce's answer to amendment 5).
- **Verification:** the gauntlet, all five commands.
- **Evidence required:** the new refresh and auto-close code quoted; how each of Vision's scenarios A and B now ends, traced through the code; gauntlet last lines; `grep -rn "api/slideshow/" src/components` (empty); `git diff --stat`.
- **Done criteria:** Vision and Captain pass 2 both PASS.
- **Report:** DONE (Stark); Fury re-ran 2026-11-09: tsc 0, eslint 0, `npm test` 1635 pass, UTC 1635 tests 0 fail, `npm run build` exit 0 (captured directly; Stark's was piped). Host now refreshes at most once a minute while idle a minute or while showing, decides with the fresh data, closes a shown overlay by itself when the rule says awake, and treats a load still pending after 15 s as a failure. `slideshowImageUrl` adopted in three components; `grep -rn "api/slideshow/" src/components` empty.

### C6 — Gate pass 2 fix: no self-close mid-tap, slower background refresh
- **Status:** DONE
- **Objective:** A shown overlay never closes by itself while someone may be touching it, and the tablet's background checks are slow enough for the production database to suspend.
- **Boundaries:** may touch: `src/components/ScreensaverHost.tsx` only. Must not touch: everything else.
- **Spec:**
  1. (Vision blocker) The self-close (`setShow(null)` when the fresh rule says "awake") runs only when `Date.now() - lastTapRef.current >= IDLE_REFRESH_AFTER_MS`, reading `lastTapRef` after the load returns. A comment says why: a recent touch means the overlay's own click will wake it.
  2. (Vision cost note, Fury's call) Loads happen in exactly three cases: (a) leaving "awake" for slideshow or sleep: as now, held back only by a recent failure; (b) the cached rule's answer differs from what is showing in any other way (slideshow to sleep, sleep to slideshow, a shown overlay to awake): at most once every 60 seconds; (c) a background refresh while idle at least a minute or while an overlay shows: at most once every 10 minutes (`BACKGROUND_REFRESH_MS`). Failures wait 60 seconds as now. No case can load more than once a minute except (a) after a state change. The doc comment states the three cases.
  3. Wrap the long "Rule:" comment (Captain's pass-2 note).
- **Verification:** the gauntlet, all five commands.
- **Evidence required:** the new code quoted; a trace of: the 6 AM sleep end with 0 photos (closes within about a minute, no tap); a tap during an in-flight load (overlay stays until its own click); a household with 0 photos where a parent adds one at noon and sleep is off (slideshow within about 10 minutes plus Start after); worst-case loads per hour while the tablet sleeps all night (6, plus at most one per state change); gauntlet last lines; `git diff --stat` (one file).
- **Done criteria:** Vision pass 3 PASS.
- **Report:** DONE (Stark); Fury re-ran 2026-11-09: tsc 0, eslint 0, `npm test` exit 0 (1635), UTC exit 0 (1635, 0 fail), build exit 0 (Stark, captured). Self-close now needs a minute with no touch; loads in three cases (leave awake; other change at most once a minute; background at most once every 10 minutes). Bryce asked what the 10 minutes buys; refresh cadence may change after his answer, before Vision pass 3.

### C7 — Neon-friendly checking, and Strange's phase 1 polish
- **Status:** DONE
- **Objective:** The tablet only wakes the database when something can actually change, and the Wall tablet page gets Strange's small fixes.
- **Why (Bryce's Neon screenshot, 2026-11-09):** Free plan, 100 CU-hours a month, 5.62 used since Oct 31. Neon suspends the project at the limit, which would take Marshee down. A database that is asked something every 10 minutes never gets to sleep (it sleeps after 5 idle minutes). A tablet checking all day and night would cost about 90 to 180 CU-hours a month.
- **Boundaries:** may touch: `src/components/ScreensaverHost.tsx`, `src/components/LadderStepper.tsx`, `src/components/WallTabletSettings.tsx`, `src/app/(app)/settings/wall-tablet/loading.tsx`. Must not touch: everything else.
- **Spec:**
  1. In `ScreensaverHost.tsx` replace the 10-minute background case. Loads happen only in these cases, and the doc comment lists them: (a) leaving "awake" for slideshow or sleep: a fresh load first, as now; (b) the cached rule's answer differs from what is showing (slideshow to sleep, sleep to slideshow, a shown overlay to awake): at most once every 60 seconds, which only happens at real transitions; (c) while a slideshow is showing: one refresh at most every 60 minutes (`BACKGROUND_REFRESH_MS = 3_600_000`), so new photos and changed settings arrive; (d) awake and idle past "Start after" outside sleep hours with a cached photo count of 0: one check at most every 60 minutes. Never a refresh while someone is using the tablet, and never during the sleep overlay except (b). Keep the 15-second load timeout, the 60-second failure wait and C6's rule that a self-close needs a minute with no touch.
  2. `LadderStepper.tsx`: the value span's `min-w-16` becomes `min-w-20`.
  3. `loading.tsx`: add a `h-11 w-24` block for the BackLink, then three groups, each `mt-6` with a `h-6 w-32` heading block over `SkeletonList` with `rows={3}`, `rows={3}` and `rows={4}`; no hand-typed class strings beyond those sizes.
  4. `WallTabletSettings.tsx`: any successful save clears every row's error line.
- **Not taken:** skipping a Black from or Until value equal to the other end (a design call, waiting on Bryce).
- **Verification:** the gauntlet, all five commands, with `npm run build` captured as `BUILD=$?` without a pipe.
- **Evidence required:** the new load-case code quoted; traces for: tablet asleep all night (loads at the transitions only, none between); slideshow showing all day (one load an hour); 0 photos, a parent adds one at noon, sleep off (appears within an hour plus "Start after"); a tap during an in-flight load (overlay stays until its own click); `git diff --stat`.
- **Done criteria:** Vision pass 3 PASS.
- **Report:** DONE (Stark); Fury re-ran 2026-11-09 with exit codes captured: tsc 0, eslint 0, `npm test` 0 (1635), UTC 0 (1635, 0 fail), build 0. Four load cases (leave awake; state change at most once a minute; slideshow showing one refresh an hour; awake with 0 photos one look an hour); none overnight between transitions; `wake()` no longer resets the hourly timer; stepper `min-w-20`; skeleton reshaped; a successful save clears every row's error.

### C8 — Sleep times never equal, and Vision pass 3 notes 1 and 2
- **Status:** DONE (Bryce approved 2026-11-09: "It's important that nobody accidentally turns sleep off"; build after Vision pass 3 so his review stays on fixed code)
- **Objective:** The Black from and Until steppers skip any time equal to the other one; a running slideshow takes fresh photos and settings; a photo that fails to load is not asked for again.
- **Boundaries:** may touch: `src/lib/screensaver.ts` (`stepSleepMinute` gains an optional `avoid` argument, or a new pure helper beside it), `src/lib/screensaver.test.ts` (tests), `src/components/WallTabletSettings.tsx` (pass the other end), `src/components/ScreensaverHost.tsx` and `src/components/ScreensaverSlide.tsx` (notes 1 and 2). Must not touch: everything else.
- **Spec:** stepping Black from skips the value equal to Until, and the reverse; wrapping round midnight still works; a stored equal pair (made before this change) still displays and each stepper moves off it normally. The server's `parseScreensaverField` is unchanged (equal stays accepted there, meaning no sleep hours, per the C1 rule). No new words.
  Vision note 1: when a refresh load returns while a slideshow is showing and its photo ids or its settings differ from what is showing, the host replaces the slideshow's data and the slide restarts its round (at most once an hour, only when something differs; no route change, nothing pressed; the self-close rule is untouched). Vision note 2: `ScreensaverSlide` keeps a set of ids whose image failed to load, never picks one again during that slideshow, and when every id has failed keeps the existing 30-second retry. Not taken: the deactivated-login retry (rare).
- **Verification:** the gauntlet, all five commands, exit codes captured.
- **Evidence required:** tests for skip up, skip down, skip across midnight, and an already-equal pair; gauntlet last lines; `git diff --stat`.
- **Done criteria:** Vision reviews the C8 diff and PASSES (a new gate on new code, not a fourth pass on the old).
- **Report:** DONE (Stark); Fury re-ran 2026-11-09 with exit codes captured: tsc 0, eslint 0, `npm test` 0 (1637), UTC 0 (1637, 0 fail), build 0. `stepSleepMinute(minute, dir, avoid?)` skips the other end (5 skip tests plus the already-equal pair); a running slideshow takes fresh photo ids and settings at the hourly refresh only when they differ (caption-only changes wait for the next start); `ScreensaverSlide` keeps a per-slideshow set of failed ids and never asks for them again. Host and slide changes have no tests (only tsc, eslint, build); Vision and Strange cover them.

### C4 — Records (Fury)
- **STRUCTURE.md: Bryce approved Captain's amendments 1 to 5 (2026-11-09), written by Fury with Captain's pass-2 corrections: Screensaver entry, Slideshow photos writes and `slideshowImageUrl`, `minuteOfDayInZone` in the householdDate entry, Wall tablet in the short pages and loading lists, the two-steppers line. STRUCTURE.md now 1,810 lines (trend; the split PR is its own session).**
- Mission 57's Delivery "Shipped check" line; STRUCTURE.md entry for the screensaver (Captain's wording, Bryce's yes); CLAUDE.md "What's built" line; `.avengers/status.md` tablet check; this file's Delivery.

### C9 — The clock stays readable on bright photos (Strange phase 2 blocker)

- **Objective:** The clock and date always sit on a dark shade, whatever the photo and whether or not it has a caption or taken-on date.
- **Boundaries:** may touch `src/components/ScreensaverSlide.tsx` only. Must not touch anything else.
- **Change:** when `settings.showClock` is on, render a shade that does not depend on the photo, as a sibling just before the clock block: `<div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />`. Keep the per-photo caption shade. Give both clock lines `[text-shadow:0_1px_8px_rgb(0_0_0/0.6)]`. The clock block must still render above the new shade.
- **Verification:** `npx tsc --noEmit`, `npx eslint src/components/ScreensaverSlide.tsx`, `npm test`, `npm run build`, each exit 0.
- **Evidence required:** the diff and each command's exit code.
- **Done criteria:** Strange re-measures white clock text on the orange and pink test photos at 1366x1024 and 1180x820: 3:1 or better under the 72px clock, 4.5:1 under the date line.

### C9b — The clock shade sits under the caption, not over it (Vision C9 blocker)

- **Objective:** The photo-independent clock shade darkens the photo only; the caption and taken-on lines paint above it.
- **Boundaries:** may touch `src/components/ScreensaverSlide.tsx` only.
- **Change:** remove the shade div that C9 added to `ScreensaverSlide`'s clock fragment (the clock block keeps `z-10` and its text-shadow). Inside `PhotoLayer`, right before the caption `div`, render `{settings.showClock && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />}` with no z-index, so DOM order puts the caption above it. Do not add z-index to the caption (a fading layer gets its own stacking layer and the caption would drop under the shade).
- **Verification:** `npx tsc --noEmit`, `npx eslint src/components/ScreensaverSlide.tsx`, `npm test`, `npm run build`, each exit 0.
- **Evidence required:** the diff and each exit code.
- **Done criteria:** Vision PASS on the diff; Strange measures the clock (3:1 under the 72px clock, 4.5:1 under the date) on the orange and pink photos and the caption and taken-on lines (4.5:1) on the captioned photos, at 1366x1024 and 1180x820.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD e9cc68e) | BLOCKED | 1: `ScreensaverHost.tsx:75,78,100-101` once a load returns 0 photos the host never looks again while awake (photos added later never show without a reload), and a shown overlay only closes on a tap, so with 0 photos the sleep screen stays black all day after 6 AM (breaks Q7 and the done-means "without a reload") | gauntlet re-run green, boundaries clean; notes: decisions use the last-loaded settings (lowering Start after takes one more cycle); a hung load leaves `loadingRef` stuck; tap-through reviewed, none found; rollback of a failed middle tap restores the older value (house shape); save action sound (`__proto__` refused); S1 writes move unchanged; shuffle and DST sound; test comment says MDT on Mar 7 (MST) |
| 1 | Captain (HEAD e9cc68e) | BLOCKED | 1: `/settings/wall-tablet` has no own `loading.tsx` (Short pages rule; it inherits Settings' two-column skeleton) | notes: three hand-built `/api/slideshow/${id}/image` URLs (propose `slideshowImageUrl` in `slideshowPhotos.ts`); `LadderStepper` copies `QuantityStepper`'s button classes; "Wake Marshee", "min", "sec" typed in components; two Settings labels repeat `SCREENSAVER_WORDS`; client uses `formatHouseholdClock` on purpose (Denver on the tablet); layout adds one read for device logins only; STRUCTURE.md will cross 1,783 (trend, split PR later). Drafted amendments 1 to 5 (Screensaver entry; Slideshow writes sentence; `minuteOfDayInZone` in the householdDate entry; Wall tablet in the Short pages and loading lists; optional two-steppers line), waiting for Bryce. |
| 2 | Captain (HEAD 701b9d6) | PASS | none (loading skeleton blocker closed) | `slideshowImageUrl` the only image URL builder; words moved; notes: wrap the long rule comment in `ScreensaverHost.tsx` on next touch; stepper class copy waits on amendment 5. Corrected amendments 1, 2, 4 for the fix (`SCREENSAVER_WORDS` complete, `slideshowImageUrl`, `slideshowWrites.ts` function names, Wall tablet in the loading list). |
| 2 | Vision (HEAD 701b9d6) | BLOCKED | 1: `ScreensaverHost.tsx:119-121` the new self-close can run mid-tap (pointerdown during a refresh load, the load returns "awake", the overlay unmounts with the finger down, the click lands on the page underneath, and `wake()` never routes) | pass-1 blocker closed in both scenarios; 15 s timeout sound (also covers Next 16 dropping an in-flight action on navigation); no storm; `slideshowImageUrl` builds identical strings; notes: once-a-minute polling all day and night may keep the production Neon database from ever suspending (cost); a hung refresh holds the Server Action queue; a running slideshow picks up photo changes only after it closes (unchanged) |
| 1 | Strange phase 1 (HEAD after C6, dev server, Bryce's session) | PASS | none | Settings row and `/settings/wall-tablet` match the mock and `SCREENSAVER_WORDS` on phone and iPad, light and dark; 48px targets; ladders stop at the ends; sleep times wrap; switches save; failed save reverts with an amber line; contrast and focus fine. Notes: time values wider than `min-w-16` so the sleep minus buttons shift (use `min-w-20`); Black from equal to Until silently means no sleep (Bryce's call: skip the equal value); loading skeleton taller than the page (18 bars, no BackLink block); a failed-save line stays until that row changes; focus drops when a stepper reaches its end (same as QuantityStepper). Left on dev: Start after 1 min, sleep off, 4 test photos (portrait one captioned "Test caption"). Phase 2 (the Tablet login) waits for Bryce. |
| 3 | Vision (HEAD 915abd0) | PASS | none | gauntlet re-run green with exit codes; boundaries clean; every earlier scenario holds; asleep all night 0 loads between transitions, slideshow all day 1 an hour. Notes: (1) the hourly refresh never replaces a running slideshow's photos or settings, so new photos and changed seconds or switches arrive only at the next start; (2) a photo deleted before this tablet first showed it is re-requested every round (404 is not cached, 2 DB reads each), which can keep Neon awake (about 3 CU-hours once with sleep on, unbounded with sleep off and no taps); (3) a deactivated tablet login retries every 60 s (rare, not taken); (4) iPad Safari's cache keeping the photos is unproven from code, so watch the Neon chart for a week after launch; (5) a successful save on one row also clears another row's failure line (as specified) |
| C8 | Vision (HEAD a78c1bf, new gate on the C8 diff) | PASS | none | gauntlet green with exit codes; `stepSleepMinute` with `avoid` checked over all 2,304 grid cases, 0 violations; the swap cannot loop, cannot run after a recent tap, keeps the same overlay; `failedIds` bounded and reset on restart; no earlier scenario regressed. Notes: a photo that fails once (Wi-Fi blip) stays out until the slideshow restarts; a failed save plus a well-timed tap can still make an equal pair (rare, visible, steppable); captions reach a running slideshow only at the next start; host and slide changes are proven by reading only, so Strange's device phase should watch one hourly swap |
| 2 | Strange phase 2 (HEAD db6c706, dev server, Bryce's Tablet session) | BLOCKED | clock and date unreadable on light photos without a caption or taken-on date (white on orange 2.14:1, pink 2.52:1; the only shade is the caption one, drawn only when a caption or date exists). Fix: C9 | Checked and fine: sleep goes fully black, a tap wakes to "/" without pressing what's under it (Inventory tile, Menu button, Today's meals tile), back to black after exactly 60 s; sleep hours ending hand over to the slideshow untouched (9:30:01); 15 s per photo; 1 s crossfade; no repeats in rounds 2 to 4; blurred sides at 1366, 1180, 744 and 390 widths; caption and taken-on lines correct; clock and date match Denver. Notes: at 390 wide the clock and caption overlap (tablet only, so not a blocker); the dev-only Next badge covers the bottom right; hover outline after wake is mouse-only; clock draws on black for under a second before the first photo; hourly swap not watched (an hour-long wait), so it goes on Bryce's tablet check |
| C9 | Vision (HEAD 1435f5f) | BLOCKED | the new full-width z-10 shade is drawn over the caption and taken-on lines (the caption sits inside `PhotoLayer` with no z-index), cutting the taken-on line to about 2.5 to 3.1:1 even over black. Fix: C9b (shade moves inside `PhotoLayer` before the caption). Strange's C9 re-check was stopped before it reported, since the code is changing again | gauntlet re-run green (tsc, eslint, 1637 tests, build); boundaries clean; shade cannot catch taps; clock paints above it; nothing renders with showClock off. Note: 224 px shade is heavy at 390 wide (tablet only) |
| C9b | Vision (HEAD 8282a1d) | PASS | none | gauntlet re-run green (tsc, eslint, 1637/1637, build); boundaries clean; caption paints above the clock shade, also during the crossfade; clock above both layers' shades; taps and showClock off unaffected. Notes: the incoming layer briefly covers the outgoing caption during the fade (normal crossfade); captioned photos stack two gradients (darker, fine); 224 px shade heavy at 390 wide (tablet only) |
| 2 (pass 2) | Strange phase 2 (HEAD 8282a1d, Tablet session) | PASS | none | worst glyph pixel under the clock 3.18 to 3.49:1 (was 2.14 and 2.52), date 5.05 to 5.55:1 worst, on orange and pink at 1366x1024 and 1180x820; caption 15.9 to 16.1:1, taken-on 9.2 to 12:1; tap still wakes to "/" without pressing Inventory. Notes: clock margin on very bright warm photos is thin (step the shade to `via-black/50` if Bryce's real photos show it); dev-only Next badge; mouse hover outline after wake |
| merge | Captain (merge 46c7275, structure moves) | PASS | none | amendments 1 to 5 word for word after the split (only 58 to 61 changed); Screensaver rule in `docs/structure/slideshow.md` per the 15-line companion rule; pointer form matches; nothing defined twice; remaining mission-58 mentions are Text size; layout imports both textSize and screensaverRead. Notes applied: companion title now "Slideshow and screensaver", intro says the Screensaver was added by mission 62, extra opening sentence dropped. Left: two long unwrapped lines in layout.md; companion sizes grew (slideshow 35 to 73, layout 262 to 286) |
Budget: 3 passes per gate, then stop and surface.

## Handoff log

- 2026-11-09 (Fury, Opus 5.5): step 0 done (above). Read the plan, mission 57, mission 54 and the S1 code. Mission file opened. Mock and questions going to Bryce.
- 2026-11-09 (Fury, Opus 5.5): Bryce approved all. STRUCTURE.md split proposed as its own task card. Contracts C1 to C4 written. C1 preflight: one hard failure, `prisma/schema.prisma` over 650 lines, which STRUCTURE.md's File-size caps exempts (same as every migration mission); REVIEW claims checked (`dayOfWeek`, `FULL_DAY_NAMES`, `FULL_MONTH_NAMES`, `formatHouseholdClock`, `hourInZone`, `parseDateParam` all exist). C1 dispatched to Stark.
- 2026-11-09 (Fury, Opus 5.5): C5 to C9b built and gated (see ledger). Strange phase 2 on Bryce's dev Tablet login found the clock unreadable on bright photos (C9); Vision caught C9's shade covering the caption (C9b). All gates PASS. Records written; dev cleanup and PR next.

## Delivery

- **Shipped:** the `ScreensaverSettings` table (migration `20261116000000_screensaver_settings`, one CREATE TABLE), pure rules in `src/lib/screensaver.ts` (state, shuffle with no repeats in a round, sleep times that never equal each other, words), `minuteOfDayInZone` in `householdDate.ts`, the Wall tablet settings page with +/− ladders, and `ScreensaverHost` plus `ScreensaverSlide` mounted in AppChrome for device logins only. The tablet checks the server only when something can change (Neon free hours, C7). Clock shade so it reads on bright photos (C9, C9b).
- **Gates:** Captain PASS (pass 2); Vision PASS (pass 3, plus new gates on C8 and C9b); Strange PASS (phase 1, and phase 2 pass 2 on the Tablet login). STRUCTURE.md amendments 1 to 5 (Bryce approved).
- **Open notes, not this mission's job:** a photo that fails once stays out until the slideshow restarts; a caption edit reaches a running slideshow only at its next start; at phone width the clock and caption overlap (tablet only); the clock's contrast margin on very bright warm photos is thin (step the shade to `via-black/50` if real photos show it); the hourly swap was not watched live and is on Bryce's tablet check; STRUCTURE.md is 1,810 lines and its split is its own PR.
- **Dev copy left behind:** a Tablet device login Bryce created on the dev branch for the phase 2 check (dev only; never scripted away, per the User table rule).
- **Renumbered 58 to 61, then 62, at merge (2026-11-09):** while this mission ran, main took 58 (text size), 59 (STRUCTURE.md split), 60 (calendar sync PR 3) and, after PR #101 opened, 61 (calendar sync hardening). Commits before the merges say "Mission 58" or "Mission 61"; they are this mission. The STRUCTURE.md amendments moved with the split: the Screensaver and Slideshow photos rules live in `docs/structure/slideshow.md`, the short-page and loading lines in `docs/structure/layout.md`, the stepper and `minuteOfDayInZone` lines stay in STRUCTURE.md.
- **Migration order note:** `20261116000000_screensaver_settings` shares its timestamp with main's `add_text_size` and `calendar_pull` and sorts before the already-applied `20261117000000_calendar_pull_ok`. Kept as is: it is already applied on dev under this name, and `prisma migrate deploy` applies every unapplied migration. The production check confirms it.
- **Shipped check:** merged as PR #101, merge commit `f7ec0cb6cca9231d3e1d524094629c164e118373`. Production deploy `dpl_Gmn3gQ9YLYi8s81ED647CpNAZnuU` is READY, and its build applied migration `20261116000000_screensaver_settings`. Recorded in mission 64's PR, since direct pushes to main are blocked.
