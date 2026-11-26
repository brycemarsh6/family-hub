# Mission 91: Family copies PR 6, setup link and recovery code

**Project:** family-hub (Marshee)
**Status:** GATES (C1 to C3 committed; draft PR #145)
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr6-setup` (cut from `main` at 6436299)
**Plan:** `.avengers/plans/family-copies-v1.md`, "PR 6", "How a copy is configured"
**Mock:** `.avengers/mocks/family-copies-pr6-setup-mock.html`

## Brief

- **Goal:** a relative opens `https://<copy>/setup#<code>`, names their family,
  creates the first admin login, sees a recovery code once, and is signed in.
  An admin who forgets their password uses that code from the sign-in screen.
- **Done means:** Gauntlet green; `npm test` and the direct `TZ=UTC` line pass;
  Vision, Captain and Strange PASS; every refused try in the attack list below
  leaves `User`, `HouseholdSettings` and `Tag` counts unchanged; `/setup` is a
  404 on Bryce's copy and whenever any `User` row exists; `git log
  origin/main..HEAD` empty after merge; production deploy READY.
- **Out of scope:** welcome steps and checklist (PR 7), email reset, the runbook
  (PR 10), time zone in the wizard (an env var since PR 2).

## Facts gathered (Fury, 2026-11-26)

- `HouseholdSettings` (PR 4) already has `familyName`, `setupFinishedAt`,
  `recoveryCodeHash`. **No migration needed.**
- The first-admin script `prisma/bootstrap-users.ts` creates no tags. The
  meal-slot tags come from `prisma/seed-slot-tags.ts`: one `Tag` per
  `MEAL_SLOTS` entry (`src/lib/constants.ts:229`), upsert by name.
- Login is "tap your name, then password" (`login` in `src/app/actions/auth.ts`),
  rate limited by `isLoginRateLimited(userId, ip)` / `recordLoginAttempt`.
  `LoginAttempt.userId` is a plain string, not a relation.
- Admins can already reset any account's password (`resetPassword`,
  `src/app/actions/users.ts:156`).
- Setting a cookie in a Server Action re-renders the current page; `/setup`
  would then 404 (a user exists) under the wizard. So setup and recovery do not
  sign in themselves: the client holds the new password and calls the existing
  `login` action on "Continue".

## Danger register

- `DATABASE_URL` must be the Neon dev branch host. Anything else: stop.
- Never `npm run db:seed` / `db:reset`. No clean/reset script for `User`.
- Dev has real `User` rows, so `/setup` is naturally closed there. Attack
  proofs that need zero users run against a throwaway empty Postgres (the
  fresh-DB approach from PR 2), never by deleting dev users. ZZZ test rows only,
  cleaned by the code that made them.
- Never `git add -A` / `git add .`. No pushes, merges or deploys by anyone but Fury.
- Secrets (`SETUP_CODE`, recovery codes) never in chat, code or git.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build` · GitHub check "Gauntlet" green

## Assembled

Stark + Vision; Strange (new screens); Captain (new files and a new public
route). Banner not needed: Fury read the login, rate limit and settings code.

## Attack list (each must be refused with counts unchanged)

wrong code · missing code · setup after a user exists · setup on the owner copy
(404) · replaying the form · a flood (rate limit) · wrong recovery code ·
recovery code reuse · two setup submits at once (only one admin).

## Decisions

- **D1 (Bryce, 2026-11-26, via the planning chat):** all seven mock questions as
  recommended. His words: "All recommended for PR 6's seven screen questions."
  So: Q1 login empty text; Q2 step 1 family name; Q3 step 2 name + password +
  again; Q4 16-character code, Copy, "I saved my code" tick, Continue signs in;
  Q5 "Forgot password?" under Sign in (admins recover, others "ask an admin");
  Q6 admin "Recovery code" card under Feedback, no password check; Q7 shows on
  the owner copy too. Plus the wrong-link screen and the owner-copy 404.
- **D5 (Bryce, 2026-11-26, in this chat):** the link-check offline line "Couldn't check your link. Check your connection, then reload this page." approved ("I agree with your rec").
- **D2 (Fury, structure):** setup and recovery do not set a cookie themselves
  (see Facts); "Continue" calls the existing `login` with the password the
  client still holds.
- **D3 (Fury, structure):** the zero-user attack proofs run in CI against the
  workflow's empty Postgres (`prisma/setup-attack-smoke.ts`), because there is
  no local Postgres and dev has real users. CI keeps them as a permanent
  regression check.
- **D4 (Fury, structure):** the unguarded exceptions grow by name in
  STRUCTURE.md: `setup.ts`'s `checkSetupLink` / `createFamily` and `auth.ts`'s
  `resetPasswordWithRecoveryCode` (all reachable with no session by design).

## Progress

- C1 DONE (Stark, 2026-11-26). Fury re-ran: after `npx prisma generate` (stale client in the new worktree) `tsc` exits 0; the two new test files run 28 tests, 28 pass. Gates still to come.
- C2 DONE (Stark): gauntlet green locally; smoke script runs only in CI. Committed with C1, pushed, draft PR #145 opened so CI runs the attack step.
- C3 DONE (Stark): tsc, eslint, npm test, build green. Committed and pushed.
- Gates pass 1: Vision and Captain dispatched in parallel; Strange after them (it runs the dev server).

## Contracts

### C1. Pure setup and recovery helpers (no UI, no database)

- **Objective:** the decidable rules of setup and recovery as pure, tested functions.
- **May touch (create):** `src/lib/setupGate.ts`, `src/lib/setupGate.test.ts`,
  `src/lib/recoveryCode.ts`, `src/lib/recoveryCode.test.ts`.
  **Must not touch:** everything else (no schema, no actions, no UI, no package.json:
  `src/lib/*.test.ts` is already in the test glob).
- **What to build:**
  - `setupGate.ts`, no `server-only`, no env reads, no db (inputs only; `node:crypto` allowed):
    - `setupCodeMatches(given: string, configured: string | undefined | null): boolean`.
      False when `configured` is missing or blank after trim, or `given` is empty.
      Constant time: SHA-256 both strings, compare digests with `crypto.timingSafeEqual`
      (so different lengths never throw or short-circuit). Compare `configured.trim()`
      against `given.trim()`.
    - `setupIsOpen(params: { ownerCopy: boolean; configuredCode: string | undefined | null; userCount: number; setupFinished: boolean }): boolean`:
      true only when not owner copy, code configured (non-blank), `userCount === 0`,
      and not `setupFinished`.
    - `FAMILY_NAME_MAX = 60`, `DISPLAY_NAME_MAX = 40`.
    - `checkSetupInput(input: { familyName: string; displayName: string; password: string; passwordAgain: string }): { ok: true; familyName: string; displayName: string } | { ok: false; error: string }`:
      trims names; errors in this order and wording: empty family name
      "Give your family a name."; family name over max "Keep the family name under 60 characters.";
      empty display name "Enter your name."; over max "Keep your name under 40 characters.";
      password shorter than `MIN_PASSWORD_LENGTH` (import from `./password`)
      "Passwords must be at least 8 characters." (build the number from the constant);
      mismatch "Those passwords don't match.". Passwords are NOT trimmed.
    - `SETUP_RATE_LIMIT_KEY = "setup"` (the `LoginAttempt.userId` value setup attempts are counted under).
  - `recoveryCode.ts`, same purity rules:
    - `RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"` (no 0, 1, I, L, O).
    - `generateRecoveryCode(): string`: 16 characters drawn with `crypto.randomInt`
      (unbiased), formatted `XXXX-XXXX-XXXX-XXXX`.
    - `normalizeRecoveryCode(input: string): string | null`: uppercase, remove every
      space and dash; return the 16-character string only if every character is in the
      alphabet and the length is 16, else null.
    - `RECOVERY_RATE_LIMIT_KEY_PREFIX` is NOT needed (recovery is limited per account).
  - Plain-English header comment on each file saying why it exists (house style: see
    `src/lib/loginRateLimitPolicy.ts`). No em dashes in new comments.
- **Tests (node:test, same style as `src/lib/loginRateLimitPolicy.test.ts`):** match,
  mismatch, different lengths, blank/undefined configured, empty given, whitespace
  trimming; every `setupIsOpen` branch; every `checkSetupInput` error and the trimmed ok
  result; generated codes: format regex, only alphabet characters, 1000 codes all
  distinct; normalize: lower case and spaces accepted, wrong length null, an excluded
  character (`O`, `0`, `1`, `I`, `L`) null; `normalizeRecoveryCode(generateRecoveryCode())`
  round-trips.
- **Verification:** `npx tsc --noEmit`, `npx eslint src/lib/setupGate.ts src/lib/recoveryCode.ts src/lib/*.test.ts`,
  `npm test` (count goes up by the new tests, 0 failures), and the direct `TZ=UTC` line.
- **Evidence:** the commands' tail output with pass/fail counts before and after.
- **Done:** all of the above green; no file outside the may-touch list changed (`git status`).
  Do not commit.

### C2. Server side: gate, flows, actions, proxy, CI attack proof

- **Objective:** setup and recovery work and refuse everything else, provably.
- **May touch:** create `src/lib/setupFlow.ts`, `src/lib/recoveryFlow.ts`,
  `src/lib/clientIp.ts`, `src/app/actions/setup.ts`, `src/app/actions/recoveryCode.ts`,
  `prisma/setup-attack-smoke.ts`; edit `src/lib/householdSettingsRead.ts`,
  `src/lib/householdSettingsWrites.ts`, `src/app/actions/auth.ts`, `src/proxy.ts`,
  `.github/workflows/ci.yml` (one new step only), `STRUCTURE.md` (the
  `src/app/actions/` row exception, the HouseholdSettings entry, one line under
  the guard rules for the new public route).
  **Must not touch:** any UI file (`src/app/(app)/**`, `src/components/**`),
  `prisma/schema.prisma`, migrations, `package.json`, C1's files (import only).
- **Reads (add to `householdSettingsRead.ts`, the only reader):**
  `setupFinished(): Promise<boolean>`, `recoveryCodeHash(): Promise<string | null>`,
  `hasRecoveryCode(): Promise<boolean>`. Errors propagate (unlike `savedFamilyName`).
- **Writes (add to `householdSettingsWrites.ts`):**
  - `createFamilyAndFirstAdmin({ familyName, displayName, passwordHash, recoveryCodeHash }): Promise<{ userId: string } | { closed: true }>`:
    ONE interactive `db.$transaction(async (tx) => …, { isolationLevel: "Serializable" })`:
    `tx.user.count()`; if > 0 return closed. Create the `User` (role `"admin"`,
    `avatarColor: AVATAR_COLORS[0].name`), upsert the `HouseholdSettings` row
    (`familyName`, `setupFinishedAt: new Date()`, `recoveryCodeHash`,
    `updatedById` = new user id), upsert one `Tag` per `MEAL_SLOTS` by name
    (same as `prisma/seed-slot-tags.ts`). A Prisma serialization or unique
    conflict (`P2034`, or a write-conflict error) is caught and returns closed
    (so two submits at once give one admin). No read of `householdSettings`
    inside (the `user.count` is the gate).
  - `replaceRecoveryCodeAndPassword({ userId, oldCodeHash, newCodeHash, newPasswordHash }): Promise<boolean>`:
    one transaction: `householdSettings.updateMany({ where: { id: "household", recoveryCodeHash: oldCodeHash }, data: { recoveryCodeHash: newCodeHash, updatedById: userId } })`;
    if count !== 1, abort (throw inside, catch outside) and return false;
    else update the user's `passwordHash`; return true. Compare-and-swap so a
    code can be used once even by two requests at the same moment.
  - `saveRecoveryCodeHash(hash, actorUserId)`: upsert the row with the new hash.
- **`src/lib/clientIp.ts`** (pure, no `server-only` needed if it only takes a
  `Headers`-like `{ get(name): string | null }`): move `clientIp` out of
  `auth.ts` unchanged in behaviour; `auth.ts` imports it.
- **`src/lib/setupFlow.ts`** (`server-only`, no auth, no cookies, takes `ip` as a parameter so the CI script can drive it):
  - `isSetupOpen(): Promise<boolean>`: `setupIsOpen({ ownerCopy: isOwnerCopy(), configuredCode: process.env.SETUP_CODE, userCount: await db.user.count(), setupFinished: await setupFinished() })`.
  - `type SetupLinkStatus = "ok" | "bad" | "limited"`.
  - `checkSetupLinkFlow(code: string, ip: string): Promise<SetupLinkStatus>`:
    not open → "bad" (no write); `isLoginRateLimited(SETUP_RATE_LIMIT_KEY, ip)`
    limited → "limited" (no write); `!setupCodeMatches(code, process.env.SETUP_CODE)` →
    `recordLoginAttempt({ userId: SETUP_RATE_LIMIT_KEY, ip, success: false })`, "bad";
    else "ok" (no write).
  - `type CreateFamilyResult = { status: "bad" | "limited" } | { error: string } | { userId: string; recoveryCode: string }`.
  - `createFamilyFlow(input: { code: string; familyName: string; displayName: string; password: string; passwordAgain: string }, ip: string): Promise<CreateFamilyResult>`:
    same first three steps as the link check (bad / limited / wrong code recorded),
    then `checkSetupInput` → `{ error }` (no write), then hash the password
    (`hashPassword`), `generateRecoveryCode()`, hash its `normalizeRecoveryCode`
    form with `hashPassword`, call `createFamilyAndFirstAdmin`; closed → `{ status: "bad" }`;
    ok → `{ userId, recoveryCode }` (the formatted code; the only place it ever
    leaves the server). Never log the code, the password or `SETUP_CODE`.
- **`src/lib/recoveryFlow.ts`** (`server-only`, no auth):
  - `type RecoveryResult = { error: string } | { recoveryCode: string }`.
  - `RECOVERY_WRONG = "That recovery code isn't right."`, `RECOVERY_LIMITED = "Too many tries. Wait about 15 minutes, then try again."`.
  - `resetWithRecoveryCodeFlow(input: { userId: string; code: string; newPassword: string; newPasswordAgain: string }, ip: string): Promise<RecoveryResult>`:
    password length (`MIN_PASSWORD_LENGTH`) and match checks first, same wording
    as `checkSetupInput` (no write); `isLoginRateLimited(userId, ip)` → limited;
    look up the user (admin, not deactivated, has a password); `normalizeRecoveryCode`;
    read `recoveryCodeHash()`; `ok = eligible && normalized && hash && await verifyPassword(normalized, hash)`;
    record the attempt (`userId`, `ip`, `success: ok`); not ok → `RECOVERY_WRONG`
    (one message for every failure reason). Then new code + both hashes,
    `replaceRecoveryCodeAndPassword` with `oldCodeHash: hash`; false → `RECOVERY_WRONG`;
    true → `{ recoveryCode }`.
  - `makeRecoveryCodeFlow(actorUserId: string): Promise<{ recoveryCode: string }>`:
    generate, hash, `saveRecoveryCodeHash`, return.
- **Actions:**
  - `src/app/actions/setup.ts` (`"use server"`, unguarded by design, header comment says why):
    `checkSetupLink(code: string): Promise<SetupLinkStatus>` and
    `createFamily(input): Promise<CreateFamilyResult>`, each = `clientIp(await headers())` + the flow.
    Types come from `@/lib/setupFlow` (never re-exported from the action file).
  - `auth.ts`: add `resetPasswordWithRecoveryCode(input): Promise<RecoveryResult>` the same way.
  - `src/app/actions/recoveryCode.ts`: `makeNewRecoveryCode(): Promise<{ recoveryCode: string } | { error: string }>`,
    guard form (a): `getVerifiedUser()`; not signed in or `role !== "admin"` →
    `{ error: "Only an admin can make a recovery code." }`.
- **`src/proxy.ts`:** add `"/setup"` to `PUBLIC_ROUTES` (exact match) with a
  comment in the house style: the page 404s unless setup is open, the code in
  the `#` never reaches the server's logs, each action rechecks everything.
- **`prisma/setup-attack-smoke.ts`:** copy `prisma/fresh-db-smoke.ts`'s
  localhost-only refusal and `server-only` stub. Refuse to start unless
  `db.user.count() === 0`. Drive the flows directly with set `process.env`
  values and fixed fake IPs, asserting after EVERY refused try that the counts
  of `User`, `HouseholdSettings`, `Tag` are unchanged (and on recovery tries
  that the admin's `passwordHash` and the stored code hash are unchanged).
  Cases, in this order:
  1. owner copy (`MARSHEE_OWNER_COPY=1`, code set, right code): `isSetupOpen()` false, link "bad", create "bad".
  2. `SETUP_CODE` unset: same.
  3. code set to a random test value, owner flag unset: `isSetupOpen()` true (positive control).
  4. missing code `""`: link "bad", create "bad".
  5. wrong code: "bad" for both.
  6. flood from IP "10.0.0.9": wrong codes until "limited" comes back (expect
     it on the try after `USER_FAILURE_LIMIT` failures in total for the key);
     then the RIGHT code is still "limited"; counts 0. Then delete only
     `LoginAttempt` rows with `userId: "setup"` (this script's own, in a CI
     throwaway database) and assert the right code now gives "ok".
  7. bad input with the right code (short password, mismatch): `{ error }`, counts 0.
  8. two `createFamilyFlow` calls with the right code at once (`Promise.all`,
     different names): exactly one returns a `userId`, the other `{ status: "bad" }`;
     User 1, HouseholdSettings 1, Tag = `MEAL_SLOTS.length`; the row has the
     family name and `setupFinishedAt`.
  9. replay the winning input exactly: "bad"; counts unchanged. `isSetupOpen()` false.
  10. recovery, unknown userId: `RECOVERY_WRONG`, nothing changed.
  11. recovery, admin, wrong code: `RECOVERY_WRONG`, nothing changed.
  12. recovery, admin, right code (from case 8): returns a new code; the new
      password verifies against the stored hash; the stored code hash changed.
  13. reuse the old code: `RECOVERY_WRONG`, nothing changed.
  14. the new code twice at once: exactly one succeeds.
  15. recovery flood on the admin from IP "10.0.0.7": wrong codes until
      `RECOVERY_LIMITED`; then the right current code is still refused; nothing changed.
  Print one line per case ("ok  1 owner copy refused") and exit 1 on the first failure.
- **CI:** one step right after "Fresh database: crons on empty data":
  `"Fresh database: setup and recovery attacks"`, same `DATABASE_URL`, run
  `node --import tsx prisma/setup-attack-smoke.ts`. Confirm the crons step
  creates no `User` row (read `fresh-db-smoke.ts`); if it does, say so and stop.
- **Verification:** `npx prisma generate` first if the client is stale;
  `npx tsc --noEmit`, `npx eslint .`, `npm test`, the direct `TZ=UTC` line, `npm run build`.
  The smoke script cannot run locally (no Postgres; never point it at Neon);
  it runs in CI after Fury pushes.
- **Evidence:** command tails; the diff stat; for the flows, file:line of each
  refusal path; confirmation the crons step makes no users.
- **Done:** all green, boundaries kept (`git status`), nothing committed.

### C3. Screens (after C2; Bryce's D1 wording, the mock is the picture)

- **Objective:** the screens in `.avengers/mocks/family-copies-pr6-setup-mock.html`, wired to C2's actions.
- **May touch:** create `src/lib/setupVocabulary.ts`, `src/components/RecoveryCodeReveal.tsx`,
  `src/components/RecoveryCodeCard.tsx`, `src/app/(app)/setup/page.tsx`,
  `src/app/(app)/setup/SetupWizard.tsx`, `src/app/(app)/login/RecoveryResetForm.tsx`;
  edit `src/app/(app)/login/LoginForm.tsx`, `src/app/(app)/login/page.tsx`,
  `src/app/(app)/settings/page.tsx` (one admin card plus its one read, nothing else),
  `src/components/AppChrome.tsx` (only if needed so `/setup` gets exactly `/login`'s chrome),
  `DESIGN.md` / `STRUCTURE.md` only if a gate asks.
  **Must not touch:** C1/C2 files (import only), schema, actions, `package.json`.
- **Words:** every user-facing string in `src/lib/setupVocabulary.ts` (house pattern:
  `src/lib/rewardVocabulary.ts`), copied exactly from the mock, no em dashes.
- **`RecoveryCodeReveal`** (client; used three times): props `title`, `intro`, `code`,
  `continueLabel`, `onContinue`, `pending`. The code large, monospace, centred,
  in a surface card; a secondary "Copy code" button (`navigator.clipboard.writeText`,
  "Copied" for 2 s, the ShareSheet error line on failure); the warn-soft box
  "…It won't be shown again."; a 48px-tall "I saved my code" checkbox row (a real
  `<input type="checkbox">` with its label); the primary button disabled until ticked.
- **`/setup` page** (server): `export const dynamic = "force-dynamic"`, robots
  noindex like the login page; first line `if (!(await isSetupOpen())) notFound();`;
  then the same icon + wordmark + tagline block as `/login` and `<SetupWizard />`.
- **`SetupWizard`** (client): read the code from `location.hash` (strip `#`,
  `decodeURIComponent`, guard the throw) with `useSyncExternalStore` (DESIGN.md's
  browser-only read rule); call `checkSetupLink` once; states: checking (quiet
  "Checking your link…"), bad (the wrong-link screen), limited (RATE text: "Too many
  tries. Wait about 15 minutes, then open your link again."), step 1, step 2,
  code. Step 1: dots, "Welcome to Marshee", intro, "What's your family called?"
  field (placeholder "The Smiths", maxLength `FAMILY_NAME_MAX`, autoFocus), Next
  (disabled while blank). Step 2: "‹ Family name" back (keeps values), dots,
  "Your login", "You'll be the first admin for {family}. You can add everyone else
  after this.", Your name (maxLength `DISPLAY_NAME_MAX`, `autoComplete="name"`),
  Password and Password again (`type=password`, `autoComplete="new-password"`,
  `minLength={MIN_PASSWORD_LENGTH}`), "Create my family" (pending "Creating…").
  `{ error }` shows in the login page's alert style; `{ status }` switches to bad /
  limited. Success shows `RecoveryCodeReveal` ("Save your recovery code", Continue);
  Continue calls the existing `login` action with a FormData of `userId` and the
  password still in state (inside `startTransition`); `login` redirects.
- **Login page:** the empty state paragraph becomes Q1's sentence (no `<code>`).
- **`LoginForm`:** under Sign in, a centred "Forgot password?" text button (min 44px
  tall, accent, underlined). It opens the forgot view with "‹ Password" back. An admin
  account gets `RecoveryResetForm` (heading "Set a new password", intro "Enter your
  family's recovery code. Capitals and dashes don't matter.", Recovery code field
  `autoComplete="off"`, `autoCapitalize="characters"`, placeholder
  "XXXX-XXXX-XXXX-XXXX", New password, New password again, "Set password") calling
  `resetPasswordWithRecoveryCode`; `{ error }` in the alert style; success shows
  `RecoveryCodeReveal` ("Your new recovery code", "Your password is changed. The old
  code no longer works, so save this one instead.", Continue → `login` with the new
  password). Any other role: heading "Forgot your password?" and "Ask an admin to
  set a new password for you in Settings, Manage family." (the tablet too).
- **Settings:** admins only, a new `order-4` block right after Feedback:
  `<RecoveryCodeCard hasCode={…} />` with `hasRecoveryCode()` read only for admins.
  Card: title "Recovery code" + pill ("Saved" accent-soft / "No code yet" surface-2),
  the help line (the "Making a new code stops the old one working." sentence only when a
  code exists), button "Make a new code" (secondary) or "Make a code" (primary when
  none). Tapping calls `makeNewRecoveryCode`; the card then shows `RecoveryCodeReveal`
  ("Your new recovery code", intro "The old code no longer works.", continue label
  "Done"); Done returns to the card showing "Saved". `{ error }` in the alert style.
- **Rules:** DESIGN.md throughout (48px targets, rem not px text, colour tokens by
  job, Lucide outline icons only); files under STRUCTURE.md's caps.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm run build`.
- **Evidence:** command tails, diff stat, and a list mapping each mock screen to its file.
- **Done:** all green, boundaries kept, nothing committed.

## Gate log

- **Captain pass 1: BLOCKED.** BLOCKER: `FAMILY_NAME_MAX` defined twice
  (`setupGate.ts:13` and `feedbackForward.ts:15`). NOTES taken into the fix
  batch (Fury's structure calls): import the cap from `feedbackForward.ts`;
  move `/setup` into `showsWordmarkHeader` (`src/lib/appChrome.ts`) with a test
  and docstrings; STRUCTURE.md text for the `(app)` row, "named exceptions",
  the prisma row, the Household settings entry, the vocabulary line and the
  `…Flow.ts` naming line; `docs/structure/layout.md` header line; `tagWrites.ts`
  header names the setup exception; one `newRecoveryCode()` helper; recovery
  reuses a shared `checkNewPassword`. Left as notes: `DISPLAY_NAME_MAX` only on
  setup; move the Household settings entry to `docs/structure/family-copies.md`
  in PR 7.
- **Vision pass 1: PASS.** Re-ran the full gauntlet including the `TZ=UTC`
  line; CI run 45887741957 on 4756260 printed `ok 1` to `ok 15`. NOTES taken
  into C4: case 8 should drive the write directly so the conflict path is
  likely exercised; case 14 should assert the winner's password; add
  non-admin, deactivated-admin and no-stored-code recovery cases; a `.catch`
  on the link check; drop the `#code` from the address bar after a successful
  create. Left as notes: the skipped bcrypt reveals "is an eligible admin"
  (already visible by role on the login page); lockout nuisance on the global
  "setup" key and the account's login budget (by design); recovery does not end
  other sessions (matches `resetPassword`); one family code across admins (by
  design).

### C4. Fix batch (Captain pass 1 + Vision notes)

- **May touch:** `src/lib/setupGate.ts`, `src/lib/setupGate.test.ts`, `src/lib/recoveryCode.ts`,
  `src/lib/recoveryCode.test.ts`, `src/lib/setupFlow.ts`, `src/lib/recoveryFlow.ts`,
  `src/lib/appChrome.ts`, `src/lib/appChrome.test.ts`, `src/components/AppChrome.tsx`,
  `src/lib/tagWrites.ts` (header comment only), `src/lib/setupVocabulary.ts`,
  `src/app/(app)/setup/SetupWizard.tsx`, `prisma/setup-attack-smoke.ts`,
  `STRUCTURE.md`, `docs/structure/layout.md`. Must not touch anything else.
1. `FAMILY_NAME_MAX`: delete it from `setupGate.ts`; `setupGate.ts`, `SetupWizard.tsx`
   and `setupGate.test.ts` import it from `feedbackForward.ts` (setupGate does not
   re-export it). `DISPLAY_NAME_MAX` stays.
2. `showsWordmarkHeader` in `src/lib/appChrome.ts` covers `/setup`; add a `/setup`
   assertion in `appChrome.test.ts`; remove the OR and its comment from
   `AppChrome.tsx`; update the docstrings at `appChrome.ts` that say "the dashboard
   and /login".
3. One pure `newRecoveryCode(): { code: string; plain: string }` in `recoveryCode.ts`
   (with a test) replaces the three generate-normalize-throw copies.
4. Export `checkNewPassword(password, again): string | null` from `setupGate.ts`
   (the two password errors live only there); `checkSetupInput` and
   `resetWithRecoveryCodeFlow` both call it. Tests still pass unchanged.
5. `SetupWizard`: `.catch` on `checkSetupLink` shows a new "offline" state with
   `SETUP_WORDS.linkCheckFailed = "Couldn't check your link. Check your connection, then reload this page."`
   (in `setupVocabulary.ts`). After a successful create, `history.replaceState`
   drops the `#…` from the address bar (keep the code already in state).
6. `prisma/setup-attack-smoke.ts`: case 8 calls `createFamilyAndFirstAdmin` twice
   at once with hashes made in advance (plain recovery code known to the script),
   then asserts as now; keep one sequential `createFamilyFlow` with the right code
   after it as the replay. Case 14 asserts the stored password verifies against the
   winner's new password and not the loser's. New recovery cases after 15 (clear the
   script's own `LoginAttempt` rows first): a kid account (created in the CI
   database with a password) → `RECOVERY_WRONG`; a second admin that is
   deactivated → `RECOVERY_WRONG`; stored code hash set to null → `RECOVERY_WRONG`
   with the right old code; each with nothing changed. The script still never
   deletes a `User` row.
7. STRUCTURE.md and `docs/structure/layout.md`: apply Captain's exact texts (in the
   Gate log's source: the `(app)` row, "Unguarded exports outside those named
   exceptions", the prisma row, the Household settings entry two sentences, the
   `setupVocabulary.ts` line, the `…Flow.ts` naming line, layout.md's header line).
   `tagWrites.ts` header: one line naming the setup exception.
- **Verification:** tsc, eslint, `npm test`, the direct `TZ=UTC` line, `npm run build`.
- **Done:** all green, boundaries kept, nothing committed.
- **Captain's exact texts for item 7:**
  - `src/app/actions/` row, "never" column: "Unguarded exports outside that one named exception" → "Unguarded exports outside those named exceptions".
  - Household settings entry: replace "a second `db.householdSettings` read is a BLOCKER, so later PRs add their readers there." with "a second `db.householdSettings` read in `src/` is a BLOCKER, so later PRs add their readers there (the CI check `prisma/setup-attack-smoke.ts` reads the row directly on purpose, to verify the writes independently)." After "`revalidatePath`)." add: "`createFamilyAndFirstAdmin` there also creates the first `User` and the `MEAL_SLOTS` tags, by design: setup is one serializable transaction gated by the user count. It is the only write outside `tagWrites.ts` that makes a `Tag`."
  - Beside that entry: "- `src/lib/setupVocabulary.ts` (no imports) holds every word of first-run setup, the recovery code screens and the Settings recovery card. Server refusal messages stay with their rule (`setupGate.ts`, `recoveryFlow.ts`). (Mission-91.)"
  - Naming: "A `server-only` lib module that runs a whole multi-step server sequence for an action with no session (setup, recovery) is named `<thing>Flow.ts` and takes the caller's IP as a parameter so a CI script can drive it (mission-91)."
  - Layout map `(app)` row: "Authenticated routes, wrapped in `AppChrome` (drawer, hamburger, and the wordmark header on `/`, `/login` and `/setup`). `/login` and `/setup` deliberately live here too and get no drawer (`AppChrome` is handed no user; `/setup` 404s unless `isSetupOpen()`), rather than moving to a separate layout" (keep any tail of the existing row that this does not restate).
  - prisma row: name "the CI-only empty-database checks (`fresh-db-smoke.ts`, and `setup-attack-smoke.ts`, which also refuses a non-empty `User` table and deletes only `LoginAttempt` rows; both refuse any host but localhost)" where it names only `fresh-db-smoke.ts`.
  - `docs/structure/layout.md` around lines 319-320: "the header now exists only on `/`, `/login` and `/setup` (mission-91)".
- **Captain pass 2: PASS.** Blocker gone (`FAMILY_NAME_MAX` only in
  `feedbackForward.ts:15`); every text landed word for word. NOTES:
  `setup-attack-smoke.ts` at 344 lines (soft cap 350), so the next case should
  first move shared steps into a helper; four client sheets carry their own
  "passwords don't match" wording (pre-existing, a later vocabulary cleanup).
- **Vision pass 2: PASS** at 8214ad8. CI run 45888711591 printed `ok 1` to
  `ok 18` and "all cases passed". The reveal-above-status move is right and
  cannot win wrongly. NOTES: a rejected `createFamily` (network drop) reaches the
  error boundary (pre-existing in C3; taken into the Strange fix batch if one
  happens); case 18 also writes the row, which the STRUCTURE.md sentence only
  calls a read (CI script, not a violation).
