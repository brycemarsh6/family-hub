# Mission 90: family copies PR 9, feedback forwarding

**Project:** family-hub (Marshee)
**Status:** GATES PASSED, DELIVERING
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr9-feedback` (cut from `main` at f02b85b)
**Plan:** `.avengers/plans/family-copies-v1.md`, PR 9

## Brief

- **Goal:** feedback sent in a relative's copy also lands in Bryce's own
  inbox, labeled with the family name. The screenshot goes to Bryce only if
  the family turns on a switch that starts off.
- **Done means:**
  - Additive migration: nullable `Feedback.sourceFamily`.
  - In a copy that is not the owner copy and has both `FEEDBACK_FORWARD_URL`
    and `FEEDBACK_FORWARD_KEY` set, saving feedback also posts it to Bryce's
    copy, after the family's own save, without slowing or failing it.
  - `POST /api/feedback-inbox` exists only on the owner copy with
    `FEEDBACK_INBOX_KEY` set (404 otherwise, before anything else). Key
    checked in constant time, body size capped while reading, rate limited
    from the Feedback table, exact entry in `src/proxy.ts`. Writes one
    `Feedback` row with `sourceFamily`.
  - Bryce's `/settings/feedback` shows the family name on forwarded reports.
  - Relatives' sheet (forwarding on): "Sent to your admin and to Bryce", and
    a "Share screenshot with Bryce" switch, off by default. Bryce's own copy
    and copies without forwarding keep today's sheet unchanged.
  - Adversarial proof: no key, wrong key, oversized body, flood, route on a
    non-owner copy. Feedback row count unchanged after each refusal.
- **Out of scope:** reading the family name from `HouseholdSettings` (PR 4,
  #141, is not merged; this PR uses a `FAMILY_NAME` setting and PR 4 or a
  follow-up can switch it), per-family keys, replies from Bryce to families.

## Bryce's decisions (2026-11-26, in chat)

- Switch: "Share screenshot with Bryce", line "Bryce will see whatever is on
  this screen right now." Off by default.
- In relatives' copies with forwarding on, "Sent to admin only" becomes
  "Sent to your admin and to Bryce".
- Bryce's inbox shows the sender's display name and the family name
  ("Ann · Smith family").

## Fury's structure calls

- **Screenshots go in the database row, not Blob.** Bryce's own feedback
  screenshots are stored in `Feedback.screenshot` (Bytes), not in Vercel
  Blob, so "stored like his own" means the row. Same 400 KB cap.
- **Two setting names.** Relatives' copies send with `FEEDBACK_FORWARD_URL`
  plus `FEEDBACK_FORWARD_KEY`; Bryce's copy checks `FEEDBACK_INBOX_KEY`
  (the same secret value). Separate names so Bryce's own previews, which act
  like a relative's copy, never forward by accident.
- **Family name:** `FAMILY_NAME` in the relative's Vercel project, else
  "Unnamed family".
- **Rate limit:** counted from forwarded `Feedback` rows (the DB-backed
  pattern of `loginRateLimit.ts`, no new table): at most 10 per family and
  30 in total per hour. Wrong-key requests never touch the database.
- **Forwarding runs in `after()`** (Next's after-the-response hook) with a 5
  second timeout, so a slow or broken owner copy never affects the family.

## Danger register

From AGENTS.md, absolute for every agent:
- Never `npm run db:seed` / `npm run db:reset`; no clean script for `User`.
- Local `.env` points at the Neon dev branch (`ep-hidden-pine-…`, checked
  2026-11-26). Never print `.env`. Stop if a different host appears.
- Migration additive only; SQL reviewed before `prisma migrate deploy` to dev.
- Never `git add -A` / `git add .`; stage by path, then `git show --stat HEAD`.
- No direct push to `main`.
- **No key in chat, git or code.** Test keys are generated in the shell into
  a scratch file outside the repo and never printed.
- The new route writes to the live family database once merged: the
  adversarial proof must pass before merge.
- Test rows written to the dev branch during the proof carry the family name
  `PR9-TEST` and are deleted by that exact filter afterwards.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- GitHub Gauntlet check green on the PR.

## Assembled

- Stark + Vision (always).
- Strange: the sheet and the inbox change.
- Captain: new route, new lib files, a migration.

## Contracts

### C1. Server side: column, forwarder, receiving route

- **Objective:** add `sourceFamily`, forward from relatives' copies, receive
  on the owner copy.
- **May touch:** `prisma/schema.prisma` (Feedback model only: one line plus
  its doc comment), `prisma/migrations/20261126400000_feedback_source_family/migration.sql`
  (new), `src/lib/feedbackForward.ts` (new, pure, no imports), 
  `src/lib/feedbackForward.test.ts` (new), `src/lib/feedbackInbox.ts` (new,
  server-only: forward sender, `feedbackForwardsToOwner()`, key compare,
  rate limit), `src/app/api/feedback-inbox/route.ts` (new),
  `src/app/actions/feedback.ts`, `src/lib/feedbackRead.ts`, `src/proxy.ts`
  (one entry plus comment), `.env.example` (three names, no values).
- **Must not touch:** any component, any layout, anything else.
- **Interface C2 relies on:** `sendFeedback` input gains optional
  `keepScreenshot?: boolean` (undefined means true) and
  `shareScreenshotWithOwner?: boolean`. `feedbackForwardsToOwner(): boolean`
  exported from `src/lib/feedbackInbox.ts`. `FeedbackListItem` gains
  `sourceFamily: string | null`.
- **Verification:** gauntlet; new tests cover payload parsing (caps, bad
  types, oversized screenshot, family name trimming and cap), the forward
  config (both needed, https or localhost only), and the family-name
  fallback.
- **Done:** gauntlet green; route returns 404 when not owner copy or key
  unset, before reading the body.

### C2. Visible side: sheet switch, wording, inbox label

- **Objective:** relatives' sheet gets the approved wording and switch;
  Bryce's inbox shows the family name.
- **May touch:** `src/components/FeedbackSheet.tsx`, `src/components/AppChrome.tsx`
  (one prop passed through), `src/app/(app)/layout.tsx` (one prop),
  `src/components/FeedbackRow.tsx`, `src/components/FeedbackDetailBody.tsx`.
- **Must not touch:** C1's files, `ToggleSwitch.tsx`.
- **Done:** with `forwardsToOwner` false the sheet renders exactly as today;
  with it true, the approved wording and an off `ToggleSwitch`.

## Log

- 2026-11-26: branch renamed and fast-forwarded to main f02b85b. Mock shown,
  Bryce approved wording. Contracts written.
- 2026-11-26: C1 and C2 built in parallel by Stark. Gauntlet locally: tsc 0,
  eslint 0, `npm test` 2330 pass, TZ=UTC 2320 pass 10 skipped, build OK.
- 2026-11-26: migration renamed to `20261126400000_feedback_source_family`
  because PR 4 and PR 5 already put `20261126200000_household_settings` and
  `20261126300000_ai_usage` on the shared dev branch; mine now sorts after
  both. Applied to the dev branch with `prisma migrate deploy` (one ADD
  COLUMN, reviewed).

## Adversarial proof (Fury, 2026-11-26, `next start` on the dev branch)

Owner server: `MARSHEE_OWNER_COPY=1` plus a 64 character test key generated
in the shell, never printed, deleted afterwards (grep of all server logs for
it: 0 hits). Second server as a relative's copy (flag unset, same key), then
as the owner copy with the key unset. Feedback row count read from the DB
after every request.

| Request | Status | Rows after |
|---|---|---|
| no Authorization | 401 | 0 |
| wrong key | 401 | 0 |
| key without "Bearer " | 401 | 0 |
| key with last character changed | 401 | 0 |
| 700 KB body with Content-Length | 413 | 0 |
| 700 KB body chunked (no Content-Length) | 413 | 0 |
| bad JSON | 400 | 0 |
| empty family name | 400 | 0 |
| relative's copy, right key | 404 | 0 |
| owner copy, key unset | 404 | 0 |
| GET | 405 | 0 |
| **positive control**, good request | 201 | 1, `sourceFamily` PR9-TEST |
| flood, 14 more from one family | 9 x 201 then 5 x 429 | 10 (the cap) |

Sender (`forwardFeedbackToOwner`, run directly): family capped gives false;
fresh gives true and the row holds the JPEG (`screenshotType image/jpeg`);
wrong key gives false; dead address gives false without throwing. The 30 per
hour total cap is covered by the unit test. All PR9-TEST rows deleted
afterwards (count back to 0).

Not proven end to end: a signed-in relative tapping Send in the browser and
the report arriving (needs a real copy with two Vercel projects). That is the
plan's dress rehearsal step before the first family.

## Gates

- Vision pass 1: **PASS** (re-ran gauntlet, re-probed: lowercase bearer 401,
  2-byte UTF-8 chunked 620 KB 413, Content-Length lie rejected by Node, NUL
  in names 500 with no row). Notes: invisible characters in names, preview
  deployments should be Production only, rate limit counts only rows still
  in the table.
- Strange pass 1: **PASS** with screenshots at 375, 820x1180, 1180x820,
  light and dark. Notes: icon wraps between lines at 375, switch live while
  sending, inbox subtitle wording, FAMILY_NAME should be written in full.
- Captain pass 1: **BLOCKED**: the route wrote `Feedback` itself and
  `feedbackInbox.ts` read it (one reader, one writer rule). Drafted the
  STRUCTURE.md amendments and `docs/structure/feedback.md`.
- Fix F1 (Stark): `feedbackWrites.ts` is now the only insert,
  `countForwardedFeedbackSince` lives in `feedbackRead.ts`, `KEY_MIN_LENGTH`
  and `FORWARDED_AUTHOR_ID` defined once, control and format characters
  stripped from names, NUL stripped from message and user agent, switch
  disabled while sending, icon kept on the first line. Gauntlet: tsc 0,
  eslint 0, `npm test` 2333 pass, TZ=UTC 2323 pass 10 skipped.
- Fury wrote Captain's STRUCTURE.md amendments and the new companion file,
  and the setup notes in `.avengers/status.md`.
- Vision pass 2 **PASS**, Strange pass 2 **PASS**, Captain pass 2 **PASS**.
- Update from main: PR 4 (#141) had merged, so the brief's rule applies:
  the family label now prefers `HouseholdSettings.familyName` (new reader
  `savedFamilyName()` in `householdSettingsRead.ts`, never throws) and
  falls back to `FAMILY_NAME`. Nothing saves a family name yet (PR 6's
  setup will). Read inside `after()`, so the family's save is unaffected.
- Vision pass 3 **PASS** (merge commit). Record check: 0 hard failures; the REVIEW lines are older mission files citing numbered STRUCTURE.md rules, none renumbered here.
