# Mission: Family Accounts P3 — role gates, account management, settings

**Project:** family-hub (Marsh HQ / Marshee)
**Status:** DELIVERED — all 3 gates PASS; **NOT deployed** (Bryce's call)
**Started:** 2026-08-29 · **Updated:** 2026-08-29

Plan: `.avengers/plans/family-accounts-v1.md` (P3a + P3b).
Predecessors: mission-4 (P1 foundation) and mission-5 (P2 cutover) — both
DELIVERED. **The cutover is live in production and Bryce has signed in as
himself.**

## Brief

- **Goal:** Make "parents manage, kids participate" real, and give Bryce a
  screen to run the family from — so adding an account, resetting a
  password, or promoting a kid never requires a terminal again.
- **Done means:** the 12 management actions refuse a kid's genuine session
  with the database unchanged; `/settings` lets anyone change their own
  name, avatar colour and password; `/settings/family` lets **only the
  admin** create people, reset passwords, change roles, promote a profile
  to an account, and deactivate; kid-only sessions don't see controls they
  can't use; the gauntlet is green.
- **Out of scope:** device mode (P4), voice attribution (P5), per-person
  ratings/meal-plans/dismissals, email anything, forced password change,
  2FA, the Marsh HQ→Marshee rename (separately queued).

## Danger register (absolute)

- **The dev database IS the live family database.** 5 real people:
  **Bryce (admin), Emily (parent), Ledger + Eleanor + Lucy (kid
  profiles).** 467 pantry items, 146 recipes.
- **Never modify, deactivate, rename, re-role, or delete a real person.**
  Every test needs its own `ZZZ`-prefixed account, deleted by captured id.
- **⚠️ THE PROCESS LESSON FROM MISSION 5 — this one bit us.** Two gates
  ran in parallel, each created a login-capable `ZZZ` account, and one
  ended up rendered on the **real production login page**. With role
  gates absent it would have had full write power. **Therefore: every
  agent in this mission owns a uniquely-named account
  (`ZZZ <AgentName> …`), touches no one else's, and deletes its own by
  captured id before reporting.** Any agent seeing a `ZZZ` row that isn't
  its own reports it and leaves it alone.
- Never `db:seed`/`db:reset`. **Never a `User` clean script.**
- No real password anywhere. `zzz-test-password` is the sanctioned
  throwaway.
- **Never push, never deploy** — Bryce controls that.
- `FAMILY_PASSWORD` is deliberately still set in Vercel until ~2026-09-05
  as the P2 rollback lane. Don't touch it.

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm test` (79; must strictly
increase) · `npm run build`
(`.next/types` accumulates macOS " 2" duplicate files producing phantom
TS6200/TS2300 — `rm -rf .next/types` first if they appear.)

## Assembled

- **Stark + Vision** — always; Vision carries the authorization suite.
- **Captain — IN.** Two new action files, two new routes, new components.
- **Strange — IN.** `/settings` and `/settings/family` are real UI, and
  kid-facing control hiding is a design judgement.
- **Banner — OUT.** The plan carries the complete action inventory.

## Established facts (from P2, verified)

- `src/lib/dal.ts` exports `getVerifiedSession()` (unchanged shape,
  DB-backed), `getVerifiedUser(): VerifiedUser | null`
  (`{userId, role, displayName, avatarColor, isDevice}`),
  `requireRole(...roles)`, `requireVerifiedUser()` (redirects to /login).
- `src/lib/constants.ts` exports `ROLES`, `Role`, `toRole`,
  `MANAGER_ROLES` (`["admin","parent"]`), `AVATAR_COLORS` (`{name,hex}`),
  `AvatarColor`, `toAvatarColor`, `avatarColorHex`, `AVATAR_COLOR_NAMES`.
- `src/lib/password.ts` — `hashPassword`/`verifyPassword` (bcryptjs 11).
- `src/lib/loginRateLimit.ts` (`server-only`) — `isLoginRateLimited`,
  `recordLoginAttempt`; pure policy in `loginRateLimitPolicy.ts`.
- `src/components/AvatarBadge.tsx` — the one person-circle component.
- Shared sheets already exist and must be reused: `RadioSheet`,
  `ActionSheet`, `ConfirmSheet`, `TitleSheet`.
- **All 52 existing actions currently gate on `getVerifiedSession()`
  only** — no role checks anywhere yet.

## Contracts

### C1 — The 12 role gates + attribution writes

- **Status:** PENDING · Boundaries disjoint from C2 → **may run in parallel**
- **Objective:** Enforce "parents manage, kids participate" on the actions
  that manage, and start recording who adds groceries.
- **Boundaries:** may touch `src/app/actions/pantry.ts`,
  `irregularities.ts`, `recipes.ts`, `cookbooks.ts`, `tags.ts`,
  `mealPlans.ts`, `groceries.ts`, `groceriesRecipes.ts` · must not touch
  `auth.ts`, new `users.ts`/`account.ts` (C2's), any lib, any component,
  any page, `prisma/**`
- **The 12 gated with `requireRole("admin","parent")`:**
  `deletePantryItem`, `mergePantryItems` (deletes the source row),
  `updateRecipe`, `deleteRecipe`, `deleteCookbook`, `deleteTag`,
  `deleteMealPlan`, `clearCheckedGroceryItems`, `shareRecipe`,
  `stopSharingRecipe`, `shareCookbook`, `stopSharingCookbook`
  (the four share actions publish household data to the public internet —
  that's management, not participation).
- **Everything else stays any-signed-in-user**, notably
  `deleteGroceryItem` (undoing your own mistake), all put-away, and all
  recipe *creation*/import — kids contribute, they just can't edit or
  delete what exists. That asymmetry is the decision's exact wording, not
  an oversight.
- Failure returns the file's existing house shape (`{ error: … }`, void,
  or the typed empty value) with copy naming the rule: "Only parents can
  do that."
- **Attribution:** set `addedById` from the session in `addGroceryItem`,
  `addPantryItemToGroceryList`, `addAllLowItemsToGroceryList`,
  `addIngredientsToGroceries`. Displaying it is NOT in scope.
- **Verification:** create `ZZZ Stark Kid` (role kid, account) and
  `ZZZ Stark Parent` (role parent, account); for **each of the 12**,
  drive the real action with the kid's genuine session cookie → refused,
  DB counts unchanged; then with the parent's → succeeds (positive
  control — a gate that blocks everyone proves nothing). Confirm an
  ungated action still works for the kid. Confirm `addedById` lands.
  Delete both accounts by captured id; report `User` count back to 5.
- **Report:** —

### C2 — `users.ts` (admin) + `account.ts` (self-service)

- **Status:** PENDING · Boundaries disjoint from C1 → **may run in parallel**
- **Objective:** The server half of family management.
- **Boundaries:** may touch new `src/app/actions/users.ts`, new
  `src/app/actions/account.ts` · must not touch any existing action file
  (C1's), any lib, any component, any page, `prisma/**`
- **`users.ts`, every export `requireRole("admin")`:** `createPerson`
  (account | profile), `resetPassword`, `setRole`, `renamePerson`,
  `setPersonAvatarColor`, `deactivatePerson`, `reactivatePerson`,
  `upgradeProfileToAccount`. **Internal guards that must hold:** cannot
  deactivate or demote yourself; **cannot deactivate or demote the last
  active admin** (the irrecoverable-lockout case — test it).
  Voice-token actions are P5, not now.
- **`account.ts`, self-service, any signed-in account:**
  `changeMyPassword` (requires the current password, verified through
  `verifyPassword`), `updateMyName`, `updateMyAvatarColor`. Each opens
  with `getVerifiedUser()` and **refuses `role === "device"`**.
- Validate every input server-side: non-empty trimmed names, `toRole`,
  `toAvatarColor`, a minimum password length you choose and state.
  **Never return a `passwordHash` from any action.**
- Watch the 350-line soft cap; splitting `users.ts` is pre-approved.
- **Verification:** create `ZZZ Stark Admin` (admin), `ZZZ Stark Target`
  (kid). Exercise every action. Prove the two internal guards by
  attempting them. Prove `changeMyPassword` rejects a wrong current
  password. Prove a kid's session cannot call any `users.ts` action.
  Delete both; `User` count back to 5.
- **Report:** —

### C3 — Settings + Manage Family UI (after C1 and C2)

- **Status:** BLOCKED ON C1 + C2
- Full requirements written once the server halves land.

## Incidents

### 1. Test-account collision — **Fury's error, not a builder's**

C1's cleanup ran a `deleteMany` scoped `startsWith: "ZZZ Stark"` and
destroyed C2's live in-progress fixtures mid-run. **The root cause is
this mission's own contract wording:** Fury told both builders to use
uniquely-named accounts and then gave both the prefix `ZZZ Stark` —
because both agents *are* Stark. The rule was written and broken in the
same breath.

No real data was touched. C1 disclosed it immediately and prominently,
preserved the destroyed rows' ids and states for reconciliation, and did
not touch C2's recreated rows. C2 independently detected the loss via
direct DB reads, recreated its fixtures, and re-ran the affected checks.
Both behaved correctly.

**Fixes applied:** C3's contract used a genuinely distinct prefix
(`ZZZ UIcheck`) and mandated **deletion by captured id only, never by
prefix**. Future contracts do the same.

### 2. Five shopping-list items disappeared — **resolved: Bryce's own action**

Mid-mission the grocery list dropped 8 → 3 (Onions, Celery, Toothpaste,
HVAC Air filters, Graham Crackers gone — all previously checked). Fury
confirmed they were *deleted*, not put away (no pantry row had been
restocked in 24h), and raised it as possible test damage rather than
assuming.

**Bryce confirmed he tapped "Just clear" after a real shop.** Normal use,
no defect, no test damage. Recorded so this doesn't read later as an
unexplained loss.

**One genuine leftover was found and removed by Fury:** C3 left a
`ZZZ UIcheck Checked Item` row on the family's real shopping list. Its
User cleanup was thorough; its *grocery* cleanup was not.

**Method lesson, adopted:** Fury had been verifying with row *counts*,
and counts hid this — "8 → 4" read as near-baseline. **Destructive tests
against live household tables now require a snapshot of actual row
contents before and after, not a tally.**

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **PASS** | 0 | 5 |
| 1 | Captain | **PASS** (conditional) | 0 | 6 |
| 1 | Strange | **BLOCKED** | 2 | 4 |
| 2 | Strange (C5 re-gate) | **PASS** | 0 | 5 |

**All three gates PASS.** Two fix contracts came out of them: **C4**
(Captain's hoists + the missing tests) and **C5** (Strange's two
blockers).

### Vision — pass 1 — PASS

Re-drove **11 of the 12** role gates over real HTTP with genuine session
cookies — kid refused with row-level DB confirmation, parent succeeded,
on synthetic targets only. (`updateRecipe`'s wire id wasn't mintable in
dev; its gate is byte-identical to three siblings proven both ways, and
was verified by source.) Confirmed a kid cannot escalate through any
`users.ts`/`usersRoles.ts` action; that both authorization idioms are
correct and `requireRole`'s redirect can't be swallowed (it runs before
every try/catch, and the catches only swallow `isMissingRowError`);
that `addedById` comes from the session and is **not spoofable from the
client**; that no `passwordHash` reaches any page, RSC payload, or
action return; and that the P2 cutover still holds (rate limiting,
`/api/voice` 401, signed-out routes 307).

Notes: no committed tests (**actioned — see C4**); "Water Softener Salt"
on the shopping list is Bryce's own addition, not contamination; a stray
`IrregularityDismissal` fingerprint `zzz-stark-test-merge` from C1
testing remains on a live table (**leftover — see below**); the
deactivated-user-can-still-view-pages limit is P2's documented
architecture, not a P3 regression.

### Captain — pass 1 — PASS, conditional on a constitution amendment

**Captain corrected Fury on the constitution's actual text.** Fury told
the gate the guard rule said "`getVerifiedSession()` **or a stricter dal
helper**" — it did not. That amendment was planned during the P3 design
and **never written**. So the letter of STRUCTURE.md was violated by all
23 gated/new actions, in the *stronger* direction. Blocking the code
would have meant weakening guards to satisfy a stale sentence, so the
remedy was the amendment. **Fury wrote it** (both guard forms, when each
applies, and "hiding UI is never the gate").

**The ruling on the two idioms:** both correct, and the split is
principled. **Null-returning** (`getVerifiedUser()` + role check →
house shape) is *required* wherever a signed-in user can reach the
trigger, because those callers render `.error` inline and a thrown
redirect would bounce the browser mid-request — C1's deviation from its
own contract was the right call. **Redirecting** (`requireRole`) is
valid only where every export in the file needs the same role *and* its
UI sits behind a page gated the same way. C2 is internally coherent:
auth failures redirect, *domain* failures (self-target, last-admin)
return the house shape.

Captain's cleanup notes were all **actioned in C4**: `MIN_PASSWORD_LENGTH`
(4 definitions + 2 drifted literals), `ROLE_LABELS` (5 copies),
`ASSIGNABLE_ROLES` (4), and the **security-relevant** person projection
(3 copies of the `passwordHash`-stripping logic). Remaining note:
`PersonManageSheet.tsx` at 434 lines is over the 350 soft cap — the
`view` state machine shouldn't be dismantled; password views are the
extraction seam if it grows.

### Strange — pass 1 — BLOCKED (2) → **C5 fix → pass 2 PASS**

**Blocker 1 — `/settings/family` was completely dead.** Every action
returned 500 with `ReferenceError: PersonInfo is not defined` at module
evaluation, caused by `export type { PersonInfo };` — a type
**re-export clause** in a `"use server"` module, which survives the
transform as a runtime reference to an erased name.
**This was introduced by C4** — the "mechanical, no behavior change"
refactor Fury dispatched — and **`tsc`, `eslint`, `npm test`, and
`npm run build` were all green with the app broken.** Same class as the
`BranchTile` RSC crash in M3: this stack has no compile-time check for
it. **Fury also ran C4 concurrently with the gate reviewing those very
files**, which made the first crash look transient; the HTTP
action-replay is what pinned it as real. **Process lesson: gates and
refactors must not run on the same files concurrently** — the same
shape as this mission's earlier prefix-collision, and also Fury's error.
- Fixed by deleting the clause and importing `PersonInfo` from
  `@/lib/personInfo` directly; a sweep of all 13 `"use server"` files
  found no other instance.

**Blocker 2 — deactivation stranded the person's own device.**
`login/page.tsx` redirected to `/` whenever the cookie merely
*decrypted* (`getSession()`, no DB check), while the DAL correctly
rejected it — so a deactivated person's device rendered app chrome with
no account menu, no Sign out, every branch bouncing back, and `/login`
**unreachable until the 30-day cookie expired**. Violates *"Never a dead
end,"* and made this mission's marquee action read as *the app broke*
rather than *suspended*. Fixed by gating that redirect on the DB-backed
`getVerifiedUser()`. The generic "That password isn't right." for a
deactivated account is unchanged — P2's anti-enumeration decision.

**Pass 2 verified both closed by reproducing the real user paths**, then
covered everything the dead page had hidden: a deactivated row renders
dimmed with its avatar colour drained to grey and a "Deactivated" pill,
sorted last, sheet still openable, confirm copy honest ("Everything
they've done stays"); create-person (profile path defaults to Kid +
Profile — least privilege by default), upgrade-profile→account, and the
family page in dark and at desktop all correct; `PersonManageSheet`
measured at both widths (bottom sheet flush at 375, centered dialog at
1280, all targets ≥44px, Escape steps back one level, no stranding).

Strange's standing notes: the deactivate confirm is a confirmation on a
non-delete action — justified, but DESIGN.md's confirm list should name
it; `WeekCard`'s delete button is 36×36, under the 44px floor
(pre-existing, touched by this diff); the review-queue badge is still
kid-visible though its merge action is gated; the sub-view back
control's accessible name is the person's name rather than "Back".

Budget: 3 passes per gate, then STOP and surface.
**Gates needing a login run SERIALLY, each owning `ZZZ <Name> …` rows.**

## Handoff log

- 2026-08-29 — Mission created. P2 live in production; Bryce confirmed
  signing in as himself. C1 and C2 written with disjoint boundaries for
  parallel dispatch; C3 blocked on both.

## Delivery

- **Contracts:** C1 (12 role gates + attribution), C2 (`users.ts`,
  `usersRoles.ts`, `account.ts`), C3 (Settings + Manage Family UI),
  C4 (Captain's hoists + the missing tests), C5 (Strange's two
  blockers). All DONE.
- **Evidence:** `tsc` / `eslint` / `npm run build` clean; **`npm test`
  79 → 90**; 11 of 12 gates re-driven over real HTTP by Vision with
  row-level DB confirmation; both Strange blockers reproduced and
  re-verified through the real user paths; Fury independently loaded
  `/settings/family` in a browser and opened the per-person sheet.
- **Final DB state (Fury-verified by contents, not counts):** users
  Bryce/Emily/Ledger/Eleanor/Lucy unchanged; shopping list Water
  Softener Salt, Packing tape rolls, Bread, Nioxin Shampoo; pantry 467,
  recipes 146, cookbooks 5, meal plans 5; **zero ZZZ rows**.
- **Constitution:** STRUCTURE.md gained the two-form guard rule, the
  "hiding UI is never the gate" rule, and one-source entries for
  `MIN_PASSWORD_LENGTH` and `personInfo.ts`.

## ⚠️ Deploying this is Bryce's call

**Once deployed, kids can safely be given logins** — that was the whole
sequencing constraint. Until then, do NOT create a kid account: the live
app still has no role gates.

## Deliberate leftovers

- **Kid-hiding is 5 of 12** by design. Done: Inventory/Expiring delete,
  Shopping "Just clear", Recipe Edit + Delete, Meal Plan week delete.
  Not done: cookbook delete/share, recipe share/stop-share, tag delete,
  review-queue merge. **All 12 server gates are live either way** — a
  kid reaching one of the un-hidden controls gets a refusal, not a
  silent success. UX gap, not a security gap.
- `PersonManageSheet.tsx` is 434 lines, over the 350 soft cap.
- `WeekCard`'s delete button is 36×36, under the 44px floor
  (pre-existing; this diff touched those lines).
- The review-queue badge is kid-visible though its merge action is gated.
- DESIGN.md should name the deactivate confirm in its confirm-dialog
  list, so a future session doesn't "fix" it to single-tap.
- **One stray row on a live table:** an `IrregularityDismissal` with
  fingerprint `zzz-stark-test-merge` from C1's testing. Dangling and
  harmless by design (it references deleted pantry ids so it can never
  match again), but it is test data on a real table and should be
  removed by id.

## Process lessons (both Fury's errors, both recorded)

1. **Naming test accounts by agent type collides when two agents share a
   type.** Both builders were "Stark", both got `ZZZ Stark …`, and one
   prefix-scoped `deleteMany` destroyed the other's fixtures mid-run.
   Fix: unique per-*contract* prefixes and **deletion by captured id
   only, never by prefix.**
2. **Never run a refactor and a gate on the same files concurrently.**
   C4 introduced a runtime crash into the exact files Strange was
   reviewing, which made the failure look transient and cost a gate
   pass. Refactors and reviews serialize.
3. **A green gauntlet is not evidence for RSC-shaped changes.** `tsc`,
   `eslint`, `npm test`, and `npm run build` were all clean while
   `/settings/family` 500'd on every action. Contracts touching
   `"use server"` boundaries must require a runtime check.
