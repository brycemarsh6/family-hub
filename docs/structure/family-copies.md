# Family copies: household settings, setup and the checklist

Moved out of STRUCTURE.md in mission 94 (family copies PR 7) so the main file stays short.
Plan: `.avengers/plans/family-copies-v1.md`.

## Household settings and the store list (PR 4; PRs 6 and 7 add readers)

`HouseholdSettings` is one row (`id` "household"; a missing
row reads as defaults; `updatedById` is a plain id, like
`ScreensaverSettings`). `src/lib/householdSettingsRead.ts` (`server-only`,
no auth, callers check) is the only reader (it also holds `setupFinished`, `recoveryCodeHash`, `hasRecoveryCode`, `checklistDismissed`, `storesSaved`); a second `db.householdSettings`
read in `src/` is a BLOCKER, so later PRs add their readers there (the CI check `prisma/setup-attack-smoke.ts` reads the row directly on purpose, to verify the writes independently). Its writes live in
`src/lib/householdSettingsWrites.ts` (`server-only`, no auth, no
`revalidatePath`); a second `db.householdSettings` write in `src/` is a BLOCKER. `createFamilyAndFirstAdmin` there also creates the first `User` and the `MEAL_SLOTS` tags, by design: setup is one serializable transaction gated by the user count. It is the only write outside `tagWrites.ts` that makes a `Tag`. The store list rules are pure in `src/lib/storeList.ts`
and nowhere else: cleaning, `MAX_STORES` / `MAX_STORE_NAME`, "Other"
always last, the shopping filter words ("All", "Unassigned"),
`storeFilterOptions`, and the add, remove, rename and reorder helpers.
`STORES` is only the built-in default (read by `storeList.ts`,
`storeBreakdown`'s default and the Assistant schema until Winnie learns the
saved list). Every screen, write and check takes the list from
`householdStores()` and validates with `toStore(value, stores)`; offering
or validating against `STORES` anywhere else is a BLOCKER. A store rename
  moves grocery items in the same transaction as the list save.

## Setup words

`src/lib/setupVocabulary.ts` (no imports) holds every word of first-run setup, the recovery code screens and the Settings recovery card. Server refusal messages stay with their rule (`setupGate.ts`, `recoveryFlow.ts`). (Mission-91.)

## Welcome steps, install help and the setup checklist (PR 7, mission 94)

- **Landing after setup.** `/setup`'s Continue posts `after=/welcome` to `login`;
  `postLoginPath` in `src/lib/startPage.ts` honours exactly `/welcome` and nothing else
  (an open redirect is a BLOCKER). `/welcome` itself checks `requireRole("admin")`, so a
  non-admin is sent to `/`. `hidesMenu` in `src/lib/appChrome.ts` drops the menu there.
- **Words:** `src/lib/welcomeVocabulary.ts` (no imports) holds every word of the welcome
  steps, `InstallHelp`, the checklist card and the Settings install row.
- **Checklist rules are pure** in `src/lib/setupChecklist.ts`: the rows and their order,
  which are optional, the Google row left out when Google isn't configured, "all required
  done", and `showSetupChecklist` (admin only, a copy that finished setup, not dismissed,
  never the owner copy). `src/lib/setupChecklistRead.ts` (`server-only`) gathers the facts
  and returns null when the card must not show; it short-circuits before any read for a
  non-admin or the owner copy. The dismiss is family wide, stored as
  `HouseholdSettings.checklistDismissedAt`, written only by `dismissSetupChecklist`.
- **The card is not a dashboard widget.** `SetupChecklistCard` renders above the widget
  grid from `(home)/page.tsx`; it has no kind in `dashboardWidgets.ts`, so Customize never
  lists it. A new checklist row is a change to `setupChecklist.ts` (and its test) plus a fact
  in the reader, never a widget kind.
- **Install help** is one component, `src/components/InstallHelp.tsx`, used by welcome step 2
  and `/settings/install`. Its device default is a browser-only read through
  `useSyncExternalStore` (server snapshot: iPhone).
