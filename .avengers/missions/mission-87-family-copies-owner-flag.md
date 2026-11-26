# Mission 87: family copies PR 3, owner flag and neutral wording

**Project:** family-hub (Marshee)
**Status:** DELIVERING
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr3-owner-flag` (cut fresh from `main`)
**Plan:** `.avengers/plans/family-copies-v1.md`, PR 3

## Brief

- **Goal:** relatives get their own copy of Marshee (same code, their own
  Vercel project). Owner-only features must be off there, and wording that
  names Bryce's family must go. A new setting `MARSHEE_OWNER_COPY=1`, set
  only in Bryce's Vercel project, turns the owner features on.
- **Done means:**
  - `src/lib/copyConfig.ts` (`server-only`) exports `isOwnerCopy()`, true
    only when `MARSHEE_OWNER_COPY` is `1`. The parser is a pure function in
    its own file with a flat `src/lib/*.test.ts` test.
  - With the flag off: the Winnie card is not on `/settings`;
    `sendWinnieTestEvent` refuses; `POST /api/voice` and `POST /api/alexa`
    answer 404 before any other check (before the token, before reading the
    body); the briefing cron returns early and sends nothing.
  - With the flag on: everything behaves exactly as today.
  - Wording: the login lockout no longer says "ask Dad"; privacy page,
    manifest description and DESIGN.md's identity line no longer say "one
    family". Every new sentence signed off by Bryce.
  - Gauntlet green, Vision and Strange PASS, PR merged, production checked.
- **Out of scope:** the Assistant API (`/api/assistant/v1/`, it already
  refuses without its token, which relatives' copies never get), Winnie's
  other event senders (`winnieNotify.ts` sends nothing without its URL and
  key), AI metering (PR 5), feedback forwarding (PR 9), setup link (PR 6).

## Danger register

From AGENTS.md, absolute for every agent:
- Never `npm run db:seed` / `npm run db:reset`; no clean script for `User`.
- No production `DATABASE_URL` anywhere locally. Stop if one is found.
- Never `git add -A` / `git add .`; stage by path, then `git show --stat HEAD`.
- No direct push to `main`; branch, PR, Gauntlet, merge.
- **Merge order (this mission's own danger):** Bryce must add
  `MARSHEE_OWNER_COPY=1` to his Vercel project's Production env vars and
  confirm it BEFORE merge. Without it his live copy loses Winnie, voice and
  the morning briefing the moment the deploy lands.
- No agent sees or prints the voice token, Winnie key or CRON_SECRET.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- GitHub Gauntlet check green on the PR.

## Assembled

- Stark + Vision (always).
- Strange: people see changes (Settings loses a card in other copies, the
  login error, the privacy page).
- Captain: out. Two new small lib files and a handful of one-line gates;
  Vision carries file-length and dependency checks.
- Banner: out. Fury read every target inline (all under 250 lines).

## Contracts

### C1 - the owner flag and the five gates
- **Status:** DONE
- **Objective:** add `isOwnerCopy()` and gate every owner-only surface on it.
- **Boundaries:** may touch: new `src/lib/ownerCopyFlag.ts` (the pure parser),
  new `src/lib/ownerCopyFlag.test.ts`, new `src/lib/copyConfig.ts` (
  `server-only`), `src/app/(app)/settings/page.tsx` (the Winnie block only),
  `src/app/actions/winnie.ts`, `src/app/api/voice/route.ts`,
  `src/app/api/alexa/route.ts`, `src/app/api/cron/briefing/route.ts`,
  `.env.example` (one documented line, if the file exists).
  Must not touch: `src/lib/winnieNotify.ts`, `src/components/WinnieSettings.tsx`,
  `package.json`, `prisma/`, anything else in the settings page.
- **Rules:**
  - `parseOwnerCopyFlag(value: string | undefined): boolean` is true only
    when the value, trimmed, is exactly `"1"` (a pasted trailing newline
    still counts; `"true"`, `"yes"`, `"0"`, `""`, `undefined` are false).
  - `copyConfig.ts` starts with `import "server-only"` and exports
    `isOwnerCopy()` reading `process.env.MARSHEE_OWNER_COPY` at call time
    (never cached at module load, so a test or a redeploy reads it fresh).
  - Voice and Alexa: the very first line of `POST` is
    `if (!isOwnerCopy()) return new Response(null, { status: 404 })` (or the
    project's equivalent), before the token check and before `request.text()`.
  - `sendWinnieTestEvent`: after the sign-in and admin checks, a non-owner
    copy returns `{ ok: false, error: "Winnie isn't part of this copy of Marshee." }`.
    (Never reached through the UI, since the card is hidden.)
  - Briefing cron: after `isAuthorized` (the CRON_SECRET check stays first,
    as its comment promises), return
    `Response.json({ sent: 0, skipped: "not-owner-copy" })`.
  - Settings page: the Winnie block renders only for an admin in the owner
    copy. Nothing else on the page changes.
- **Verification:** the gauntlet; plus `grep -n "isOwnerCopy" src -r` shows
  the five call sites; the new test covers the cases above.
- **Evidence required:** gauntlet output tails with test counts (before and
  after, so the new tests are seen counted), the diff stat, the grep.
- **Done criteria:** Fury reads the diff; each gate is the first thing its
  route does (voice/alexa) or sits where the rules say.
- **Report:** DONE, commit dde3ee2. Gauntlet green; npm test 2283 to 2286 (3 new). Fury read the diff: voice and Alexa gate first, briefing gate right after the CRON_SECRET check, Winnie action after the admin check, settings card behind `isOwnerCopy()`.

### C2 - neutral wording (signed off by Bryce 2026-11-26)
- **Status:** DONE
- **Objective:** replace the wording that names Bryce's family with the signed-off text.
- **Boundaries:** may touch: `src/app/actions/auth.ts` (the `RATE_LIMIT_ERROR`
  string and the comment above `ADMIN_RATE_LIMIT_ERROR` that quotes it),
  `src/app/privacy/page.tsx` (the "What Marshee is" paragraph, the "Last
  updated" date, and the file's top comment line about approval),
  `src/app/manifest.ts` (the description), `DESIGN.md` (the "What this is"
  bullet in Identity only). Must not touch: anything else.
- **Wording (exact, Bryce signed off each one 2026-11-26):**
  - Lockout: `Too many tries. Wait about 15 minutes, or ask an admin to reset your password.`
  - Privacy, "What Marshee is": `Marshee is a private app. Each family that uses it has its own copy, with its own data that no other family can see. There is no public sign-up.`
    ("not sold" dropped on purpose: PR 5 adds a paid Upgrade.)
  - Privacy "Last updated": `November 26, 2026`. Contact email stays (Bryce's call:
    he runs every copy and owns the Google sign-in project).
  - Manifest description: `Your family's calendar, meals, chores and lists in one place.`
  - DESIGN.md "What this is": `a private web app for a family: a shared home base for the kitchen (inventory, shopping, expiring food, recipes, meal plans), calendar, habits and chores, rewards and plans. Each family gets its own private copy; there is no public sign-up.`
- **Verification:** the gauntlet; `grep -rn "ask Dad\|one family\|one household" src DESIGN.md` returns nothing.
- **Evidence required:** diff, grep output, gauntlet tails.
- **Done criteria:** Fury reads the diff word for word against the list above.
- **Report:** DONE. Fury read the diff word for word against the signed-off list: exact match. Grep clean, gauntlet green (2286 tests). Preflight flagged DESIGN.md over the 650-line code cap; it is a markdown doc and C2 grew it by one line (bullet went from 3 to 4 lines), recorded here as a NOTE.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | PASS | none | 4 NOTES (below) |
| 1 | Strange | PASS | none | 4 NOTES (below) |

Both gates ran on 8fb1256.

- **Vision** re-ran the full gauntlet himself: tsc, eslint and build exit 0;
  `npm test` 2286/2286; the direct TZ=UTC command gave 2286 with 10 skipped.
  The 10 skips are DST-conditional tests that already exist on 81dbcc6.
  Hunt: voice and Alexa gate before any request data; the briefing still
  checks CRON_SECRET first. `sendWinnieEvent` has only the two gated
  callers. `src/lib/voice/*` is used only by the two gated routes. The
  client bundle builds fine with `server-only`. Wording matches exactly.
  NOTES:
  - The parser accepts only a trimmed `1`. Bryce confirmed on 2026-11-26
    that the value is exactly 1.
  - A GET to voice or Alexa in a relative's copy gets Next's 405, not 404.
    This leaks nothing.
  - DESIGN.md is 770 lines (markdown).
  - The mission file is in the diff.
- **Strange** tested on port 3100 (another worktree held 3000), first with
  the flag off, then with it on. Screens checked: iPhone 393 and 375, iPad
  820x1180 and 1180x820. With the flag off, Settings has no hole and both
  iPad columns end level. With the flag on, the Winnie card is back exactly
  as on main. `/privacy` and the manifest read correctly. Nothing was
  written to the database and no login was attempted. NOTES:
  - On phone, "sign-up" wraps at its hyphen. This is normal.
  - The lockout text fits DESIGN.md's error rule, and "admin" is the
    app's existing role label.
  - The manifest text is accurate.
  - DESIGN.md and the privacy page agree.

## Handoff log

- 2026-11-26: mission opened, branch cut from `origin/main` (81dbcc6).
  C1 written. Wording drafts going to Bryce.
- 2026-11-26: C1 DONE (dde3ee2). Bryce signed off all wording (humanizer pass first). C2 dispatched.
- 2026-11-26: C2 DONE. Bryce says MARSHEE_OWNER_COPY=1 is added; Fury confirmed through the Vercel connection that the key exists on Production only (value is Sensitive, so unreadable; Bryce asked to make sure it is exactly 1). Bryce did not redeploy, which is fine: the merge deploy reads it. Gates next.
- 2026-11-26: Vision PASS, Strange PASS (pass 1 each). Bryce confirmed the Vercel value is exactly 1. Merged origin/main (PR 1, #135) cleanly. CLAUDE.md status line updated (no net growth). Next: push, PR, Gauntlet, merge, production check.

## Delivery

- pending
