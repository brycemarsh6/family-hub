# Mission 1: Amend the constitutions

**Project:** family-hub
**Status:** DELIVERED — all 9 findings applied + 3 more caught by the gates; final gate PASS
**Started:** 2026-08-14 · **Updated:** 2026-08-14

## Brief

- **Goal:** apply the 9 calibration findings Captain and Strange raised in
  Mission 0, so both constitutions describe the codebase as it actually is.
  A constitution that misstates reality produces false BLOCKERs, and a gate
  that cries wolf gets ignored — this mission is what makes the other two
  gates trustworthy before any real feature work leans on them.
- **Done means:** every one of the 9 findings is resolved in the constitution
  text; every factual claim the amended text makes about the codebase is
  verifiable; no file outside the two `.md` constitutions is touched.
- **Out of scope:** changing any app code, including the ~20 compact controls
  and the login error color — this mission changes *the rules to match the
  app*, never the app to match the rules. Also out of scope: splitting
  `groceries.ts` (that's the other candidate mission).

## Danger register

- The dev database IS the live family database. Never `db:seed` / `db:reset`.
  This mission touches no code and no database at all — any command that
  writes anything is out of bounds.
- No commits (Fury commits at delivery, per the user's standing rules). Never
  push.

## Gauntlet

This is a documentation-only mission, so the app's usual gauntlet
(`tsc`/`eslint`/`npm test`/`npm run build`) proves nothing about the
deliverable. The honest gauntlet here is **that every factual claim in the
amended text is true**, plus proof nothing else moved:

1. `git status --short` → only `DESIGN.md` and `STRUCTURE.md` modified
   (plus this mission file). No `src/` file touched.
2. `grep -c "getVerifiedSession" src/app/actions/auth.ts` → **0**
3. `ls src/proxy.ts` → exists
4. `grep -n "STORES" src/lib/constants.ts` → defined at ~line 153
5. `ls src/lib/voice/` → `apply.ts`, `parse.ts`
6. `ls src/lib/dal.ts src/lib/session.ts src/lib/db.ts` → all exist
7. `grep -rn "min-h-11\|\bh-11\b" src/components src/app | wc -l` → non-zero
   (the two-tier tap rule describes real usage, not an aspiration)

## Assembled

- **Stark + Vision** — always.
- **Captain + Strange** — in, and not ceremonially: the deliverable *is* their
  rulebooks, and a mis-transcribed or overreaching rule is precisely the defect
  they exist to catch. Each reviews only his own constitution.
- **Banner** — out. The findings already carry their own `file:line` evidence
  from Mission 0; there is nothing left to research.

## User decisions (interrogate phase, answered 2026-08-14)

1. **Tap targets: two-tier.** 48px minimum for primary controls, inputs, and
   list rows; 44px floor for compact secondary controls (filter chips, icon
   buttons, sheet close). Chosen because it codifies what the app already does
   — `h-12` appears 86× for primary, `h-11` consistently for compact secondary
   — so it creates zero violations, and 44px is still Apple's HIG minimum. The
   rejected alternative (flat 48px) would have made ~20 shipped controls
   instant violations.
2. **Error color: warn for user mistakes, danger for destructive/urgent.**
   A wrong password is amber; red stays reserved for delete and expiry, which
   is what keeps red meaningful.

## Contracts

### C1 — STRUCTURE.md: apply Captain's 5 amendments
- **Status:** DISPATCHED
- **Boundaries:** may touch: `STRUCTURE.md` only · must not touch: any file in
  `src/`, `prisma/`, `DESIGN.md`, `CLAUDE.md`, or anything else
- **Verification:** gauntlet items 1–6 above
- **Evidence required:** each amendment quoted as written, plus the verifying
  command output for each factual claim
- **Done criteria:** all 5 findings resolved; no rule asserted that the
  codebase contradicts

The 5 amendments:
1. **The `auth.ts` exception (the important one).** The layout map says *every*
   exported action opens with `getVerifiedSession()`; `auth.ts`'s
   `login`/`logout` correctly don't — a login action cannot require the session
   it exists to create. Rewrite so the rule states the exception explicitly.
2. **`src/proxy.ts` is missing from the layout map** though the prose cites it
   twice. Add a row: what it is (Next 16 proxy — redirect-to-login UX and the
   narrow public prefixes), and what never belongs (a second middleware file,
   or treating it as the real auth gate).
3. **The `src/lib/` row's "no auth checks of their own" wrongly sweeps in the
   auth/db primitives** — `dal.ts` and `session.ts` *are* the auth machinery and
   `db.ts` is the database client. Reword so the intent survives (AI/external
   call wrappers don't self-auth; the wrapping action guards) without
   misdescribing the primitives.
4. **`STORES` (`src/lib/constants.ts:153`) is missing** from the
   one-source-of-truth list, which names only categories, locations, meal
   slots. Add it, so a second store list is unambiguously a BLOCKER.
5. **`src/lib/voice/` exists** (`parse.ts`, `apply.ts`) but the map describes
   `src/lib/` as flat. Allow domain subdirectories when a pipeline spans
   multiple files.

### C2 — DESIGN.md: apply Strange's 4 amendments + the 2 user decisions
- **Status:** DISPATCHED
- **Boundaries:** may touch: `DESIGN.md` only · must not touch: any file in
  `src/`, `STRUCTURE.md`, `CLAUDE.md`, or anything else
- **Verification:** gauntlet items 1 and 7 above
- **Evidence required:** each amendment quoted as written, plus the `h-11`
  grep output backing the two-tier rule
- **Done criteria:** all 4 findings resolved, both user decisions recorded as
  stated; no rule asserted that the shipped UI contradicts

The 4 amendments:
1. **Tap-target number conflict** — the hard rule says "Minimum 48px" while the
   checklist says "44–48px minimums." Replace both with the two-tier rule from
   the user decision above, stated once and referenced consistently, with the
   why (compact secondary controls are a real, deliberate tier).
2. **Errors have no token rule** — the States section is silent on which token
   an error uses. Record the decided norm: warn for user mistakes, danger for
   destructive/urgent.
3. **Nav-less surfaces aren't recorded** — "exactly one nav bar… at every size"
   doesn't note the deliberate exceptions (`/login`, the public `/share/*`
   layout, which has its own root layout and no chrome by design).
4. **The header brand mark isn't covered** — the house-and-heart PNG is a brand
   mark, not an icon-system member. Name it as an exception alongside the
   existing `<select>` one, so a future reviewer doesn't flag it as an
   emoji/Lucide violation.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | ✅ PASS | 0 | 2 — both false statements in STRUCTURE.md → fixed in C3 |
| 1 | Captain (C1) | ✅ PASS | 0 | 1 — proxy "prefix" wording → fixed in C3 |
| 1 | Strange (C2) | ✅ PASS | 0 | 2 — tap-tier gray zone (recorded, no amendment per his call) |
| 2 | Vision (C3) | 🚫 BLOCKED | 1 — false Boundary-rules sentence | C3's own two fixes verified TRUE |
| 3 | Vision (C4) | ✅ PASS | 0 | 2 — both trivial, recorded below |

### Pass 2's BLOCKER — and why it was found at all

Both of C3's fixes verified TRUE. The blocker came from somewhere else: Stark had
**deliberately declined** to touch a nearby sentence in the Boundary rules
section, judging it out of scope for his two named defects. Fury's C3 gate brief
asked Vision to specifically assess that non-change — on the reasoning that a
builder's *non*-changes are as unreviewed as his changes, and "I decided that
wasn't my problem" is exactly where a false statement survives a mission built
to kill false statements.

It was false. `STRUCTURE.md:34–36` said *"Public routes are added to proxy.ts
**only** as narrow prefixes"* — but `proxy.ts:28` registers `/login` and
`/api/voice` as **exact matches** in `PUBLIC_ROUTES`; only the two `/share/`
paths are prefixes. Worse, it now contradicted the layout-map row C3 had just
corrected three paragraphs above.

**Vision's failure scenario, which this repo has already lived once:** a builder
adds a future public endpoint (say `/api/chores`), reads the rule literally,
concludes a prefix is the only sanctioned form, and writes `"/api/chores/"` into
`PUBLIC_ROUTE_PREFIXES` — strictly broader exposure than the exact match needed,
and the same sloppy-prefix hole the R4/C8 proxy drills proved opens real
login-bypass paths. Meanwhile Captain, gating literally, would have to flag the
two existing `PUBLIC_ROUTES` entries as violations of a rule the codebase has
never followed.

**Stark's scope discipline was still correct behavior** — it just met the one
case where the neighbouring text was itself defective. The lesson worth keeping:
*ask the gate to audit the builder's deliberate non-changes, not only his diff.*

### What the gates actually did (not just their verdicts)

**Vision** reproduced *every* Stark evidence claim exactly — the `STORES` line number and both grep counts (56/86) — so no claim was inherited on trust. `src/` and `prisma/` confirmed completely clean: no code was changed to make a rule true. His sharpest verification: DESIGN.md's new "`/login` has no nav bar" claim is true but **non-obviously** — the `(app)` layout renders the nav unconditionally and the suppression lives at `HubNav.tsx:29`. Reading the layout alone would have suggested the rule was false.

**Captain** counted `getVerifiedSession()` guards against exports across all 8 action files (cookbooks 8/7, groceries 10/10, pantry 11/10…) to prove `auth.ts` is the *only* exception, and grepped the 5 AI wrappers to confirm they contain `getVerifiedSession` only in comments. On overreach: the guarded-action rule is now **tighter** — one named exception replaced an unstated false universal — and the new subdirectory permission re-binds subdirectories to the same purity/dependency rules.

**Strange** verified the tap-target counts are exact, not rounded: exactly 86 `h-12`, on inputs/save-submit/sheet rows; `h-11` on chips/icon buttons/close buttons, with **no `h-11` on any save, submit, or sign-in control**. Loophole question answered: the tier is **role-based, not style-based**.

### Open NOTE — the tap-tier gray zone (Strange's call: record, don't amend)

`PutAwayButton.tsx:56` and `AddLowItemsButton.tsx:30` are `min-h-11` **accent-filled, page-level** action buttons — visually primary-looking, functionally contextual bulk shortcuts. Defensible as secondary (Shopping's primary action is check-off; Inventory's is the row itself), but not "compact" in the enumerated sense. **Not a violation today.** The risk is bidirectional: a future reviewer applying "accent-filled = primary = 48px" would flag them, while one applying "not the marquee action = 44px is fine" could wave through a 44px Save button.

Strange's own resolution, verbatim in intent: *the tier is decided by role on the page, not by fill color — and accent-filled bulk actions like these two are the sanctioned edge of the 44px tier.* He judged no amendment needed and that recording it IS the fix; Fury respected the design gate's call rather than overriding it. **If this is ever contested in a real review, that clause is the amendment to add.**

## Handoff log

- 2026-08-14 — Mission opened from Mission 0's leftovers. Interrogate phase put
  the two genuinely ambiguous findings to the user (tap-target tiers, error
  color) rather than guessing; both answered and recorded above. C1 and C2
  dispatched in parallel — disjoint boundaries, one file each.
- 2026-08-14 — C1 + C2 both DONE. All three gates dispatched in one batch
  (cheaper than gating each file separately, and it let Vision audit both
  diffs against both contracts at once). **All three PASS, zero blockers.**
  Two gates independently flagged the same false "prefix" wording — that
  convergence is why it's being fixed rather than filed. C3 dispatched with
  both false-statement NOTEs batched into one contract.
- 2026-08-14 — C3 DONE; Vision pass 2 **BLOCKED** on a false Boundary-rules
  sentence Stark had deliberately left alone (see above). C4 dispatched with
  Vision's own proposed wording. C4 DONE, Vision pass 3 **PASS** after a full
  end-to-end read of STRUCTURE.md plus a DESIGN.md cross-check — asked for
  explicitly, because pass 2's blocker proved a defect can hide until a
  neighbouring fix exposes it. **Mission DELIVERED** within the 3-pass gate
  budget. Nothing committed (user's standing rule); shipped check clean.

## Delivery

- **Shipped:** both constitutions now describe the codebase that actually
  exists. **12 corrections total** — the 9 audit findings from Mission 0, plus
  3 more the gates caught during this mission (2 false statements found in
  gate pass 1, 1 BLOCKER in pass 2).
  - `STRUCTURE.md` — the `auth.ts` guard exception; a `src/proxy.ts` layout row;
    the `src/lib/` row no longer misdescribing `dal.ts`/`session.ts`/`db.ts`;
    `STORES` added to one-source-of-truth; domain subdirectories allowed;
    exact-match vs. prefix public routes stated correctly in **both** the
    layout row and the Boundary rules; the `(app)/` row naming the `/login`
    exception.
  - `DESIGN.md` — the two-tier tap-target rule (48px primary / 44px compact),
    replacing a rule that contradicted itself; the error-token norm (warn for
    user mistakes, danger for destructive); the nav-less surfaces (`/login`,
    `/share/*`); the header brand-mark exception.
- **Shipped check:** `git log origin/main..HEAD` → **empty**; nothing sits
  unpushed. `git status --porcelain src/ prisma/` → **empty**, independently
  confirmed by Vision on all three passes: **zero app code was changed.** The
  mission's central rule — fix the rules to match the code, never the reverse —
  held end to end.
- **Not committed.** Per the user's standing rule (commit only when asked), the
  working tree still holds `DESIGN.md`, `STRUCTURE.md`, `.avengers/`, and the
  `CLAUDE.md` pointer, all uncommitted and awaiting his decision.
- **Deliberate leftovers:**
  1. **Tap-tier gray zone** — `PutAwayButton.tsx:56` and
     `AddLowItemsButton.tsx:30` (see the NOTE above). Strange's call was record,
     don't amend; the one-clause fix is written down if a real review contests it.
  2. **`CLAUDE.md` says `src/app/login/` is the sign-in page** — stale since the
     R4 `(app)/` route-group move. Outside this mission's boundaries; STRUCTURE.md
     is the accurate document. Worth a CLAUDE.md housekeeping pass.
  3. **`STRUCTURE.md:99–101` says "bitten three times"** by unpushed work;
     CLAUDE.md's own tally is three push/deploy incidents plus a fourth
     "worked but never committed." The advisory is right either way — no
     scenario where 3 vs 4 changes behavior.
  4. **Still open from Mission 0:** split `src/app/actions/groceries.ts`
     (624 lines, 26 from the hard cap) at the classify/commit put-away seam.
