# Mission: Family copies PR 4, household settings and stores

**Project:** family-hub (Marshee)
**Status:** DELIVERED (all gates PASS; PR, merge and the production check follow in the Delivery section)
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr4-stores` (cut from `main` at 183f02e)
**Plan:** `.avengers/plans/family-copies-v1.md`, "PR 4" and "Running order"

## Brief

- **Goal:** each family copy picks its own store list. Today `STORES` in
  `src/lib/constants.ts` is fixed in code (Walmart, Costco, Amazon, Target,
  Maceys, Other). Add a one-row `HouseholdSettings` table (also the home of
  fields PRs 6 and 7 need), read the saved store list everywhere stores are
  offered or validated, and give parents and admins a Settings screen to edit it.
- **Done means:** Gauntlet green; `npm test` and the direct `TZ=UTC` command
  from AGENTS.md pass; Vision, Captain and Strange PASS; with no
  `HouseholdSettings` row, Bryce's shopping list, inventory cart sheet, expiring
  cart sheet, add bar and edit sheet show exactly today's six stores in today's
  order; a saved list replaces them; filter chips show the saved list plus any
  store still used on an item; `git log origin/main..HEAD` empty after merge.
- **Out of scope:** using family name, setup time, recovery hash, checklist
  dismissed time (PRs 6 and 7 only read/write them); the Assistant API's store
  enum (`src/lib/assistant/schemasShopping.ts` keeps `z.enum(STORES)`, Winnie is
  Bryce's only and his list is unchanged until he edits it, recorded as a
  follow-up); dashboard store breakdown order beyond accepting the list.

## Danger register

- `DATABASE_URL` must be the dev branch host `ep-hidden-pine-a6ajzk11-pooler`
  (checked 2026-11-26 by Fury: it is). Anything else: stop.
- Never `npm run db:seed` or `npm run db:reset`. No clean/reset script for `User`.
- Migration is additive only (one `CREATE TABLE`); SQL reviewed before applying.
  Applying it to the dev branch with `npx prisma migrate deploy` is allowed.
- Never `git add -A` / `git add .`; stage by path; `git show --stat HEAD` after.
- No pushes, merges or deploys by any agent but Fury.
- Secrets never in chat, code or git.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- GitHub check "Gauntlet" green on the PR

## Assembled

- Stark + Vision (always).
- Strange: a new Settings screen and store chips change what people see.
- Captain: new files (a read module, a pure list module, a page, an action).
- Banner: not needed, Fury read the store code inline (about 10 files).

## Facts gathered (Fury, 2026-11-26)

- `toStore(value)` already exists, `src/lib/constants.ts:211`, against `STORES`.
- Write sites: `src/lib/groceryWrites.ts` lines 65 (add), 257 (edit), 316
  (pantry item to list), 354 (low items to list). Callers: `actions/groceries.ts`,
  `actions/pantry.ts`, assistant shopping routes.
- UI using `STORES`: `GroceryList.tsx:152` (chips), `GroceryItemEditSheet.tsx:175`,
  `StorePickerSheet.tsx:78` (used by `PantryList`, `ExpiringList`,
  `AddLowItemsButton`), `StoreSelect.tsx:25`. `dashboard.ts:96` sorts the store
  breakdown by `STORES` order.
- Pattern to copy: `ScreensaverSettings` (`prisma/schema.prisma:1429`) read only
  in `src/lib/screensaverRead.ts`.

## Contracts

### S1 — Table, store list rules, and wiring (no new screen)

- **Objective:** add `HouseholdSettings`, make every store offer and every
   store write use the household's saved list (falling back to today's
   `STORES`), with Bryce's copy unchanged when no row exists.
- **Boundaries:** may touch: `prisma/schema.prisma` (append one model only),
   new `prisma/migrations/20261126200000_household_settings/migration.sql`,
   `src/lib/constants.ts` (`toStore` and the `Store` type only),
  new `src/lib/storeList.ts` (pure), new `src/lib/storeList.test.ts`,
  new `src/lib/householdSettingsRead.ts` (server-only),
   `src/lib/groceryWrites.ts`, `src/lib/dashboard.ts` (storeBreakdown takes an
   optional list), `src/lib/dashboardLoaders.ts`, `src/app/actions/pantry.ts`
   (type only), `src/components/GroceryList.tsx`,
   `src/components/GroceryItemEditSheet.tsx`, `src/components/StorePickerSheet.tsx`,
   `src/components/StoreSelect.tsx`, `src/components/PantryList.tsx`,
   `src/components/ExpiringList.tsx`, `src/components/AddLowItemsButton.tsx`,
   `src/app/(app)/kitchen/shopping/page.tsx`, `src/app/(app)/kitchen/inventory/page.tsx`,
   `src/app/(app)/kitchen/expiring/page.tsx`, and any other component file that
   only passes the `stores` prop through (list each in the report).
  Must not touch: `src/lib/assistant/**`, `src/app/api/**`,
   `src/app/(app)/settings/**`, `package.json`, `CLAUDE.md`, `STRUCTURE.md`,
   `DESIGN.md`. (The generated Prisma client is gitignored; regenerating it is fine.)
  `prisma/schema.prisma` is over 650 lines but STRUCTURE.md exempts it (the
  hard-cap rule); preflight's failure on it is that known exemption.
- **Rules to implement:**
   - Model `HouseholdSettings { id String @id @default("household");
     familyName String?; stores String? (newline-separated names, null = use
     the built-in list); setupFinishedAt DateTime?; recoveryCodeHash String?;
     checklistDismissedAt DateTime?; updatedAt DateTime @updatedAt;
     updatedById String? }` with a `///` doc comment in the ScreensaverSettings
     style saying which PR uses which field. Migration is the matching single
     `CREATE TABLE`, nothing else.
   - new `src/lib/storeList.ts` (pure, no db): `MAX_STORES = 12`,
     `MAX_STORE_NAME = 24`, `OTHER_STORE = "Other"`. `parseStoreList(text:
     string | null | undefined): string[]`: null, empty or only-blank text
     returns `[...STORES]`; otherwise split on newlines, trim, collapse inner
     whitespace, cut each to 24 characters, drop blanks, drop case-insensitive
     duplicates (first wins), drop any "other" (any case) then take the first
     11 and append "Other" last (so at most 12 and "Other" always present,
     always last). `serializeStoreList(names: string[]): string` (the same
     cleaning, joined by "\n", for the later save action).
     `storeFilterOptions(saved: readonly string[], itemStores: (string |
     null)[]): string[]`: the saved list in order, then any non-null item store
     not in it (first-seen order), so a removed store still shows a chip while
     an item uses it.
   - `toStore(value: unknown, allowed: readonly string[] = STORES): string |
     null` in `constants.ts`: exact match against `allowed`. `Store` becomes
     `string` (keep the export name so callers compile, comment why).
   - new `src/lib/householdSettingsRead.ts` (`import "server-only"`): the only
     reader of the table. `householdStores(): Promise<string[]>` returns
     `parseStoreList(row?.stores)`. No login check (callers check), same
     comment style as `screensaverRead.ts`.
   - `groceryWrites.ts`: each of the four write sites validates with
     `toStore(x, await householdStores())`. Edit keeps an item's existing store
     when the incoming value equals the current stored value even if it is no
     longer on the list (saving an untouched edit sheet must never blank a
     removed store). Otherwise an unknown store becomes null as today.
   - Pages load `householdStores()` once and pass `stores: string[]` down.
     `GroceryList` chips: `[ALL, UNASSIGNED, ...storeFilterOptions(stores,
     items.map(i => i.store))]`. `GroceryItemEditSheet` options: `stores`, plus
     the item's current store first-after-blank if it is not in `stores`.
     `StorePickerSheet` and `StoreSelect` take `stores`. `StoreSelect` keeps the
     remembered last store only if it is in `stores`.
   - `storeBreakdown(items, stores = STORES)`; `dashboardLoaders.ts` passes
     `await householdStores()`. Leave the assistant summary route on the default.
   - Tests in `storeList.test.ts`: fallback for null/""/"  \n ", order kept,
     trimming, 24-char cut, duplicate drop (case-insensitive), "Other" forced
     last and never doubled, cap at 12 with 15 inputs, `storeFilterOptions`
     keeps removed-but-used stores and ignores null, `toStore` with and without
     a list. The new test file sits in `src/lib/` so the existing glob covers it.
- **Verification:** the full gauntlet above minus the GitHub check;
   `npx prisma migrate deploy` against the dev branch after printing only the
   host; `npm run build`.
- **Evidence required:** the migration SQL in full; test counts before and
   after for both timezone runs; tsc/eslint/build tails; `git diff --stat`; a
   grep showing no remaining `STORES` use outside `constants.ts`,
   `storeList.ts`, `dashboard.ts` default, assistant schema and tests.
- **Done criteria:** Fury re-runs the grep and tests; with no row in dev,
   `/kitchen/shopping` chips read All, No store, Walmart, Costco, Amazon,
   Target, Maceys, Other (Strange confirms by screenshot).

### S2 — Stores screen in Settings

**Bryce's calls (2026-11-26, in chat, on the mock):** build as shown; a rename
moves items already on the list to the new name; a removed store stays on
items until they are bought (its chip shows while used, already S1's
`storeFilterOptions`).

- **Objective:** parents and admins add, rename, reorder and remove stores on
  a new `/settings/stores` screen, saved instantly to `HouseholdSettings.stores`.
- **Boundaries:** may touch: new `src/app/(app)/settings/stores/page.tsx`,
  new `src/app/(app)/settings/stores/loading.tsx` (only if sibling settings
  pages have one; `slideshow` does not, so probably skip),
  new `src/components/StoreListEditor.tsx`, new `src/app/actions/householdStores.ts`,
  new `src/lib/householdStoreWrites.ts` (server-only), `src/lib/storeList.ts`
  and `src/lib/storeList.test.ts` (add pure edit helpers and their tests only),
  `src/app/(app)/settings/page.tsx` (one new door row and its data line only,
  plus the header comment's list of doors).
  Must not touch: everything S1 owns except the two `storeList` files above,
  `prisma/**`, `src/lib/assistant/**`, `src/app/api/**`, `package.json`,
  `CLAUDE.md`, `STRUCTURE.md`, `DESIGN.md`.
- **The screen (as mocked):**
  - Settings door: `Store` icon (lucide `Store`, same as `STORE_ICON`), label
    "Stores", the count of stores on the right, then the chevron, same classes
    as the Slideshow photos row, in its own `order-3` div placed right after the
    Wall tablet door. Shown when `canSyncCalendars` (parents and admins on a
    real login).
  - Page: `requireRole(...MANAGER_ROLES)`, `BackLink` to Settings, h1 "Stores",
    one line "The stores on your shopping list, in this order. Tap a store to
    rename it.", `data-page-width` matching the slideshow page.
  - List: `SortableList` (grip handle) for every store but "Other"; each row
    wrapped in `SwipeActions` with one action "Remove" (destructive style as
    elsewhere), one tap, no confirm (house rule). Tapping the row's name opens
    a rename sheet (house sheet pattern, title "Rename store", one text input
    maxLength 24, helper "Up to 24 letters. Items on the list for <old> move to
    the new name.", Save button). "Other" is a plain, non-draggable,
    non-swipeable row last with the small text "Always last".
  - Under the list: a text input (placeholder "Add a store", maxLength 24) and
    an "Add" button, then "N of 12 stores". At 12 the input and button stay
    but Add shows the inline error "You can have up to 12 stores." Duplicate
    (case-insensitive, including "Other"): "That store is already on the
    list." Blank: "Type a store name first." Errors clear on typing.
  - Every change is optimistic (`useOptimistic` or local state), then the
    action; on a failed save, put the list back and show the action's error
    inline. 48px+ targets; rem text.
- **Writes:** `src/lib/householdStoreWrites.ts` holds the database work, no auth:
  `saveStoreList(names, actorUserId)` upserts row `"household"` with
  `serializeStoreList(names)`; `renameStore(from, to, actorUserId)` in ONE
  transaction saves the list with `from` replaced by `to` in place AND runs
  `groceryItem.updateMany({ where: { store: from }, data: { store: to } })`.
  Pure helpers in `storeList.ts` decide validity and return the next list or
  an error string: `addStore(list, name)`, `removeStore(list, name)`,
  `renameInList(list, from, to)`, `reorderStores(list, orderedNames)` ("Other"
  can never be removed, renamed, moved or added twice; reorder must be the same
  set or it is refused; rename to a name another store already has, any case,
  is refused; rename to the same name with different capitals is allowed).
  `src/app/actions/householdStores.ts` (`"use server"`): `addStoreAction`,
  `removeStoreAction`, `renameStoreAction`, `reorderStoresAction`; each calls
  `getVerifiedUser()`, refuses unless a non-device login with a MANAGER_ROLES
  role, reads the current list with `householdStores()`, applies the pure
  helper, saves, then `revalidatePath` for `/settings/stores`, `/settings`,
  `/kitchen/shopping`, `/kitchen/inventory`, `/kitchen/expiring` and `/`.
  Returns `{ ok: true, stores } | { ok: false, error }`, never throws.
- **Tests:** every pure helper, including each refusal above, "Other" stays
  last after every operation, cap 12 on add, rename case-only change allowed.
- **Verification:** full gauntlet; `npm run build`; in the browser on the dev
  server as a parent or admin on the dev branch: add, rename, reorder, remove
  each persist across reload and show on `/kitchen/shopping` (Strange repeats
  this). Restore the dev list afterwards (remove what you added).
- **Evidence required:** test counts both timezones; tsc/eslint/build tails;
  `git diff --stat`; what you clicked and what reloaded.
- **Done criteria:** Strange PASS on screenshots against DESIGN.md; Vision PASS.

## Build log

- S1, Stark: DONE. Committed by Fury as the commit "Household settings table
  and saved store list". Migration applied to dev branch only. `npm test`
  2283 to 2293; TZ=UTC 2293 tests, 2283 pass, 10 skipped (Denver-only, same
  before). tsc, eslint, build clean.
- S2, Stark: DONE for code; browser check not done (no test login in seed or
  example files). `renameStore` takes the already-computed next list as its
  first argument (the action runs the pure helper first). Rename sheet lives in
  `StoreListEditor.tsx`. `npm test` 2302; TZ=UTC 2302 tests, 2292 pass, 10
  skipped. Build lists `/settings/stores`.

## Gate log

| Pass | Gate | Verdict | Findings |
|---|---|---|---|
| S1 / 1 | Vision (HEAD of S1, clean scratch checkout plus shared tree) | PASS | No blockers. Bryce's copy unchanged with no row. NOTES: `editIn` reads the list inside the locked transaction (two pool connections per edit); shopping page leaves a promise unhandled if the list query fails first; `serializeStoreList(["Other"])` is "" which reads back as the six defaults (S2 risk); store names "All"/"Unassigned" clash with chip labels (S2 risk); a removed store's chip vanishing while it is the active filter; `.slice` can split an emoji; `.env` line 13 holds a commented-out `DATABASE_URL` for another host (`ep-hidden-surf-`), for Bryce |
| S1+S2 / 1 | Captain (commits S1, S2) | PASS | No blockers. NOTES: rename `householdStoreWrites.ts` to `householdSettingsWrites.ts` before PR 6 and share one upsert helper; `cleanNames` should call `cleanName`; `StoreListResult` duplicates `StoreEdit`; use `SAVE_FAILED` in the editor; first `...Action` names (naming line); `dashboard.ts` types "Unassigned" three times; Stores page has no width cap (Strange's call); trend line for `groceryWrites.ts` 377; STRUCTURE.md text for HouseholdSettings and the store list (Fury adds) |
| S2+F1 / 1 | Vision (HEAD febec90) | BLOCKED | BLOCKER: `StoreListEditor` rolls back to per-edit snapshots, so queued edits that fail can show an unsaved store or resurrect a removed one. NOTES: actions read-modify-write with no row lock (two parents at once, rare); `getVerifiedUser()` outside the try; rename, reorder, Other, cap, F1 fixes, Bryce's copy all checked fine |
| S2+F1 / 1 | Strange (port 3001, 390/820/1180, light and dark) | BLOCKED | Check 1 PASS (Bryce's copy unchanged); all flows work. BLOCKERS: page rows stretch full width on iPad (needs `NARROW_PAGE_CLASSES`); one-off `RenameStoreSheet` duplicates `TitleSheet` (no close button, no autofocus); red optimistic Remove breaks "destructive waits" (Bryce chooses neutral-instant or red-waits). NOTES: Other row label not aligned with names; SwipeActions danger text 2.4:1 in dark (pre-existing, app-wide); Settings skeleton shows for /settings/stores (as slideshow); chip row not scrolled back to All after fallback. Dev data restored; a HouseholdSettings row with the six defaults now exists on dev |
| all / 2 | Vision (HEAD 5810363, after the main merge) | PASS | Pass-1 blocker closed; gauntlet re-run: `npm test` 2316/2316, TZ=UTC 2316 tests 2306 pass 10 skipped, build lists `/settings/stores`; merge kept PR 3's owner gate; migration sorts last. NOTES: STRUCTURE.md count 377 should be 381 (fixed by Fury); filter not reset to All on fallback (harmless); server "That didn't save" vs client `SAVE_FAILED` wording (kept: different situations, server cannot import the client file; Rewards does the same); no row lock (rare); fresh-database CI is proven by the PR's Gauntlet check |
| all / 2 | Strange (HEAD 5810363; 390, 820, 1180; light and dark) | PASS | All three pass-1 blockers closed: 640px narrow column at 1180 (same as Wall tablet); rename is the shared `TitleSheet` (close button, autofocus, hint, maxLength, portaled); Remove is gray `CircleMinus`, instant. Bryce's chips, add bar, edit sheet and Inventory cart sheet read the six stores in order; Settings door under Wall tablet. Profile's TitleSheet unchanged. NOTES: chip-row scroll-back and the narrow skeleton not seen on screen (code read; Bryce's phone check); SwipeActions dark danger contrast (app-wide, follow-up). Dev data restored |

F1 (below) fixes the S2-reachable notes before S2 is gated.

### F1 — Fixes from Vision's S1 notes

- **Objective:** close the store-list holes S2 makes reachable, before S2's gates.
- **Boundaries:** may touch: `src/lib/storeList.ts`, `src/lib/storeList.test.ts`,
  `src/components/GroceryList.tsx`, `src/lib/groceryWrites.ts`,
  `src/app/(app)/kitchen/shopping/page.tsx`. Must not touch anything else.
- **Fixes:**
  1. `serializeStoreList` of a list with no real stores saves the text "Other"
     (never ""), so removing every store keeps just "Other" instead of quietly
     bringing back the six defaults. `parseStoreList("Other")` returns
     `["Other"]`. Test both and the round trip.
  2. `addStore` and `renameInList` refuse "All" and "Unassigned" (any case,
     after cleaning) with "That name is used by the shopping list filters."
     Export the two words from `storeList.ts` as the one definition and make
     `GroceryList.tsx` use them for its `ALL` / `UNASSIGNED` constants.
     `parseStoreList` drops those two names too (so hand-edited text can't
     sneak them in). Tests.
  3. `GroceryList.tsx`: if the active store filter is no longer among the chip
     options (its last item bought or removed), fall back to "All". Derive it
     during render (`const activeFilter = options.includes(storeFilter) ?
     storeFilter : ALL`), no effect.
  4. `groceryWrites.ts`: read `householdStores()` once before `db.$transaction`
     in `patchGroceryItemWithCopies` and pass the list into `editIn`, so no
     extra pool connection is held while the row is locked.
  5. `kitchen/shopping/page.tsx`: load the rows and the store list with
     `Promise.all`, like the other two kitchen pages.
- **Verification:** full gauntlet (tsc, eslint, `npm test`, the direct TZ=UTC
  command, `npm run build`).
- **Evidence required:** test counts both timezones, tails of tsc/eslint/build,
  `git diff --stat`.
- **Done criteria:** Vision re-gate on S2 plus F1 passes.

### F2 — Fixes from Vision, Strange and Captain (pass 1 on S2)

- **Objective:** clear the gate blockers and the cheap structure notes in one batch.
- **Boundaries:** may touch: `src/components/StoreListEditor.tsx`,
  `src/components/TitleSheet.tsx` (new optional props only),
  `src/app/(app)/settings/stores/page.tsx`, new `src/app/(app)/settings/stores/loading.tsx`,
  `src/app/actions/householdStores.ts`, `src/lib/householdStoreWrites.ts`
  (renamed by `git mv` to new `src/lib/householdSettingsWrites.ts`),
  `src/lib/storeList.ts`, `src/lib/storeList.test.ts`, `src/lib/dashboard.ts`
  ("Unassigned" from `storeList.ts` only), `src/components/GroceryList.tsx`
  (chip row scroll only). Must not touch anything else; leave the Remove swipe
  action's tone and icon as they are (Bryce is choosing; contract F3).
- **Fixes:**
  1. Vision blocker: drop per-edit snapshots. Keep a `confirmed` ref (starts at
     `initialStores`) and a pending count. Each ok result sets `confirmed`; a
     failure shows its error only; when pending reaches 0, `setStores(confirmed.current)`.
     Keep the add box refill on failure. The network-failure message is
     `SAVE_FAILED` from `src/lib/useOptimisticRun.ts`.
  2. Strange blocker: wrap the Stores page content in `NARROW_PAGE_CLASSES`
     (like `settings/wall-tablet/page.tsx`), and add a `loading.tsx` skeleton
     of the same narrow shape (title line plus about six 56px rows).
  3. Strange blocker: delete `RenameStoreSheet`; give `TitleSheet` optional
     `label` (default its current label), `hint` (one muted line under the
     input) and `maxLength`; render it through `createPortal` with heading
     "Rename store", label "Store name", hint "Up to 24 letters. Items on the
     list for <old> move to the new name.", maxLength 24, initial value the old
     name, submit "Save". Existing `TitleSheet` callers must look identical.
  4. Strange note: line the "Other" label up with the store names (same left
     inset as grip plus gap).
  5. Strange note: when the store filter falls back to All, scroll the chip
     row back to its start (only on that fallback, not on every render).
  6. Vision note: `getVerifiedUser()` inside the try, so the actions never throw.
  7. Captain: `git mv` the writes file to `householdSettingsWrites.ts` (one
     private upsert helper used by both functions); `cleanNames` calls
     `cleanName`; the action's result type is `StoreEdit` from `storeList.ts`;
     `dashboard.ts` uses `UNASSIGNED_FILTER` instead of typing "Unassigned".
- **Verification:** full gauntlet; `npm run build`; existing `TitleSheet`
  callers unchanged (list them).
- **Evidence required:** test counts both timezones, tsc/eslint/build tails,
  `git diff --stat`, `git status` showing the rename.
- **Done criteria:** Vision and Strange pass 2.

### F3 — Neutral Remove (Bryce's call)

**Bryce (2026-11-26, in chat): "Gray, instant".** Removing a store destroys
nothing (items keep it, it can be added back), so the swipe action is neutral
and stays optimistic, like the cookbook "Remove" in `RecipeList.tsx`.

- **Objective:** the Stores screen's swipe Remove reads as a neutral, reversible action.
- **Boundaries:** may touch: `src/components/StoreListEditor.tsx`. Must not touch anything else.
- **Change:** the SwipeActions action becomes `tone: "neutral"` with the Lucide
  `CircleMinus` icon (outline), label still "Remove", still optimistic through
  the existing queue. Nothing else changes.
- **Verification:** tsc, eslint, `npm test`, `npm run build`.
- **Evidence required:** the diff and the tool tails.
- **Done criteria:** Strange pass 2 sees a gray Remove.

## Delivery

- Captain was not re-run after F2: F2 carried out his own notes (writes file
  renamed for the table, shared upsert helper, `cleanNames` calls
  `cleanName`, `StoreEdit` result, filter word in `dashboard.ts`) and added
  one small `loading.tsx`; Vision pass 2 checked those and the STRUCTURE.md
  text. Fury added Captain's STRUCTURE.md text and the layout.md line.
- Bryce's calls this mission: build the mock as shown; a rename moves list
  items; a removed store stays on items until bought; Remove is "Gray, instant".
- Phone check and follow-ups: `.avengers/status.md`.
- Dev database: the `HouseholdSettings` migration is applied, and a row with
  the six default names now exists (Strange's first add created it), so dev no
  longer exercises the "no row" path; production has no row until Bryce edits.

## Notes and follow-ups

- Assistant API store enum stays fixed (`schemasShopping.ts`); if Bryce edits
  his own store list, Winnie should learn the new list. Follow-up.
