# Mission: Family Accounts P2 — the auth cutover

**Project:** family-hub (Marsh HQ / Marshee)
**Status:** DELIVERED — all 3 gates PASS; **NOT deployed** (Bryce's call)
**Started:** 2026-08-28 · **Updated:** 2026-08-28

Plan: `.avengers/plans/family-accounts-v1.md` (the P2 sections).
Predecessor: `.avengers/missions/mission-4-accounts-p1-foundation.md`
(DELIVERED — both gates PASS, real family bootstrapped).

## Brief

- **Goal:** Replace the single shared family password with per-person
  sign-in. Session payload v2 (with a version claim that cleanly
  invalidates every old JWT), a DB-verifying DAL, DB-backed login rate
  limiting, a tap-your-name login page, and header identity.
- **Done means:** Bryce and Emily can each sign in with their own
  password and see their own name/avatar in the header; the old shared
  `FAMILY_PASSWORD` no longer signs anyone in; every pre-cutover cookie
  is rejected; the adversarial suite passes (forged/tampered/expired/v1/
  deactivated JWTs all refused against a curl'd Server Action with
  database counts unchanged); the 6th wrong password inside 15 minutes
  is refused **before bcrypt runs**; the gauntlet is green.
- **Out of scope:** role gates on existing actions (P3a — kids can't
  sign in yet, so there is **no exposure window**), Settings and Manage
  Family pages (P3b), device mode (P4), voice attribution (P5). No
  existing Server Action's guard call changes in this phase.

## The real-world stakes (why this mission is careful)

This is the one change that can lock the whole family out of an app
they use daily. Three protections, all mandatory:

1. **Nothing deploys from this mission.** Everything is built and
   verified locally. Bryce pushes when he's ready and has told Emily.
2. **`FAMILY_PASSWORD` stays set in Vercel for ~7 days after the
   cutover deploy** — it stops working in code, but keeping the env var
   means an instant Vercel rollback restores the previous build's login.
   Removing it is a separate later step.
3. **Real accounts already exist** (verified: Bryce/admin/account,
   Emily/parent/account, Ledger+Eleanor+Lucy/kid/profile) — so there is
   somewhere to sign in the moment the cutover lands.

## Danger register (absolute)

- **The dev database IS the live family database** (467 pantry, 146
  recipes, 5 real people). Never `db:seed`/`db:reset`. **Never a `User`
  clean script** — only by-id deletion of ZZZ-prefixed rows a
  verification created.
- **Never modify or delete the 5 real `User` rows.** Adversarial tests
  needing a deactivated or kid-role account must create their own ZZZ
  user, never repurpose a family member. If a test must touch a real
  row, it doesn't run.
- **No real password may appear in any report, file, log, or commit.**
  `zzz-test-password` is the sanctioned throwaway.
- **Never push, never deploy.** Bryce controls the cutover.
- `prisma generate` + dev-server restart after any schema change (none
  expected in P2 — the schema is already in place from P1).

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm test` (67 currently; must
strictly increase) · `npm run build`

## Assembled

- **Stark + Vision** — always; Vision carries the adversarial suite,
  which is the heart of this mission.
- **Strange — IN.** The login page is rewritten and the header gains
  identity UI. First user-visible change since the accounts work began.
- **Captain — IN.** New modules (`loginRateLimit.ts`, `UserMenu.tsx`,
  `AvatarBadge.tsx`), a retired component (`SignOutButton.tsx`), and a
  changed auth-core boundary.
- **Banner — OUT.** P1's mission file plus the plan's line-cited
  inventory cover the surface.

## Established facts (verified — do not re-derive)

- `SessionPayload = { userId: string; expiresAt: string }`;
  `HOUSEHOLD_USER_ID = "household"` written at session.ts:91, imported
  nowhere; `createSession()` takes **no arguments**; `COOKIE_NAME` is
  module-private while `src/proxy.ts:69` hardcodes `"session"`
  separately — two sources of truth to collapse.
- **All 52 guarded Server Actions call `getVerifiedSession()` as a bare
  boolean and never read its contents.** Only 6 lines read `userId`:
  `dal.ts:34,38,51,52`, `proxy.ts:71`, `login/page.tsx:20`. The payload
  shape can change without touching a single action.
- `verifySession()` is dead code, zero callers.
- `isCorrectPassword` (session.ts:47) compares SHA-256 digests of the
  plaintext `FAMILY_PASSWORD` with `timingSafeEqual`.
- Login page: one password field, `useActionState`, `LoginState =
  { error?: string }`.
- `src/lib/password.ts` (P1) exports `hashPassword`/`verifyPassword`,
  bcryptjs cost 11, no `server-only`.
- `constants.ts` (P1) exports `ROLES`/`Role`/`toRole`/`MANAGER_ROLES`/
  `AVATAR_COLORS` (`{name, hex}`)/`AvatarColor`/`toAvatarColor`/
  `avatarColorHex`/`AVATAR_COLOR_NAMES`.
- `LoginAttempt` table exists, empty, unwritten.

## Contracts

### C1 — Auth core: session v2, DAL, rate limiting, login action

- **Status:** PENDING
- **Objective:** Replace the shared-password auth mechanism with
  per-person credentials, a versioned session payload, a DB-verifying
  DAL, and DB-backed rate limiting — server-side only, no UI.
- **Boundaries:**
  - may touch: `src/lib/session.ts`, `src/lib/dal.ts`, `src/proxy.ts`
    (cookie-name import ONLY), `src/app/actions/auth.ts`, new
    `src/lib/loginRateLimit.ts` + `src/lib/loginRateLimit.test.ts`,
    `.env.example`
  - must not touch: every other `src/app/actions/*.ts`, all pages and
    components (C2's territory), `prisma/**`, `src/lib/password.ts`,
    `src/lib/constants.ts`
- **Requirements:**
  1. **session.ts:** `SESSION_VERSION = 2`; `SessionPayload = { v,
     userId, role, expiresAt }`; `decrypt()` returns null unless
     `v === SESSION_VERSION` (in addition to signature/expiry) — this
     is what invalidates every old household JWT with **zero DB reads**.
     `createSession(user: { id: string; role: string })`. Session length
     30 days for people, **365 days for `role: "device"`** (P4 uses it;
     harmless now). Export `COOKIE_NAME`. Delete `HOUSEHOLD_USER_ID`,
     `isCorrectPassword`, and every `FAMILY_PASSWORD` read.
  2. **proxy.ts:** import `COOKIE_NAME` from session.ts instead of the
     hardcoded `"session"`. **It must stay DB-free** — it runs on every
     request including prefetches. No other change.
  3. **dal.ts:** a `cache()`-wrapped `loadSessionUser()` doing ONE
     indexed PK lookup, returning null when the cookie is absent/
     invalid/v1, the user row is missing, or `deactivatedAt` is set.
     `getVerifiedSession()` **keeps its exact signature and return
     shape** (`Session | null`, `{isAuth: true, userId}`) so all 52
     call sites compile untouched — but is now backed by that lookup.
     Add `getVerifiedUser(): Promise<VerifiedUser | null>` (userId,
     role, displayName, avatarColor, isDevice), `requireRole(...roles)`,
     and `requireVerifiedUser()` (redirects to /login) replacing the
     dead `verifySession`. **Do not add role gates to any action** —
     that is P3a.
  4. **loginRateLimit.ts:** DB-backed via `LoginAttempt` (in-memory
     dies per serverless invocation). Sliding 15-minute window; **5
     failures per user**, **20 per IP** (first hop of
     `x-forwarded-for`, empty-string fallback locally). Exports a check
     and a record function. Opportunistic self-prune of rows older than
     24h on success. Unit-test the window/threshold logic with injected
     timestamps (pure function over attempt rows — design it so the
     policy is testable without a database).
  5. **auth.ts `login`:** now takes `userId` + `password` from the
     form. Order, exactly: parse → look up the user (must exist, be
     active, and have a `passwordHash`) → **rate-limit check BEFORE
     `verifyPassword`** (a locked attempt must never reach bcrypt) →
     verify → record the attempt (success or failure) → on success
     `createSession(user)` and redirect. **Unknown/profile/deactivated
     userIds still record an IP-scoped failure.** Error copy: `"That
     password isn't right."` — **identical** for a wrong password and
     for a forged/unknown userId, so probing teaches nothing. Rate-limit
     copy: `"Too many tries. Wait about 15 minutes, or ask Dad to reset
     your password."` `logout` unchanged.
  6. **.env.example:** `FAMILY_PASSWORD` removed with a comment
     explaining accounts replaced it and pointing at
     `npm run db:bootstrap-users`.
- **Verification (local only; never deploy):**
  - **Positive control FIRST:** a real family member's correct password
    signs in and sets a v2 cookie. Ask Fury for a throwaway ZZZ account
    to test with rather than using a real password — **create
    `ZZZ Test Account` (role kid, password `zzz-test-password`) as the
    test subject and delete it afterward.**
  - Attacks, each with DB counts before/after: no cookie; a **v1
    household-shaped JWT signed with the real secret** (the cutover's
    key case); tampered payload; wrong-secret signature; expired JWT; a
    cookie for a user row that has since been deactivated → all refused
    against a curl'd Server Action, database untouched.
  - Rate limiting: 5 wrong passwords, then confirm the **6th is refused
    without bcrypt running** (prove it — e.g. timing or an
    instrumented counter, and say which); confirm `LoginAttempt` rows
    are written; confirm a different user is unaffected by another
    user's lockout.
  - Confirm `FAMILY_PASSWORD` is read **nowhere** in `src/` (grep).
  - Gauntlet.
- **Evidence required:** positive control transcript; each attack's
  status + DB counts; proof the 6th attempt skipped bcrypt; the grep
  showing no `FAMILY_PASSWORD` reads; gauntlet output; confirmation the
  5 real users were never modified (read them back: names, roles,
  `canSignIn` booleans, `deactivatedAt` all unchanged — never print
  hashes)
- **Done criteria:** Fury reads session.ts/dal.ts/auth.ts and confirms
  the gate order, the v-check, that proxy stays DB-free, and that no
  action file changed
- **Report:** —

### C2 — Login page + header identity (dispatched after C1 passes)

- **Status:** BLOCKED ON C1
- **Objective:** Tap-your-name sign-in and a header that shows who you
  are.
- **Boundaries:** may touch `src/app/(app)/login/page.tsx`,
  `src/app/(app)/login/LoginForm.tsx`, `src/app/(app)/layout.tsx`, new
  `src/components/UserMenu.tsx`, new `src/components/AvatarBadge.tsx`,
  delete `src/components/SignOutButton.tsx`; must not touch the auth
  core (C1's output), any action other than through existing imports,
  or any Kitchen/Recipes/Meal-Plan surface.
- Full requirements written after C1 reports.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **BLOCKED** (data hygiene only) | 1 | 4 |
| 1 | Strange | **BLOCKED** | 1 | 3 |
| 2 | Strange (C3 re-gate) | **PASS** | 0 | 0 |
| 1 | Captain | **BLOCKED** | 1 | 4 |
| 2 | Captain (C4 re-gate) | **PASS** | 0 | 1 |
| 2 | Vision (post-split re-gate) | **PASS** | 0 | 2 |

**All three gates PASS.** Two fix contracts were dispatched from gate
blockers: **C3** (the UserMenu portal) and **C4** (the rate-limiter
split).

### Captain — pass 1 — BLOCKED → **C4 fix → pass 2 PASS**

**The blocker was a real hazard, not a paperwork violation.**
`src/lib/loginRateLimit.ts` skipped `server-only` while importing `db`
(which reads `DATABASE_URL` at module load), violating P1's own boundary
rule. The concrete danger: **`loginRateLimit.test.ts` imported it, so
`npm test` constructed a `PrismaClient` pointed at the live family
database.** Prisma connects lazily so nothing queried today — but one
future test touching those exports would have reached real household
data straight from the test runner, with nothing in the way.

Captain explicitly **recommended against amending the rule** to permit
the exception, reasoning that "impure lib modules may skip the guard
when only actions call them" is a predicate you cannot verify by reading
the file, and that it leaves the test-runner→live-DB edge in place. The
rule was right; the code moved.

**C4 fix:** `src/lib/loginRateLimitPolicy.ts` (new) holds the pure half
with **zero imports**; `loginRateLimit.ts` keeps the DB wrappers and
gains `import "server-only"` at line 1; the test was renamed
`loginRateLimitPolicy.test.ts` and imports only the policy, removing
`db.ts` from the test import graph entirely. `auth.ts` unchanged.
Pass 2 read all three files rather than grepping and confirmed the split
is drawn correctly — including that `PRUNE_AGE_MS` correctly *stays* in
the guarded half (it parameterizes a DB write; moving it would be false
symmetry) and that the wrapper→policy edge is one-way, so a cycle is
impossible by construction.

Captain's other pass-1 findings, all resolved or accepted: the DAL's new
per-request read is **not** the CLAUDE.md re-fetch anti-pattern (one
indexed PK lookup, `cache()`-deduped across layout and page, and auth
must precede data — now written into STRUCTURE.md as the one sanctioned
sequential read); the single `createPortal` among ~15 sheets is a
well-documented positional exception and the others should **not**
follow (rule of three — extract a wrapper only if a second header-hosted
sheet appears); `db.ts`'s own guard-free status is sanctioned and now
documented. Growth trend recorded: `dal.ts` 54→131, `session.ts`
119→132, `auth.ts` 46→94 — all far under the 350 soft cap.

### Vision — pass 2 (post-split re-gate) — PASS

Re-gated because **C4 refactored the rate limiter after Vision's pass-1
verdict** — its findings were about code that had since moved. All six
behaviors re-verified against the refactored code, driving the real
`login` Server Action over HTTP (Vision validated the `Next-Action` wire
encoding against React's own `decodeReply` before trusting any negative
result — a methodological improvement over pass 1): 5 failures then
refusal; the refusal skipping bcrypt (~50ms vs ~175ms); a different
account unaffected while one is locked; the window genuinely sliding
(backdated failures stop counting); refusals not recorded, so a
lockout can't be extended for free; the per-IP cap tripping at 20 and
scoped to that IP. Positive control first, as always. `server-only`
confirmed real — importing the wrapper from plain `tsx` throws.

Vision's pass-1 blocker exit condition independently re-verified: `User`
count 5, and the **rendered** login page (not just the database)
offering exactly Bryce and Emily.

Vision's 2 notes: **2 orphaned `LoginAttempt` rows** referencing a
deleted test account survived earlier cleanup — Vision correctly refused
to delete rows that weren't its own; **Fury cleared them**, and the
table is now empty. And a restatement of the accepted design tradeoff:
5 wrong guesses at a person's chip locks *that person* for 15 minutes,
with "ask Dad to reset your password" as the intended recovery.

Budget: 3 passes per gate, then STOP and surface.

### Strange — pass 1 — BLOCKED → **C3 fix → pass 2 PASS**

**The blocker, and it's a subtle one Fury missed while looking straight
at it.** `src/app/(app)/layout.tsx:75`'s header carries `backdrop-blur`.
Per CSS spec an element with `backdrop-filter` becomes the **containing
block for `position: fixed` descendants** — so `UserMenu`'s
`fixed inset-0` overlay resolved to the header's 72px strip, not the
viewport. Measured: overlay 375×72 at (0,0), dialog card at **y = −137**.
On a phone the identity block and close button were entirely off-screen;
the backdrop dimmed only the header; outside-click was dead everywhere
but the header. Fury had screenshotted this menu, seen its content, and
read it as working — the content visible was the *bottom* of a card
hanging off the top of the screen.

**C3 fix (UserMenu.tsx only):** overlay rendered via
`createPortal(overlay, document.body)`, gated by a mounted flag using
`useSyncExternalStore` (the naive `useState`+`useEffect` fails this
repo's own `react-hooks/set-state-in-effect` rule; this matches the
`useLastStore`/`useToday` precedent). The header's `backdrop-blur` was
deliberately NOT removed — that would change every page's header to fix
one component. A comment records the cause and that this is the only
sheet under such an ancestor, so a future session doesn't "clean up" the
portal back into the bug.

**Pass 2 re-measured rather than trusting:** mobile overlay
`{0,0,375,812}` with parent `BODY` (portal confirmed in the live DOM),
dialog `{0,603,375,209}` bottom-flush; desktop dialog centered at
exactly (720,450). Backdrop now dims the whole page; outside-click,
Escape, ×, and Sign out all work; both themes correct. **No findings.**

Strange's pass-1 notes, all non-blocking: kids' absence from the login
list is unexplained (an optional one-liner would close the question —
but nothing a parent remembers has gone missing, since kids never
appeared on the old login either); amber and green avatars sit below
WCAG small-text contrast for white initials (legible at 40px bold, badge
is `aria-hidden` with the name always adjacent — revisit only if P3b
ever makes the initial a sole identifier); the "Who's signing in?"
subtitle persists into the password step, where it's already answered.

### Vision — pass 1 — BLOCKED on data hygiene; **code held under every attack**

**The code verdict was clean.** Positive control first (valid v2 cookie →
a real row written), then every attack against a real Server Action with
before/after counts proving zero writes: no cookie; **a v1
household-shaped JWT signed with the REAL current secret** — the exact
cookie every family member holds today, and it dies; tampered payload;
wrong-secret v2; expired v2; **a valid v2 cookie for a nonexistent user**
and **one whose user was then deactivated** — both reached the proxy
(which is DB-free by design) and were stopped by the DAL alone, proving
the two layers are independent rather than merely redundant. Rate
limiting: 5 failures then refusal, the 6th measurably skipping bcrypt
(~23ms vs ~99ms), a different account unaffected, the window genuinely
sliding (16-min-old failures stop counting), per-IP cap tripping at 20,
and no irrecoverable-lockout path. All four failure modes (wrong
password / forged userId / passwordless profile / deactivated) return
byte-identical responses. `/api/voice` and `/api/alexa` unaffected. **DB
outage fails closed**, never open. Boundary audit clean — no
`src/app/actions/*.ts` but `auth.ts` changed, so P3a stays out of scope.

**The blocker was live test data, not code:** during Vision's run the
`User` table held a **login-capable `ZZZ` account rendered on the real
login page** — churn from the sibling gates running concurrently, each
creating its own throwaway sign-in. Vision correctly refused to delete
another agent's in-flight rows and named the exact exit condition
instead.

**Why this finding matters beyond the fix:** with P3a's role gates not
yet in place, a kid-role test session has full write power over all 52
actions. Had that row survived to the cutover deploy, the family's login
page would have offered a `ZZZ` chip signable with a password written in
plain text in this repo's own mission files.

**Process lesson recorded:** running Vision and Strange in parallel, each
needing a login-capable account, is what produced the window.
**Gates that must create credentialed test data should run serially, or
own disjoint, self-identifying accounts.**

**Exit condition met and triple-confirmed:** Fury removed all `ZZZ` rows
and the test `LoginAttempt` telemetry; a direct read shows exactly the 5
real family rows; and Strange's independent pass-2 cleanup check
confirmed `User` count 5 with the rendered login page offering **only
Bryce and Emily**.

Vision's notes, all accepted-by-design: a bcrypt timing oracle
distinguishes "real active account" (the account list is deliberately
public on the login page, so it reveals nothing new); the per-IP cap is
shared across the household's single public IP (per-user is the real
bound); `LoginAttempt` self-prunes only on success (correctness
unaffected — the window filter is indexed).

## Handoff log

- 2026-08-28 — Mission created. P1 delivered and the real family
  bootstrapped (Bryce/admin, Emily/parent, 3 kid profiles — verified by
  direct read). Assembled Stark + Vision + Strange + Captain. C1
  written; C2 blocked on C1. Next: dispatch C1.

## Delivery

- **Contracts:** C1 (auth core), C2 (login + header UI), C3 (UserMenu
  portal — from Strange's blocker), C4 (rate-limiter split — from
  Captain's blocker). All DONE.
- **Evidence:** gauntlet `tsc`/`eslint`/`npm test` **79/79**/`build`
  clean, re-run independently by Vision and Fury; the full adversarial
  suite held (including a v1 household JWT signed with the real secret —
  the exact cookie every family member holds today — refused, and a
  deactivated user's valid cookie stopped by the DAL alone, which the
  DB-free proxy structurally cannot do); rate limiting verified end to
  end after the refactor; login HTML carries `noindex` and leaks no
  password data; DB at exact baseline.
- **Final DB state (Fury-verified):** `{users: 5, loginAttempts: 0,
  pantry: 467, grocery: 8, recipe: 146, voiceChange: 18, cookbook: 5,
  mealPlan: 4}`, zero ZZZ rows, login page offering exactly Bryce and
  Emily.
- **Shipped check:** see the handoff log.

## ⚠️ THE CUTOVER IS BRYCE'S TO TRIGGER

Pushing this deploys it. The moment it lands:
1. `FAMILY_PASSWORD` stops signing anyone in.
2. **Everyone is signed out once** — including Emily's phone.
3. The login page becomes tap-your-name-then-your-own-password.

**Before pushing:** Emily needs her password in hand and a heads-up, or
the app reads as broken rather than changed.
**Keep `FAMILY_PASSWORD` set in Vercel for ~7 days** — it does nothing
in code now, but keeping the env var means a Vercel rollback restores
the previous build's login instantly. Deleting it is a later, separate
step.

## Deliberate leftovers

- **P3a (role gates) is not done, and that matters for sequencing:** a
  kid-role session currently has full write power over all 52 actions.
  Harmless today — **only Bryce and Emily have passwords**, and the
  three kid profiles cannot sign in at all. Do not create a kid *account*
  until P3a ships.
- Strange's non-blocking notes: the login page doesn't explain why the
  kids aren't listed (optional one-liner); amber and green avatars sit
  below WCAG small-text contrast for white initials (legible at 40px
  bold, badge is `aria-hidden` with the name adjacent — revisit if P3b
  makes the initial a sole identifier); the "Who's signing in?" subtitle
  persists into the password step where it's already answered.
- Vision's accepted tradeoffs: bcrypt timing distinguishes "real active
  account" (moot — the account list is deliberately public on the login
  page); the per-IP cap is shared across the household's single public
  IP; `LoginAttempt` self-prunes only on success.
- Captain's note: `recordLoginAttempt`'s prune-on-success is untestable
  under `npm test` by construction (it lives in the guarded half) —
  the correct trade, since the alternative is the live-DB hazard C4
  removed.

## Process lesson (recorded for future missions)

**Gates that must create credentialed test data should run serially, or
own disjoint self-identifying accounts.** Running Vision and Strange in
parallel — each needing a login to sign in with — put a login-capable
test account on the real login page, and Vision blocked on it. With
P3a's role gates not yet in place, that account would have had full
write power had it reached the cutover. Vision was right to refuse to
delete another agent's in-flight rows and to name the exit condition
instead.
