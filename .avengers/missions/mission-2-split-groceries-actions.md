# Mission 2: Split `groceries.ts`

**Project:** family-hub
**Status:** DELIVERED — split shipped, both gates PASS, database at exact baseline
**Started:** 2026-08-14 · **Updated:** 2026-08-14

## Brief

- **Goal:** split `src/app/actions/groceries.ts` (624 lines, **26 from
  STRUCTURE.md's 650 hard cap**) into coherent modules, before the next
  put-away or recipe feature pushes it over. Captain flagged this in
  Mission 0 and named the seam.
- **Done means:** every resulting file is under the 350-line soft cap;
  behavior is **identical** (this is a pure refactor); the full gauntlet is
  green; a real put-away runs end to end against synthetic data and the
  database returns to exact baseline.
- **Out of scope:** any behavior change, bug fix, or improvement noticed
  along the way — those get recorded as NOTEs and become their own mission.
  A refactor that also "improves" something is a refactor nobody can verify.

## Danger register

- **The dev database IS the live family database.** Never `db:seed` /
  `db:reset`. This mission is the first to deliberately WRITE to it (user
  approved synthetic-row verification, below), which makes the register
  tighter, not looser.
- **Synthetic test data only, `ZZZ Test …`-prefixed**, created and deleted by
  the same contract, with counts proven back to baseline. This is the repo's
  established practice (P3, D2, D3 verifications).
- **Never touch a real row.** Real family data is read-only for this mission.
- No commits by any agent (Fury commits at delivery). Never push.
- Scripts run outside Next.js need `import "dotenv/config"` and the repo's
  `node_modules` on the resolution path — see the baseline note below.

## Baseline (read-only, captured before any change)

```
pantry 469 · grocery 6 (0 checked) · recipe 144 · cookbook 5 · tag 19 · mealPlan 2
```

Every count must return to exactly this at mission end.

**Operational note for whoever runs a script against the database:** tsx runs
outside Next.js, so `.env` is NOT auto-loaded — the script needs
`import "dotenv/config"`, a direct `PrismaClient` + `PrismaPg` adapter (not
`@/lib/db`), and, if it lives outside the repo,
`NODE_PATH=/Users/brycemarsh/Documents/family-hub/node_modules`. Symptom of
getting this wrong is a misleading `ECONNREFUSED` (Prisma falling back to
localhost), not a missing-env error. `prisma/seed-recipes.ts` documents the
same trap.

## Gauntlet

1. `npx tsc --noEmit` → clean
2. `npx eslint .` → clean
3. `npm test` → all pass (33 at last count)
4. `npm run build` → succeeds
5. Every resulting file under the 350-line soft cap
6. **End-to-end put-away against synthetic data**, proving the refactored
   flow still works, with counts returned to baseline

## Assembled

- **Banner** ✅ done — brief delivered before contracts (see below).
- **Captain** — in twice: consulted *before* the build on a placement ruling
  (a structural decision belongs to the structure authority, not to a guess
  that gets blocked later), then gating after.
- **Stark + Vision** — always.
- **Strange** — **out.** This is a pure refactor with zero visual change;
  there is nothing for a design gate to review. Fury will smoke-check the
  Shopping page in the browser at delivery instead.

## Banner's brief — the seam (verified `file:line`)

**10 exported functions, all correctly opening with `getVerifiedSession()`.**
Three clusters, **no cross-cluster calls**:

| Cluster | Lines | Functions | Call sites |
|---|---|---|---|
| Basic CRUD | 46–181 | `addGroceryItem`, `toggleGroceryItem`, `setGroceryQuantity`, `editGroceryItem`, `deleteGroceryItem`, `clearCheckedGroceryItems` | `shopping/page.tsx`, `GroceryList.tsx` |
| Put-away | 183–433 | `classifyForPutAway`, `commitPutAway` + private `findExactMatch`, `refreshPutAwayViews` | `PutAwayButton.tsx`, `PutAwayReviewSheet.tsx` |
| Recipe→groceries | 435–624 | `classifyRecipeIngredients`, `addIngredientsToGroceries` | `AddToGroceriesSheet.tsx` |

**The four hazards Banner named:**
1. **`refreshGroceryViews()` (line 39) is shared** by CRUD (6 uses) and
   Recipe→groceries (1 use) — the one true cross-cluster dependency, and the
   reason Captain was consulted on placement.
2. **`commitPutAway`'s transaction (363–429)** is the only multi-table write.
   It must stay whole — splitting the pantry update from the grocery delete
   would break atomicity.
3. **Type exports** (`PutAwayClassification`, `PutAwayDecision`,
   `PutAwayNewItem`, `RecipeIngredientSuggestion`) must remain importable by
   their current consumers.
4. **`"use server"` is file-level** — every new file needs it, and (the
   constraint that forces the ruling) such a file may export *only* async
   Server Actions plus type-only exports.

No module-level mutable state, no re-exports.

## Captain's pre-build ruling — and why consulting first paid

**Fury's instinct was wrong.** I assumed the shared `refreshGroceryViews()`
needed extracting into a shared module. Captain ruled **option (c): no shared
module — each action file keeps its own private copy.**

His precedent check wasn't close: **all 7 action files already carry a private
`refresh*Views()` helper**, and **three are already byte-identical** — `pantry.ts:18`,
`irregularities.ts:21`, and `groceries.ts:183` all revalidate the same four
paths. The repo treats a revalidation list as a *per-file declaration of which
views this file's writes dirty* — like an import list — not as shared
vocabulary. There is also **zero precedent** for a non-`"use server"` module in
`src/app/actions/`, and zero `revalidatePath` calls anywhere outside it.

**The security argument that killed my option (a)** (a plain helper module
inside `actions/`): a directory where every file's exports are public POST
endpoints *except one* is a trap. A future editor adds `"use server"` to that
file out of habit and silently converts a cache helper into an unauthenticated
endpoint — and nothing about the directory's shape would flag it.

**Option (b)** (`src/lib/`) rejected too: a lib file whose entire content is app
route strings satisfies the letter of "lib imports from nothing above it" while
inverting its spirit, and would be the repo's first Next-cache side effect in
lib.

**The honest cost, in his words:** if a new page ever shows grocery counts, the
path must be added in more than one place. That drift risk already exists across
three files today and is inherent to the convention the codebase chose seven
files ago. If it ever proves wrong, the fix is a deliberate repo-wide change (a
route-paths vocabulary in `constants.ts`), not something invented piecemeal
inside this refactor.

## Contracts

### C1 — the split (DISPATCHED)
- **Boundaries:** may touch `groceries.ts`, new `groceriesPutAway.ts`, new
  `groceriesRecipes.ts`, and **import paths only** in `PutAwayButton.tsx`,
  `PutAwayReviewSheet.tsx`, `AddToGroceriesSheet.tsx`. Nothing else.
- **Pure refactor** — behavior byte-for-byte identical. Anything worth improving
  gets recorded as a NOTE, never changed; a refactor that also improves
  something is a refactor nobody can verify.
- **No database commands at all** — static gauntlet only. Live verification is
  deliberately a separate contract, so nothing writes to the family database
  until `tsc` and `build` are green.
- Names `groceriesPutAway.ts` / `groceriesRecipes.ts` confirmed by Captain
  against STRUCTURE.md's camelCase convention (`mealPlans.ts` is the neighbor).
  CRUD stays in `groceries.ts` so `shopping/page.tsx` and `GroceryList.tsx`
  never churn — and the importer split maps **1:1** onto the cluster split,
  which is itself evidence the seam is in the right place.

### C2 — STRUCTURE.md: record the revalidation convention (DISPATCHED, parallel)
- **Boundaries:** `STRUCTURE.md` only — disjoint from C1, which is why they run
  in parallel.
- Writes Captain's ruling into the Boundary rules so a future structure gate
  can't read checklist #4 ("no copy-pasted shared logic") against the
  deliberate duplication and file a false BLOCKER — the same defect class
  Mission 1 existed to kill. Also replaces the soft-cap parenthetical, which
  the split makes stale.

### C3 — end-to-end put-away against synthetic data (QUEUED)
Held until C1's static gauntlet is green. Writes `ZZZ Test` rows, runs a real
put-away through the refactored flow, deletes them, proves counts back to
baseline.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | Captain (advisory, pre-build) | ✅ ruling | — | overturned Fury's shared-module plan; 4 NOTEs |
| 1 | Captain (structure) | ✅ PASS | 0 | 2 — amendment wording + a trend watch |
| 1 | Vision (correctness) | 🚫 BLOCKED | 1 — false claim in C2's amendment | C1/C3/C4 all passed |
| 2 | Vision (final) | ✅ PASS | 0 | 2 cosmetic |

### Vision's pure-move proof — the mission's core claim

He sliced the pre-split file (`git show 934c8ca:…`) into its three segments and
diffed each against its destination:
- **Kept segment vs `groceries.ts`** — only change is the import block trimming.
  Every function body byte-identical.
- **Put-away segment vs `groceriesPutAway.ts`** — only additions are the header
  and imports. **`commitPutAway`'s `db.$transaction` still wraps the pantry
  writes and the grocery `deleteMany` as one all-or-nothing bundle**, unchanged
  to the byte.
- **Recipes segment vs `groceriesRecipes.ts`** — only additions are header,
  imports, and the sanctioned private `refreshGroceryViews()` copy, whose body
  is identical to the original.

Zero logic changes anywhere. Guards verified 7/7, 2/2, 2/2. No runtime
non-action exports from any `"use server"` file.

### The C2 → C5 → C6 wording loop, and the rule it produced

Three contracts to settle one sentence, because each fix introduced a subtler
version of the same defect:

- **C2** asserted *"Each `"use server"` action file declares its own private
  `refresh*Views()` helper."* False — `tags.ts` revalidates inline. Vision
  BLOCKED: as written, the constitution put an untouched, compliant file out of
  compliance the moment it landed.
- **C5** applied Captain's approved replacement, which accommodated `tags.ts`
  but asserted *"six files do."* **Stark flagged that this mission's own split
  had already made "six" wrong (eight now)** — and used the approved text
  verbatim anyway rather than silently adjusting a number outside his contract.
  Exactly right: a builder who "helpfully" corrects a figure buries the real
  problem under a fact that expires again later.
- **C6** removed every count. "Several files" — nothing left to rot.

**The rule this leaves behind, worth applying to every constitution:**
*state invariants, never census figures.* "A `"use server"` file must never
export a non-action helper" is true forever. "Six files do X" is true until
someone adds a seventh — and this mission added two while the sentence was in
flight. Fury's own error is recorded here honestly: I told Stark not to assert a
drifting number for `tags.ts`, then shipped text containing two others.

**Both contracts explicitly forbade "fixing" `tags.ts`** to match the rule — the
code was correct, only the rule was wrong. Verified untouched:
`git diff HEAD --stat -- src/app/actions/tags.ts` is empty.

## Delivery

- **Shipped:** `src/app/actions/groceries.ts` **624 → 172**, with
  `groceriesPutAway.ts` (**264**) and `groceriesRecipes.ts` (**223**) alongside
  it — all three under the 350 soft cap, the hard-cap risk retired. Three
  component import updates. `STRUCTURE.md` gained the revalidation convention
  and an accurate file-size note.
- **Verified:** `tsc`, `eslint`, **33/33 tests**, `build` — all green, re-run
  independently by Vision. Pure move proven by diff against `934c8ca`.
  **Put-away exercised live in the browser**: known item 2 → 3 in one row with
  no duplicate, new item created through the review sheet at "1 of 1", zero
  console errors.
- **Database at exact baseline**, confirmed twice (Fury and Vision, independently):
  `pantry 469 · grocery 6 · checkedGrocery 0 · recipe 144 · cookbook 5 · tag 19 · mealPlan 2`.
  Zero `ZZZ` rows survive. No real row was ever written.
- **Shipped check:** `git log origin/main..HEAD` → **`934c8ca` is local-only**,
  and Mission 2's work is uncommitted on top of it. **The family is still
  running pre-split code.** Awaiting the user's call on commit and push.
- **Deliberate leftovers:**
  1. **`recipes.ts` at 415 lines** — now the largest hand-written action file,
     past the soft cap. Captain's call: the next mission touching it should
     consider the same cluster split this one just proved out (sharing/print vs.
     CRUD).
  2. **Put-away edge cases unexercised** — merging into an existing item,
     canceling mid-review, a multi-item shop. The happy paths of both branches
     were proven; these weren't.
  3. **`DESIGN.md`'s "86×" and "~20 shipped controls"** are census figures of
     exactly the kind C6 purged from STRUCTURE.md. Still accurate today (Vision
     re-counted: still exactly 86), so no drift yet — but the same expiry risk,
     for whenever DESIGN.md is next touched.
  4. **`STRUCTURE.md:66`** — "(every export there is a public POST endpoint)" is
     loose: `export type` declarations are erased and aren't endpoints. The rule
     proper is fine; the parenthetical could trip a hyper-literal reader.
  5. Still open from Mission 1: `CLAUDE.md` says `src/app/login/` is the sign-in
     page, stale since the R4 route-group move.

### C1–C4 results

| Contract | Result |
|---|---|
| C1 — the split | ✅ DONE. 624 → **172 / 264 / 223**, all under the 350 soft cap. `tsc`, `eslint`, 33/33 tests, `build` all green. |
| C2 — STRUCTURE.md amendment | ✅ DONE (wording defect found later, see below) |
| C3 — synthetic fixtures | ✅ DONE. Fixture seeded: pantry 470 / grocery 8 / 2 checked, all `ZZZ Test`. |
| C4 — browser end-to-end | ✅ PASS. **Both paths proven in the running app.** |

**C4 — what the live run actually proved.** The safety gate held first: all six real
grocery items confirmed unchecked before anything was tapped (baseline
`checkedGrocery` was 0, so put-away physically could not touch a real row).
Then: tapping put-away opened the review sheet at **"1 of 1"** — the linked item
resolved automatically, only the genuinely new one asked for a human. Committing
took **`ZZZ Test Known Beans` 2 → 3 in a single row with no duplicate** (the whole
point of the `pantryItemId` link) and **created `ZZZ Test Brand New Thing`** as a
new pantry row in Other/Other. Zero console errors.

One incidental finding worth keeping: the review sheet's fuzzy suggestions
surfaced a **real** pantry item ("New box of 13-gallon kitchen trash bags" —
loose token overlap on "new") alongside the synthetic one. Not accepted, nothing
real touched. This is `matchItem`'s documented lenient-by-design behavior, and
it's useful evidence the matcher is genuinely wired up post-refactor rather than
silently returning empties.

**Cleanup verified.** All seven counts back to exact baseline:
`pantry 469 · grocery 6 · checkedGrocery 0 · recipe 144 · cookbook 5 · tag 19 · mealPlan 2`.

### Captain's structural verdict — PASS

Ruling followed exactly: the duplicated `refreshGroceryViews` at
`groceriesRecipes.ts:27` is **private**, with a comment stating the reason in his
own terms. He audited every `export` in both new files — the only runtime exports
are the four async actions; everything else is `export type`, erased at compile
time, creating **no endpoint**. All 10 exported actions across the three files
open with `getVerifiedSession()`. No cycles: the three grocery files import only
`next/cache` and `@/lib/*`, never each other.

**The design justifying itself:** the put-away file's revalidation list correctly
*differs* from the recipes copy — it adds `/kitchen/inventory` because
`commitPutAway` writes pantry rows, while the recipes copy omits it because it
only writes grocery rows. The "per-file view declaration" convention doing
exactly what it was adopted for, rather than being a euphemism for copy-paste.

**On the seam:** `findExactMatch` is used by both put-away actions and nothing
else — a genuine cohesion unit that *any* other split would have forced into an
export (creating an endpoint) or into `src/lib/` (a backward dependency).
Predicted ~180/~250/~200 vs. actual 172/264/223; no boundary he'd redraw.

### Captain's ruling on the `tags.ts` wording defect

**`tags.ts` is not a violation — it's a purer instance of the rule.** The
convention's real invariants are: (a) revalidation lives in the action file whose
writes dirty the routes, (b) it is never exported, (c) it never moves to
`src/lib/`. Inline calls satisfy all three maximally, and `tags.ts`'s paths vary
per action, so forcing a helper there would make the code worse to satisfy a
sentence. **The wording must describe the invariant, not mandate the helper
form.** Replacement text supplied; queued as a fix contract.

*(Correction to Fury's earlier note: `tags.ts` has **7** `revalidatePath` call
sites, not 8 — the earlier `grep -c` counted the import line.)*

### Open finding for the gates — Fury's own check of Captain's precedent

Fury independently verified the ruling's factual basis rather than taking it on
trust. **The ruling holds:** six private `refresh*Views()` helpers across six
action files (`pantry.ts:18`, `recipes.ts:25`, `cookbooks.ts:12`,
`groceries.ts:39` and `:183`, `mealPlans.ts:21`, `irregularities.ts:21`), with
`auth.ts` correctly having none — it redirects rather than revalidates.

**But C2's amendment text overstates it.** It says *"Each `"use server"` action
file declares its own private `refresh*Views()` helper."* `tags.ts` does not —
it has **8 `revalidatePath` calls inline**, no helper. So the amendment asserts
something the codebase contradicts, which is precisely the defect class
Mission 1 existed to eliminate. Handed to Vision/Captain to rule on wording;
the *substance* of the convention (revalidation is per-file and private, never
shared or exported) is unaffected — `tags.ts` is arguably an even purer case of
it.

## Handoff log

- 2026-08-14 — Mission opened from Mission 0/1 leftovers. Interrogate phase:
  user approved synthetic-row verification against the live database (the
  repo's own P3/D2/D3 practice) over static-only checks. Baseline captured.
  Banner briefed the file. Captain consulted on where the shared
  revalidation helper may legally live, since `"use server"` forbids
  exporting a plain helper and the constitution's literal reading gives it
  no home.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
