# Family Accounts v1 — per-person logins, roles, settings, attribution

## Context

Bryce's vision: a professional-grade family app — per-person accounts,
settings, permissions, per-account integrations — as the foundation for
the Calendar/Chores/Tasks branches. Today the app has one shared family
password (`FAMILY_PASSWORD`), a hardcoded `"household"` session identity,
and no user concept in the database.

**The original architecture bet pays off here:** a fresh line-cited
inventory confirmed all 52 guarded Server Actions call
`getVerifiedSession()` as a bare boolean gate and never read its
contents. Only 6 lines in the repo read `userId`. The auth core swaps
without touching a single action signature.

**Bryce's four foundation decisions (asked and answered — don't
relitigate):**
1. **Build on the existing auth** (session.ts/dal.ts + User table +
   hashed passwords). No Clerk, no vendor. Admin creates accounts and
   resets passwords; no self-signup, no email flows.
2. **Two tiers:** login accounts (adults + older kids) and non-login
   **profiles** (little kids — real people for future chores/calendar,
   upgradeable to accounts later).
3. **Permissions: "parents manage, kids participate."** Roles
   admin/parent/kid (+device). Kids view everything, add to shopping,
   contribute; can't delete inventory, edit/delete recipes, manage
   users, or change settings.
4. **Wall tablet: household device mode** — signs in once as a
   device-role user, long session, restricted permissions; the
   tap-your-name actor picker is deferred to the Chores plan (no
   current feature is attribution-critical).

**Execution:** through /avengers, phase by phase, per the house
doctrine. Model per phase noted below (the Recipes-v2 convention).

## ⚠️ Standing constraints

- **The dev DB IS the live family DB.** Additive migrations only, SQL
  reviewed before applying; `prisma generate` + dev-server restart after
  any model change. **Never write a "clean" script for the User table.**
- No Prisma enums — vocabularies in `constants.ts`.
- Passwords/secrets never in git, env-example, or chat. Bootstrap
  prompts for initial passwords on stdin.
- After each phase: `git log origin/main..HEAD` before believing it
  shipped.

## Schema (Phase 1 — all additive)

**`User`** — one model, both tiers. **No `kind` column:**
`passwordHash String?` null = non-login profile; set = account.
Upgrading a profile = setting the hash, no migration. Fields: `id`,
`displayName`, `role String @default("kid")` ("admin"|"parent"|"kid"|
"device" — vocabulary + `Role` type + `toRole()` + `MANAGER_ROLES` in
`constants.ts`), `passwordHash?`, `avatarColor String` (from a new
`AVATAR_COLORS` fixed data palette in constants.ts — initial + color
circle, NO image storage), `voiceTokenHash String? @unique` (SHA-256 of
the per-person Siri token — raw token shown once, never stored; the
plaintext-token screenshot near-leak is why), `deactivatedAt DateTime?`
(soft deactivation — people with attributed rows are never deleted),
timestamps.

**Device mode = a `User` with `role: "device"`** — not a kind column,
not a session flag (a flag pointing at Bryce would make tablet adds lie
about who acted). One axis answers everything: role gates exclude it,
the header renders device chrome off it, the future picker keys off it.

**`LoginAttempt`** — DB-backed rate limiting (in-memory dies per
serverless invocation): `userId?` (no FK — disposable telemetry, the
IrregularityDismissal reasoning), `ip`, `success`, `createdAt`, indexed
on both (userId,createdAt) and (ip,createdAt).

**Attribution now (nullable FKs, SetNull):** `VoiceChange.userId?`,
`GroceryItem.addedById?` (dead `addedBy` string column stays, comment
rewritten: retired in place, additive-only rule). **Explicitly deferred,
household-wide in v1:** Recipe.rating, lastCookedAt, MealPlan uniques,
IrregularityDismissal.

## Sessions & DAL (Phase 2)

- `SessionPayload` v2: `{ v: 2, userId, role, expiresAt }`. `decrypt()`
  rejects payloads without `v === 2` — **every old "household" JWT dies
  at cutover with zero DB reads** (proxy stays DB-free). Delete
  `HOUSEHOLD_USER_ID`, `isCorrectPassword`, all `FAMILY_PASSWORD` reads.
- `createSession(user: {id, role})` — only caller is `login`.
  Device sessions 365 days; people 30 (unchanged).
- Export `COOKIE_NAME` from session.ts; proxy imports it (fixes the
  hardcoded-literal wart).
- **JWT role is a UX hint; the DB is the authority.** New cached
  `loadSessionUser()` in dal.ts does one PK lookup per request:
  `getVerifiedSession()` keeps its exact shape (52 call sites compile
  untouched) but now also fails for deactivated/missing users —
  actions stop instantly on deactivation. Honest limit: page *viewing*
  on a still-valid cookie survives until expiry (proxy is DB-free);
  runbook line: rotating `SESSION_SECRET` = instant global sign-out.
- New helpers: `getVerifiedUser(): VerifiedUser|null` (userId, role,
  displayName, avatarColor, isDevice), `requireRole(...roles)`,
  `requireVerifiedUser()` (replaces the dead `verifySession`).

## Passwords & rate limiting (Phase 2)

- **bcryptjs** (pure JS — zero native-binary risk on the cutover
  deploy; the rate limiter is the real online-guessing defense; cost
  10–11). Wrapped in `src/lib/password.ts` so swapping later touches
  one file. Read the installed package's README first (AGENTS.md).
- `src/lib/loginRateLimit.ts`: sliding 15-min window; 5 failures/user,
  20/IP (first hop of x-forwarded-for); check runs BEFORE bcrypt;
  success rows kept (free audit trail); self-pruning deleteMany >24h on
  success. Honest limits stated: per-user cap is the real bound.
  Lockout copy: "Too many tries. Wait about 15 minutes, or ask Dad to
  reset your password."

## Login UX (Phase 2)

Same `/login` route: tap-your-name person chips (accounts only —
avatar initial + color, 48px+, device chip last), then password.
Hidden `autocomplete="username"` input for password managers. Error:
"That password isn't right." — identical for wrong password vs. forged
userId. **Accepted tradeoff, stated:** the public login page shows
family first names; add `robots: noindex` to the login page (the share
layout precedent). Zero-accounts state points at the bootstrap script.

## Role gates (Phase 3a — the complete disposition of all 54 actions)

**Gated `requireRole("admin","parent")` — 12:** `deletePantryItem`,
`mergePantryItems` (deletes the source row), `updateRecipe`,
`deleteRecipe`, `deleteCookbook`, `deleteTag`, `deleteMealPlan`,
`clearCheckedGroceryItems`, plus (recommended, one-line reverts each):
`shareRecipe`, `stopSharingRecipe`, `shareCookbook`,
`stopSharingCookbook` (sharing = publishing household data publicly).

**Stays any-signed-in-user (device included):** everything else —
notably `deleteGroceryItem` (undo-a-mistake participation), all
put-away, all recipe *creation*/import (kids contribute, can't edit —
the decision's exact wording; AI-spend argument considered and
rejected), meal-plan slot filling, tags add/rename, cookbook
create/file.

**New `src/app/actions/users.ts` (admin-only):** createPerson
(account|profile|device), resetPassword, setRole, renamePerson,
setPersonAvatarColor, deactivatePerson, reactivatePerson,
upgradeProfileToAccount, issueVoiceToken, revokeVoiceToken. Internal
guards: can't deactivate yourself; can't demote/deactivate the last
active admin. (May split usersVoice.ts near the 350-line soft cap.)

**New `src/app/actions/account.ts` (self-service, refuses device):**
changeMyPassword (current password required, rate-limited), updateMyName,
updateMyAvatarColor.

**STRUCTURE.md amendment:** guard rule becomes "`getVerifiedSession()`
or a stricter dal helper."

## UI (Phase 3b)

- Header: `UserMenu.tsx` (44px avatar circle → ActionSheet: identity
  row, Settings, Manage family [admin], Sign out). Retires
  `SignOutButton.tsx`. Layout calls `getVerifiedUser()` (same cached
  read).
- `/settings` (requireVerifiedUser, device bounced): name (TitleSheet),
  avatar color (RadioSheet + new optional `leading` slot for swatches),
  change password. BackLink → Home.
- `/settings/family` (admin): all users listed (deactivated dimmed),
  per-row ActionSheet (rename/role/color/reset password/upgrade/
  deactivate w/ ConfirmSheet), CreatePersonSheet. BackLink → Settings.
- New shared: `AvatarBadge.tsx`. Kid-facing gated controls are
  **hidden, not disabled** (Strange gates at 375px).
- Passwords at creation: admin-set, handed over in person; **no
  forced-change flow** (stated decision — Settings covers rotation).

## Voice attribution (Phase 5)

`/api/voice`: hash provided token → look up user by `voiceTokenHash`
(active only) → actor. **Legacy `VOICE_API_TOKEN` stays working as
null-actor fallback** (hard cutover would brick both phones' Siri until
hand-edited); retired only after both shortcuts carry personal tokens.
`applyActions(actions, actor)`; VoiceChange stamped; **undo scoped to
the speaker when known** ("You haven't changed anything recently"),
global for legacy. `/api/alexa` stays null-actor. Token sheet in Manage
Family shows the raw token exactly once.

## Migration & cutover (the family is never locked out)

1. **Deploy A (Phase 1):** additive schema only; zero behavior change;
   old login untouched.
2. **Bootstrap locally** (dev DB = live DB): `npm run
   db:bootstrap-users` → `prisma/bootstrap-users.ts` — named bootstrap,
   NOT seed; idempotent upserts; stdin-prompted passwords for Bryce
   (admin) + wife (parent); kids as profiles. No clean counterpart —
   ever.
3. **Deploy B (Phase 2 cutover):** v2 sessions live; every old JWT
   bounces to the new login exactly once. Tell the wife beforehand,
   hand her the password in person; PWA icon unaffected (proxy matcher
   excludes images).
4. **Rollback:** `FAMILY_PASSWORD` stays in Vercel 7 days (instant
   rollback to Deploy A restores old login), then deleted everywhere.
   `.env.example` updated in Deploy B's commit.
5. `VOICE_API_TOKEN` retirement is Phase 5's exit step, separate.

## Phases (each shippable; Avengers per phase)

- **P1 Foundation** (Opus/Fable — live-DB migration): schema, constants,
  password.ts, bootstrap script. Done = migration SQL reviewed + in the
  mission log; family rows in Studio (hashes for 2 adults); all other
  table counts identical; app behavior byte-identical; tests green.
- **P2 Auth cutover** (Opus/Fable + full adversarial suite): session v2,
  DAL, proxy import, new login, rate limiting, UserMenu/AvatarBadge,
  .env.example. Done = positive control first; old cookie bounced;
  forged/tampered/expired/v1/deactivated JWTs all rejected against a
  curl'd action; 6th wrong password refused before bcrypt; per-IP cap
  trips; generic error indistinguishable; `FAMILY_PASSWORD` read
  nowhere (grep); wife re-logged-in on her phone. Only adults have
  accounts at this point — no gate-free kid exposure window.
- **P3a Role gates** (Opus — authorization on public POST endpoints):
  the 12 gates, users.ts, account.ts, addedById writes, STRUCTURE.md
  amendment. Done = kid-cookie curl against every gated action refused
  with counts unchanged; last-admin + self-deactivate guards attacked;
  addedById lands correctly.
- **P3b Settings & Manage Family UI** (Sonnet): /settings,
  /settings/family, sheets, kid-hiding. Done = admin creates a kid
  account through the UI; resets a password (old fails, new works);
  Strange pass at 375px. Kid accounts created only after 3a+3b both
  gate-pass.
- **P4 Device mode** (Sonnet): 365-day device session, device chrome,
  settings bounces, tablet walkthrough. Done = tablet signed in;
  decoded JWT ~365d; all 12 gates refuse the device cookie; put-away
  works from the tablet.
- **P5 Voice attribution** (Opus for route auth; token sheet Sonnet):
  route lookup, apply actor threading, token issue/revoke UI, Siri
  walkthrough, legacy retirement checklist. Done = Bryce-token write
  attributed in Studio; wife's undo can't reverse Bryce's change;
  legacy token still works null-attributed until the flip; /api/alexa
  suite still green; exit = both phones personal, `VOICE_API_TOKEN`
  deleted.

**Constitution updates along the way:** STRUCTURE.md (guard wording,
/settings + bootstrap layout rows, danger-register lines: never a User
clean script; SESSION_SECRET rotation = global sign-out runbook).
DESIGN.md (avatar fixed data palette; settled-decision replacing "one
shared family password").

## Out of scope (stated)

Calendars/chores/tasks themselves; per-person ratings/meal plans/
dismissals; email anything; forced password change; 2FA/OAuth/Clerk;
photo avatars; the tablet actor picker (Chores plan); the Marsh
HQ→Marshee rename (separately queued).

## Honest limits (recorded, accepted)

Family first names on the public login page (noindexed, unlisted URL);
deactivated users can view (not act) until cookie expiry — secret
rotation is the hard stop; per-IP limiting best-effort, per-user cap is
the real bound; bcrypt 72-byte truncation documented; JWT role
staleness cosmetic-only by construction.
