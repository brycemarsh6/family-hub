# Calendar v1 — the plan

## Context

Bryce is ready to build the Calendar branch — the last placeholder on the
nav bar and, by his own earlier call, the hardest piece of the app. It is
modelled on **Skylight**, walked through screenshot by screenshot on
2026-09-02 (log at the bottom). What he asked for: color per profile,
Google sync, month/week/day views, parents and admin edit while kids can't,
meal plan shown on week/day views, filters (people / tags / meals), and AI
import via voice and photo. Email import was dropped mid-conversation.

**Status:** K0 (design) complete, 2026-09-02. Nothing below is built yet;
K1 is the first Avengers mission. Every phase is one mission, one PR,
gauntlet green, verified in a browser at 375px, additive migrations only.

## Decisions settled with Bryce — don't re-litigate

1. **Process: all screenshots first, one plan, then phase by phase.** The
   event schema serves every view plus Google's shape and can only be
   migrated additively — design it once.
2. **Reference app is Skylight**, adopted where it fits the house rules,
   adapted where it doesn't (details in the walkthrough log).
3. **Each parent links their own Google account(s); kids' events live only
   in Marshee.** Bryce links two (work + personal), so linking is rows
   under a `User`, many per user — never a field on `User`.
4. **Sync direction is per linked calendar**: work = **outbound only**
   (Emily can block time on it; its own appointments never enter
   Marshee); personal = **two-way**.
5. **Sync is chosen per event.** The form shows a "Sync to" toggle list of
   every linked calendar in the household; each ticked one gets a copy.
   **Default: the creator's own two-way calendars pre-ticked**;
   outbound-only calendars are never pre-ticked (pushing there is the
   deliberate act). Any parent may push to any linked calendar using its
   owner's token — household trust, stated plainly. **The creating
   account is always recorded** (`createdById`) and shown on the event
   ("Added by Emily").
6. **Email import is dropped, not deferred** (Bryce, 2026-09-02). It needed
   an inbound-email service, a public webhook with a sender allowlist,
   and a domain the app doesn't have. A screenshot of an email is a photo
   import; its text is a paste import. Don't queue it.
7. **Tags, not event types.** Bryce chose tags for cohesion with Recipes.
   Free-form, user-created, filterable. Calendar tags are their own table
   (`CalendarTag`), not rows in Recipes' `Tag`: the two vocabularies don't
   overlap ("Dessert" on an event, "Soccer" on a recipe), and Recipes'
   table carries the four meal-slot tags the meal-plan AI depends on. The
   *UI* is shared: `TagSelectSheet` is generalized to take its actions as
   props instead of importing the recipe ones.
8. **Opinionated defaults instead of Skylight's toggles.** Sunday start,
   dim past events, color bands for multi-person events — all fixed, no
   settings rows. One-line changes if real use disagrees.

## What the calendar reuses (found, not assumed)

- **Per-person color**: `User.avatarColor` + `avatarColorHex()`
  (`src/lib/constants.ts:307-326`); `AvatarBadge.tsx` (first initial on
  the swatch). Avatar colors are deliberately not job tokens (DESIGN.md).
- **Permissions**: inline `MANAGER_ROLES.includes(user.role)` in every
  write action (`src/app/actions/mealPlans.ts:80` is the model), never
  `requireRole` in an action (it redirects, `src/lib/dal.ts:118-131`).
- **"Today" and date math**: `src/lib/useToday.ts`,
  `src/lib/mealPlanDates.ts` (`startOfDay`, `addDays`, `sundayOf`,
  `isSameDay`, `formatWeekRange`, `formatDayLabel`). Vercel is UTC, the
  house is Mountain: every "which day" decision happens in the browser.
- **Meal overlay data**: `MealPlan` / `MealPlanEntry`; `todaysMeals()` in
  `src/lib/dashboard.ts:32` already resolves a day's four slots.
- **Import precedents**: `extractRecipeFromPhotos`
  (`src/lib/recipeExtract.ts:176`), the paste path, the voice pipeline
  (`src/lib/voice/parse.ts` → `applyActions`, `apply.ts:213`, everything
  logged to `VoiceChange`).
- **Attribution precedent**: `GroceryItem.addedById` (`schema.prisma:40`,
  `SetNull`).
- **Components**: `RadioSheet`, `ActionSheet`, `ConfirmSheet`,
  `FloatingAddButton` (`onClick` only), `RecipeActionCircles` (the
  round-icon-plus-label row), `TagSelectSheet` (currently hard-imports
  `actions/tags.ts:34-132`), `BackLink`, `Skeleton`, `EmptyState`,
  `QuantityStepper`, the `lastStore.ts` localStorage pattern.
- **Scripts convention**: `db:seed-events` / `db:clean-events`, refusing
  to delete what they didn't create.

## Greenfield, and the rules chosen for it

- **Recurrence = RRULE string, expanded in-house.** Skylight's picker is
  exactly Every N (Day/Week/Month/Year) + weekdays + until → `FREQ` /
  `INTERVAL` / `BYDAY` / `UNTIL`. `src/lib/recurrence.ts` expands those
  four shapes with unit tests; anything richer from Google is stored
  verbatim and shown as "Repeats (custom)", never dropped. No library.
- **Timezone**: timed events as UTC instants; one household constant
  `HOUSEHOLD_TIME_ZONE = "America/Denver"` in `constants.ts`; all-day
  events follow the `weekStart` precedent (browser-built local midnight,
  since `@db.Date` breaks the no-provider-specific rule). Display via
  `Intl.DateTimeFormat`.
- **OAuth + encrypted tokens** (K6) are the app's first reversible secret
  at rest: `TOKEN_ENCRYPTION_KEY` env var, AES-GCM via `node:crypto`.
  Opus-tier phase, adversarial check like `/api/voice`.

## Schema sketch (K1 unless marked; all additive)

- `CalendarEvent`: id, title, notes?, location?, `startAt`, `endAt`,
  `allDay`, `rrule?`, `exdates` (text, one ISO date per line, K4),
  `createdById` (→User, SetNull), timestamps.
- `CalendarEventPerson (eventId, userId)` — unique pair; ≥1 per event.
- `CalendarTag (id, name @unique)`, `CalendarEventTag (eventId, tagId)`.
- **K6**: `LinkedAccount (id, userId, email, encryptedRefreshToken, …)`;
  `LinkedCalendar (id, accountId, googleCalendarId, name, direction
  "outbound"|"twoWay", syncToken?)` — per Google *calendar*, since an
  account holds several; `CalendarEventSync (eventId, linkedCalendarId,
  googleEventId, etag, lastPushedAt)` — one row per target.
- **K7**: `CalendarEvent.sourceLinkedCalendarId?` for imported events.

## Phases

- **K1. Foundation.** Schema above (events, people, tags tables even if
  tag UI waits for K3 — one migration, one restart), `actions/calendar.ts`
  (create/update/delete, manager-gated), `src/lib/calendarDates.ts`
  (range formatting, week/day math, tests), **Week + Day views** as one
  `DaySection` component, `EventCard` with color bands and avatars,
  detail sheet, `/calendar/new` + `/calendar/[id]/edit` pages sharing
  one `EventForm` (native date/time inputs, people picker), header row
  via the action-circle pattern, `RadioSheet` view switcher, arrows,
  `FloatingAddButton` → `ActionSheet` (Event / Meal). Kid role sees no
  Edit/⋯. Seed/clean scripts. `(app)/calendar/loading.tsx` with
  measured heights.
- **K2. Month view.** Six-week grid, spanning bars with lane assignment,
  three-pill cap + "+N more", day tap → Day view.
- **K3. Filters, tags, meals.** Filter sheet (people toggles, tag
  toggles, Show meals), persisted per device via the `lastStore` pattern;
  `TagSelectSheet` generalized and used on the event form; the meals card
  per day (week/day only) reading `MealPlanEntry`.
- **K4. Recurrence UI.** Repeats section (stepper + chips + until),
  expansion in views, "This event / All events" on edit and delete.
- **K5. AI import.** `src/lib/calendarExtract.ts` (Haiku, structured
  outputs, index-grounded dates) for paste and photo → each candidate
  lands in `EventForm`; voice verb `event` with its own parse schema,
  undo deletes what it created.
- **K6. Google: link + outbound.** Settings → Synced Calendars, OAuth,
  encrypted tokens, per-calendar direction, push/update/delete. **Step
  one is the feasibility gate**: link the work account before building
  further (Workspace may block unverified apps).
- **K7. Google: inbound.** syncToken pull for two-way calendars,
  sync-on-open + manual refresh, imported events colored by the account
  owner, last-write-wins recorded.

## Hazards to verify at build time

- Google "Testing" consent screens expire refresh tokens after 7 days;
  publishing with the unverified-app warning is the likely route (K6).
- Vercel Hobby cron is daily → sync-on-open, not a scheduler (K7).
- Initials collide in this family (E/E, L/L). Cards rely on color;
  the detail sheet shows names. Same as Skylight; stated so nobody
  "fixes" it into two-letter initials without asking.

## Verification

Per phase: `tsc`, `eslint`, `npm test`, `npm run build`; real interaction
in a browser at 375px (the dashboard's crushed-icon lesson); a kid-role
session confirming read-only; counts of every other table unchanged
before/after (seed/clean scripts only). K1 additionally: the real Nov 1
2026 DST week renders seven consecutive dates in Week view, and an event
created at 9 PM Mountain lands on the right day after a reload.

---

## K0 walkthrough log (Skylight screenshots, adopt / adapt / skip)

### 1 — Month view
Sunday grid, six tall scrolling rows, adjacent-month days shown with
their events, today as a filled circle, colored pills with truncated
titles (three per day), split-color pills for multi-person events,
multi-day bars across cells, faded past events, "+" bottom-right, header
row of round icon buttons (Today / Month / Filter / Search).
**Adopt**: grid, reading-view pills, spanning bars, faded past, disabled
Today when in view, many-people-per-event. **Adapt**: header → the
action-circle pattern; switcher → `RadioSheet`; paging → visible arrows
(swipe-only is hover-only's cousin); "+" → `FloatingAddButton`
bottom-left (one component, one place); house typography; bottom nav
stays; three pills then "+N more". **Skip**: Search for v1.

### 2 — Week view
Agenda list grouped by day, not a time grid: gutter with weekday + number
(today circled, coral edge bar), "No events" card, full-width event cards
with title / time range / one avatar per person, diagonal color bands per
person, faded past. **Adopt**: the list (a seven-column grid is unreadable
at 375px; meals become one more card per day), `DaySection` reused by
Week and Day, bands on cards, month pills capped at three bands, time
formatting like "8 – 9 PM". **Adapt**: `AvatarBadge` for initials; the
edge bar uses the accent token.

### Day view — no screenshot, designed here
Same `DaySection` for one day, room spent on full titles, location, a
notes line, and the meals card with all four slots. Not a timeline.

### 4 — "+" menu, Add Event, pickers, Repeats
Fan-out: Dinner plan / Event. Add Event is a page: Title, All day,
Starts+From / Ends+Until boxes (default next whole hour, one hour),
Repeats, Countdown, multi-select profile circles, sticky Add. Inline
month popover and time wheel. Repeats: Every [1] Day/Week/Month/Year,
Su–Sa, Repeats until. No location, notes, type, reminders, or sync-to.
**Adopt**: the recurrence model exactly (→ RRULE), people multi-select
(creator pre-selected, ≥1 required), the defaults, fan-out → `ActionSheet`
(Event / Meal). **Adapt**: page not sheet (`RecipeForm` precedent);
native date/time inputs (the OS wheel for free; "Expires on" precedent);
Every [N] → `QuantityStepper`; Marshee adds Location, Notes, Tags, Sync
to (shown only once a calendar is linked). **Skip**: Countdown, "+ Add"
profile, reminders.

### 5 — Event detail
Bottom sheet: title, ⋯, "Wednesday, Sep 2, 6 – 7 PM", tinted person chips
with names, Edit Event; source card outlined. **Adopt** as the house
sheet; names here resolve the initials collision. **Adapt**: ⋯ →
`ActionSheet` Delete (single tap; recurring asks This/All); kids see no
⋯/Edit; adds tags, location, notes, "Added by", "Synced to".

### 6 — Filter
Rows per profile (avatar, name, pencil, toggle) then rows per **tag**
(Bryce: the email-looking rows were tags he made by accident), each with
a color and toggle, state persisted. **Adopt**: two axes, people + tags,
plus Marshee's Show meals; untagged events always show; per-device
persistence via the `lastStore` pattern (tablet shows everyone, a phone
can show just you). **Adapt**: sheet, not page; tags are text chips with
no color of their own — color belongs to people, and two color systems on
one card is noise. **Skip**: pencil and Add a Profile (Manage Family).

### Settings pages
Synced Calendars entry; Calendar settings (Sunday start, Shade Weekends,
Dim Past, Color Code Multi-Profile, one household "sync back to"
default); Notifications. **Adopt**: linked accounts live in Settings;
the behaviors as fixed defaults. **Adapt**: sync default is per creator
(decision 5). **Skip**: Shade Weekends, theme, notifications (no push
channel; revisit with Chores), Activity, Invite/Transfer, Magic Import
address, Alexa.

### 7 — Synced Calendars
Linked accounts + shared "Family" calendar on top; "Calendars on your
phone" (holidays, **Terros** = work, iOS Home) below; Sync New Calendar.
**Adopt**: the page shape, linked rows expanding to per-calendar
direction + Unlink. **Adapt**: Marshee can't read the phone's calendar
store; it links Google server-side and lists that account's calendars.
**Skip**: device/iCloud calendars.

### Magic Import — designed by Marshee (K5)
Photo or pasted text → extractor → candidates land in `EventForm` →
Save. Voice → one event, read back, undo deletes it.
