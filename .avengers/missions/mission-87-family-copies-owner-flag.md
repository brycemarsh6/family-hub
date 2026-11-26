# Mission 87: family copies PR 3, owner flag and neutral wording

**Project:** family-hub (Marshee)
**Status:** BUILDING
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
- **Status:** DISPATCHED
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
- **Report:** pending.

### C2 - neutral wording (after Bryce signs off)
- **Status:** PENDING (waiting on Bryce's wording sign-off)
- **Boundaries:** may touch: `src/app/actions/auth.ts` (the lockout string
  and its comment), `src/app/privacy/page.tsx`, `src/app/manifest.ts`,
  `DESIGN.md` (the identity line only).
- **Wording:** exactly as signed off, recorded below once agreed.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-26: mission opened, branch cut from `origin/main` (81dbcc6).
  C1 written. Wording drafts going to Bryce.

## Delivery

- pending
