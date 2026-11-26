# Marshee soft launch: a private copy for each family

## Context

Bryce wants a few close relatives to use Marshee without him editing code for
them. Today the app assumes one family everywhere: there is no "family" in the
database, the login page lists every account, the first admin is created by a
terminal script, and stores, time zone and some wording are fixed in code.

**Decided with Bryce (2026-11-25):**

- **Each family gets its own private copy**: same code, but its own web
  address, its own database and its own secrets. Their data physically cannot
  mix with ours. No public sign-up page. This is not a one-way door: every copy
  uses the same data layout, so a shared app could import them later. A real
  product would be a ground-up rebuild anyway.
- Bryce prepares a copy in about 15 minutes from a runbook, then sends a link.
- **Short setup wizard**, then a "Finish setting up" checklist on the dashboard.
- **Lost password**: a recovery code shown at setup. Email reset comes later.
- **AI features are a paid upgrade** (about $8 a month) for other families,
  with a usage progress bar. They pay by a Stripe link and Bryce switches it on
  by hand. No payment code in the app.
- **Winnie, the Assistant API, Siri voice and Alexa stay Bryce's only.**
  Alexa stays parked: Skylight uses an old-style skill that also fails on
  Alexa+, and Amazon's new route is still partner-only.
- **Faith content stays as is.**
- **Own domain**, one name per family (for example smiths.marshandco.com).
- **Google Calendar sync is on** for other families, working the same way as
  ours (including Google's "Advanced, continue" warning), with a picture
  walkthrough for linking.
- **Feedback from other families forwards to Bryce's inbox**, labeled with the
  family name. The message always goes. The screenshot goes only if they tick
  "Share screenshot with Bryce", which starts unticked.

**One change to the wizard mock Bryce picked:** time zone is set by Bryce when
he prepares the copy, not asked in the wizard. Saved dates depend on it, so it
must be fixed before any data exists. Wizard step 1 is just the family name.

## How a copy is configured

Set by Bryce in that family's Vercel project (never in the app):

| Setting | What it does | If missing |
|---|---|---|
| `NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE` | Family's time zone | Denver |
| `MARSHEE_OWNER_COPY=1` | Only in Bryce's project. Turns on Winnie, voice, Alexa, unlimited AI, the feedback inbox for other families | Treated as a relative's copy |
| `SETUP_CODE` | One-time secret inside the setup link | Setup page does not exist |
| `AI_ALLOWANCE_CENTS` | Monthly AI allowance | 0, AI locked with an Upgrade button |
| `STRIPE_PAYMENT_LINK_URL` | Where Upgrade goes | No button |
| `FEEDBACK_FORWARD_URL` / `FEEDBACK_FORWARD_KEY` | Sends feedback text to Bryce's copy | Feedback stays local |
| Fresh per copy | `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY`, its own `ANTHROPIC_API_KEY` with a spend cap, Blob store | |
| Shared | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (each new address registered in Google) | Google sync hides itself |
| Never set | Winnie, Assistant, voice and Alexa settings | Those features stay off |

Saved in the app, in a new one-row table `HouseholdSettings` (same pattern as
`ScreensaverSettings`): family name, store list, setup finished time, recovery
code hash, checklist dismissed time.

## The builds (one PR each, one chat each, through `/avengers`)

Every PR is invisible on Bryce's live copy until configured. Migrations are
additive only.

**PR 0. Save this plan** as `.avengers/plans/family-copies-v1.md`, add one
status line to CLAUDE.md.

**PR 1. Safer link import.** Recipe link import (`src/lib/recipeUrlImport.ts:50-61`)
fetches any address. Add `src/lib/urlSafety.ts` (pure, tested: block private and
internal addresses, odd ports, logins in the URL) and `src/lib/safeFetch.ts`
(check every redirect, 3 hops, 2 MB cap). No sign-off needed.

**PR 2. Prove a brand-new database works, and make time zone a setting.**
- CI job that builds an empty Postgres from all migrations (never been done
  from zero; some migrations share a timestamp).
- `src/lib/constants.ts:342` reads `NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE`, default
  Denver. `prisma/migrate-on-production.mjs` fails the build on a bad zone name.
- Check `pullCalendars` and the crons on an empty database.

**PR 3. Owner flag and neutral wording.** Bryce sets `MARSHEE_OWNER_COPY=1` in
Vercel BEFORE this merges, or he loses Winnie until he does.
- New `src/lib/copyConfig.ts` with `isOwnerCopy()`. Gates `WinnieSettings`
  (`src/app/(app)/settings/page.tsx`), `sendWinnieTestEvent`, `/api/voice` and
  `/api/alexa` (404 in other copies), early return in the briefing cron.
- "ask Dad" (`src/app/actions/auth.ts:32`) becomes "ask an admin". Privacy page,
  manifest description and DESIGN.md's "one family" line get new wording.
- **Bryce signs off the wording.**

**PR 4. Family settings and "Pick your stores".**
- Migration: `HouseholdSettings`.
- `toStore(value, allowed)` in `constants.ts`, new `householdStores()` that
  returns the saved list or today's `STORES`. Pass it to the write sites in
  `src/lib/groceryWrites.ts` and to `GroceryList`, `GroceryItemEditSheet`,
  `StorePickerSheet`, `StoreSelect`. New stores screen in Settings.
- **Bryce signs off the screen (mock first).**

**PR 5. AI usage meter and Upgrade.**
- Migration: `AiUsage` (feature, model, tokens, cost).
- `src/lib/aiMeterPolicy.ts` (pure, tested: price table, month window, allow or
  block) and `src/lib/aiMeter.ts` (`meteredCreate` wraps all six Anthropic calls
  in `recipeExtract.ts`, `ingredientParse.ts`, `nutritionEstimate.ts`,
  `mealSuggest.ts`, `voice/parse.ts`).
- Blocked calls return a friendly "allowance used up" with an Upgrade link.
- `AiUsageCard.tsx` in Settings: progress bar, Upgrade button for admins.
- Bryce's copy records usage but never blocks, so we see real costs before
  fixing the price and allowance.
- **Bryce signs off wording and the allowance size.**

**PR 6. Setup link and recovery code.**
- New `/setup` page and `src/app/actions/setup.ts`; exact entry in
  `src/proxy.ts`. Works only while zero users exist and the code matches. The
  code rides in the link after a `#` so it never reaches server logs.
- One transaction creates the settings row, the first admin and the meal-slot
  tags. Rate limited by reusing `src/lib/loginRateLimit.ts`.
- Recovery code shown once, stored hashed (`src/lib/password.ts`). "Forgot
  password" view in `LoginForm.tsx`; using it issues a new code. Admins can
  regenerate it in Settings.
- Login page's "run a terminal script" message becomes "Open your setup link".
- **Bryce signs off the screens.**

**PR 7. Welcome steps, install help, checklist.**
- `/welcome` (signed in): add adults and kids by reusing `createPerson` and
  `CreatePersonSheet`, then `InstallHelp.tsx` (Add to Home Screen steps for
  iPhone and iPad), also at `/settings/install`. Manifest icons fixed.
- "Finish setting up" dashboard widget (`src/lib/dashboardLayout.ts`): pick
  stores, add pantry items, wall tablet, link Google Calendar.
- **Bryce signs off the screens.**

**PR 8. Google Calendar walkthrough.** A step-by-step picture guide before the
Google hand-off on `/settings/calendars`, including the warning screen and
"Advanced, continue". Needs Bryce's own Google link proven first.
**Bryce signs off the guide.**

**PR 9. Feedback forwarding.** Additive column `Feedback.sourceFamily`. Other
copies post the message to a new key-protected, rate-limited route on Bryce's
copy; his inbox shows the family name. The feedback sheet in other copies gets
a "Share screenshot with Bryce" switch, off by default, with a line reminding
them it shows whatever is on screen. The screenshot is sent only when it is on
(size capped, stored in Bryce's private Blob store like his own).
**Bryce signs off the switch wording.**

**PR 10. Runbook** `docs/new-family-copy.md`: Neon project, Vercel project
(production builds only), settings table above, Blob store, domain, Google
redirect address, deploy, confirm the "open your setup link" message, send the
link, delete `SETUP_CODE` afterwards. Includes a check step so a wrong
`DATABASE_URL` can never point one family at another's data.

## To check before the first family (not assumed)

- Vercel plan: Hobby is for non-commercial use; charging $8 may need Pro.
- Whether Google sign-in in "testing" mode expires links after 7 days.
- Current Claude Haiku prices for the cost table.
- Cron and Blob limits with several projects.

## How updates work afterwards

A merge to `main` rebuilds every copy, and each copy updates its own database.
If one copy's build fails, it keeps running the old version and the others are
unaffected. Bryce's design changes reach every family.

## Verification

- Every PR: Gauntlet green, `npm test` plus the direct `TZ=UTC` run from
  AGENTS.md, Vision gate, Strange gate for anything visible.
- After each merge: Bryce's production copy looks and behaves the same.
- Before inviting anyone: build one throwaway copy from the runbook and run it
  end to end in the browser (setup link, wizard, add a kid, stores, recovery
  code reset, AI blocked then switched on, feedback arrives in Bryce's inbox).
  Attack checks: setup with a wrong code, setup after a user exists, setup on
  Bryce's copy (must be 404), link import to an internal address.

## Working method

Per house rules: the planning chat stays put; each PR gets its own chat,
worktree and **its own branch cut fresh from `main`** (Bryce, 2026-11-25), named
`claude/family-copies-prN-<short-name>`. Each PR merges to `main` on its own,
so later PRs start from the merged earlier ones. Plan on Fable, build on Opus.
