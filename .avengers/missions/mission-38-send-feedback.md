# Mission: Send feedback (mission 38)

**Project:** family-hub (Marshee)
**Status:** INTERROGATING (mock and questions with Bryce)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/marshee-send-feedback-d53a21` (from origin/main af1708c)

## Brief

- **Goal:** anyone signed in can open a short form, report a bug or give
  feedback, and submit it. Admins read the submissions.
- **Done means:** (final wording after Bryce answers the questions below)
  a signed-in person taps "Send feedback" in the drawer, picks a type,
  writes a message, submits, and sees a thank-you; the page they came from
  is saved with it. An admin sees the list in Settings. Gauntlet green;
  Vision, Strange and Captain PASS.
- **Out of scope (proposed):** email or push notifications, screenshots or
  file uploads, replies back to the sender, Winnie access.

## Collision rules (from Bryce, 2026-11-06)

Two agents run in parallel: Habits & Chores hours (`claude/habits-hours`,
mission 37, migration 20261109000000) and the Winnie m22 sync.

- New model at the END of `prisma/schema.prisma`, own block, no existing
  model touched. That means **no Prisma relation to `User`** (a relation
  needs a back-field on `User`): store the author id plus a name snapshot.
- Migration folder dated after 20261110. Additive only. Show Bryce the SQL
  before applying to the dev branch.
- Do not edit `src/lib/habits*`, `src/lib/goals*`, `src/components/Habit*`,
  `Goal*`, `Plan*`, `src/app/api/assistant/`.
- The drawer link last, as one small change. **Correction:** the brief
  named `src/components/HubNav.tsx`, which does not exist. The drawer rows
  come from `src/lib/nav.ts` (`NAV_FOOTER_ITEMS`), drawn by
  `src/components/NavList.tsx`.
- STRUCTURE.md edited only right before merging, after syncing with main.
  CLAUDE.md: one "What's built" bullet and one Current status line.
- Every Server Action checks the session itself (`src/lib/dal.ts`).
- New test folder means its glob goes into package.json in the same commit.
- Stage by path. Merge after the habits-hours and Winnie PRs if still open:
  sync with main, rerun the gauntlet, then merge.

## Danger register

As mission 36: forbidden `db:seed`, `db:reset`, `migrate reset`,
`db push`, `migrate dev`; no script touches `User` rows; no `.env` edits;
stage by path. The migration is applied to dev only after Bryce sees the SQL.

## Gauntlet

tsc, `eslint .`, `npm test`, the direct UTC run from AGENTS.md, build,
recordcheck.

## Assembled

Stark + Vision; Strange (new screens); Captain (new model, page, action,
files). No Banner: the area is small and Fury read it inline.

## Open questions for Bryce

Mock shown 2026-11-06: drawer footer row, `/feedback` form (Bug / Idea /
Other chips, message box, removable "From: <page>" line, Send), a thank-you
screen ("Back to <page>", "Send another"), and an admin list at
`/settings/feedback` (New / Done chips, swipe to Mark done or Delete).
Fury's recommendations, waiting on Bryce:

1. Link spot: drawer footer under Settings (needs `nav.ts` plus a small
   `NavList.tsx` change to pass the current page as `?from=`).
2. Auto fields: who, when, device (phone or iPad, screen size).
3. Admin list: New/Done status plus one-tap delete; "N new" on the
   Settings row.
4. Wall tablet can send, labeled as the device.

**Bryce's own mock (2026-11-06) supersedes Fury's form:** a sheet titled
"Send feedback" over the current page; "Share bugs, ideas, or feedback.";
one message box, placeholder "What's on your mind?", counter "0 / 2000";
"Sent to admin only"; checkbox "Include screenshot of this page" (on by
default) with "Helps admin see what you're seeing. Shared with admin only.";
Cancel and Send (paper-plane icon). No type chips. Page comes from the
current path, since the sheet opens over it.

Fury's structural call: the screenshot is taken in the browser (DOM
redraw), shrunk to a JPEG of about 100 to 300 KB, and stored in the
Feedback row itself (no Blob storage, which costs money). Device and
screen size saved silently with each report.

**Bryce's answers (2026-11-06):**
- Link: drawer footer, but the drawer is crowded. Bryce open to moving
  Sign out, the name/role card and Profile into Settings. Fury's
  proposal (mock shown, waiting on yes): footer becomes Settings + Send
  feedback; Settings gets a "you" card at the top (tap for /profile) and
  Sign out at the bottom. No parallel branch touches `nav.ts`,
  `NavList.tsx`, `/settings` or `/profile` (checked by diff).
- After Send: the sheet closes and a short "Feedback sent" note shows.
- Admin list: Fury's recommendation (Settings row "Feedback (N new)",
  detail with message, page, device, screenshot; swipe Mark done / Delete).
  **Plus Bryce wants Winnie told about new feedback so she can text him.**
  That needs an Assistant API route, which this mission must not touch
  and m22 is editing: follow-up mission after m22 merges.
- Tablet: yes, it can send. **Bryce also wants the tablet to be its own
  limited login.** Today the tablet is signed in as Emily. The app already
  has a `device` role that hides things, but the "set up a tablet login"
  flow (Phase 4) was never built. Separate mission; logins are Bryce's
  call, not Hill's.

Smaller wording calls (thank-you text, placeholder, message length cap)
go to Hill unless Bryce wants them.

## Facts that shape the contracts (Banner, 2026-11-06)

- No shared Sheet wrapper: each sheet copies the chrome (`ActionSheet.tsx`
  37-49). Textarea sheet to copy: `VisionSheet.tsx`; Cancel + primary:
  `ConfirmSheet.tsx`.
- **No toast exists, and DESIGN.md 31-35 fails any fixed overlay with no
  reserved room.** So "sheet closes, Sent note" is built as: Send turns
  into a "Sent" confirmation inside the sheet, and the sheet closes itself
  about 1.2 seconds later (Fury's reading of Bryce's answer; Bryce can
  overturn).
- `SwipeActions` + `PantryRow` one-tap delete; `useOptimisticRun`. Delete
  waits for the server (DESIGN.md 95-101); Mark done is optimistic.
- Guard forms: submit (any signed-in login, devices too) uses
  `getVerifiedUser()` (STRUCTURE.md 98-113). Admin actions go in their own
  file with `requireRole("admin")`, allowed because their only UI sits
  behind a `requireRole("admin")` page (STRUCTURE.md 132-139).
- Homes: page `src/app/(app)/settings/feedback/page.tsx`; actions
  `src/app/actions/feedback.ts` + `feedbackAdmin.ts`; pure logic
  `src/lib/feedback.ts` + `feedback.test.ts` (already in the test glob);
  reader `src/lib/feedbackRead.ts` (`server-only`, the only Feedback reader).
  Caps: soft 350, hard 650 code lines.
- Name card and Sign out exist only in `NavList.tsx` (150-185). `logout`
  is `src/app/actions/auth.ts:91`. `nav.test.ts` asserts nothing about
  footer contents. `DrawerUser` has role, no `isDevice`.
- `next.config.ts:34` already allows 8mb action bodies. No screenshot
  library installed; add `html-to-image` (pinned, old version).
- The worktree has no `node_modules`: run `npm ci` once first.

## Contracts

Order: C1, then C2 and C3 in parallel (disjoint files), then C4 last.

### C1 - data layer (model already written by Fury)
- **Status:** PENDING
- **Objective:** pure feedback rules, the one reader, and the two action
  files, with tests.
- **Boundaries:** may touch: new `src/lib/feedback.ts`, new `src/lib/feedback.test.ts`,
  new `src/lib/feedbackRead.ts`, new `src/app/actions/feedback.ts`,
  new `src/app/actions/feedbackAdmin.ts` · must not touch: `prisma/schema.prisma`
  (read only: the Feedback model is final unless BLOCKED-ON-CONTRACT),
  `prisma/migrations/`, every existing model, habits/goals/plans/assistant
  files, the .env file, everything else.
- **Rules:** `feedback.ts` is import-free: `MESSAGE_MAX = 2000`;
  `normalizeMessage` (trim; empty is an error "Write a message first.";
  over 2000 is an error); `normalizePagePath` (must start with "/", no
  query string kept, max 200 chars, else "/"); `describeDevice(userAgent,
  viewport)` returning "iPhone", "iPad", "Android phone", "Computer" or
  "Unknown device" plus the viewport (iPadOS reports a Mac user agent:
  treat Macintosh with touch, sent as a flag, as iPad);
  `decodeScreenshot(dataUrl)` accepting only `data:image/jpeg;base64,`
  up to 400 KB decoded, else null (a bad screenshot never blocks the
  message). `sendFeedback(input)` in `feedback.ts` action: guard
  `getVerifiedUser()`, null means `{ ok: false, error }`; writes
  authorId, authorName (device logins keep their own display name),
  message, pagePath, userAgent (max 300), viewport, screenshot. Exact signature (C2 calls it): `sendFeedback(input: { message: string;
  pagePath: string; userAgent: string; viewport: string; touch: boolean;
  screenshot: string | null }): Promise<{ ok: true } | { ok: false;
  error: string }>`. `feedbackAdmin.ts`: `markFeedbackDone(id, done)`,
  `deleteFeedback(id)`, each `requireRole("admin")`, `revalidatePath`
  of `/settings/feedback` and `/settings`. `feedbackRead.ts`:
  `loadFeedbackList(status: "new" | "done")` (no screenshot bytes, a
  `hasScreenshot` boolean instead), `countNewFeedback()`,
  `loadFeedbackScreenshot(id)`.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, the
  UTC direct run from AGENTS.md: all green; new tests cover every rule above.
- **Evidence:** command output; test names; line counts.
- **Done criteria:** Vision re-runs; `grep -n "getVerifiedUser\|requireRole"`
  shows a guard at the top of every exported action.

### C2 - the Send feedback sheet (not wired to the drawer yet)
- **Status:** PENDING
- **Objective:** `FeedbackSheet` matching Bryce's mock, plus the screenshot capture.
- **Boundaries:** may touch: new `src/components/FeedbackSheet.tsx`,
  new `src/lib/captureScreenshot.ts` (client-only, no `db`), `package.json`
  and the lockfile via npm install (add `html-to-image`, exact version,
  nothing else) · must not touch: C1, C3 and C4 files.
- **Words (Bryce's mock, exact):** title "Send feedback"; "Share bugs,
  ideas, or feedback."; placeholder "What's on your mind?"; counter
  "N / 2000" (typing past 2000 is stopped by `maxLength`); "Sent to admin
  only" with a check-circle icon; checkbox "Include screenshot of this
  page" (camera icon, on by default) with "Helps admin see what you're
  seeing. Shared with admin only."; Cancel and Send (paper-plane icon).
  Empty Send shows the inline error, never a disabled button. Success:
  Send area shows "Sent" with a check, sheet closes itself after ~1.2 s.
  Failure: inline error naming a next step, message kept.
- **Screenshot:** taken when the sheet opens, of the page content
  element only (the app's `<main>`), cropped to what was on screen,
  longest side at most 1000 px, JPEG about quality 0.7. If capture fails
  or is slow (over 4 s), send without it, silently. Props:
  `open`, `pagePath`, `onClose`. Touch-first per DESIGN.md (48px targets,
  bottom sheet on phones, centered dialog wide, Escape and backdrop close).
- **Verification:** tsc, eslint, `npm test`, `npm run build` green.
- **Evidence:** output, the dependency line, line counts.

### C3 - admin Feedback list
- **Status:** PENDING
- **Objective:** `/settings/feedback` for admins plus the Settings row.
- **Boundaries:** may touch: new `src/app/(app)/settings/feedback/page.tsx`,
  new `src/components/FeedbackList.tsx`, new `src/components/FeedbackRow.tsx`,
  new `src/components/FeedbackDetailSheet.tsx`,
  new `src/app/api/feedback/[id]/screenshot/route.ts`,
  `src/app/(app)/settings/page.tsx` (only: an admin-only "Feedback" row
  under Manage family, same style, showing "N new" when N > 0) · must
  not touch: C1, C2 and C4 files.
- **Behaviour:** page `requireRole("admin")`, `BackLink` to Settings,
  heading "Feedback", `PageTabs` or chips New / Done; rows newest first:
  who, page, time ago, first two lines of the message, a small image icon
  if there's a screenshot. Tap opens the detail sheet (full message, page,
  device, time, screenshot image). Swipe: "Mark done" (or "Mark new" on
  Done) then "Delete" last. Empty states: "No new feedback" / "Nothing
  marked done yet". Screenshot route: admin session only, else 404;
  `Cache-Control: private, no-store`.
- **Verification:** tsc, eslint, `npm test`, build.

### C4 - (last) slim the drawer and wire the sheet
- **Status:** PENDING
- **Objective:** drawer footer becomes Settings + Send feedback; the
  name card and Sign out move to Settings; the sheet opens from the drawer.
- **Boundaries:** may touch: `src/lib/nav.ts`, `src/lib/nav.test.ts`,
  `src/components/NavList.tsx`, `src/components/NavDrawer.tsx`,
  `src/components/PinnedNav.tsx`, `src/components/AppChrome.tsx`,
  `src/app/(app)/settings/page.tsx`, `src/app/(app)/profile/page.tsx`,
  new `src/components/SettingsAccountCard.tsx`, and (added after the build,
  see note) `src/components/HamburgerButton.tsx` · must not touch: C1, C2
  and C3 files except as named.
- **Behaviour:** remove Profile from `NAV_FOOTER_ITEMS`; `/profile`
  lights Settings (`activeNavHref`, with a test). A "Send feedback" row
  (MessageCircle icon) is a button, not a link, in full drawer and
  compact rail; it closes the drawer and opens `FeedbackSheet` held in
  `AppChrome` with the current pathname. Settings top: a card with
  avatar, name and role; for accounts it links to `/profile` (chevron),
  for device logins it is plain. Sign out (the same `logout` form) at
  the bottom of Settings for everyone. `/profile` gets a `BackLink` to
  Settings.
- **Verification:** tsc, eslint, `npm test`, build.

**C4 boundary note (Fury):** Stark also edited `HamburgerButton.tsx`, which
the contract did not list. It passes `onSendFeedback` through to the rail's
inner drawer, so the prop chain needs it. Fury added it to the boundary
after the fact; Vision to judge.

**Status after build (2026-11-06):** C1 to C4 DONE. C1 255160c, C2 and
C3 committed, C4 below. Gauntlet per Stark: tsc, eslint, 990 tests, build
all green.

## Gate plan

After C4: Vision (all four), then Captain and Strange. Strange needs the
dev table, so the migration must be applied to dev (Bryce's yes) first.

## Handoff log

- 2026-11-06: mission opened as 38 (37 is habits hours). Mock and
  questions sent to Bryce. Next: record answers, write contracts.
