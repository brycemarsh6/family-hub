# Mission: Tablet login (mission 39)

**Project:** family-hub (Marshee)
**Status:** INTERROGATED (research done, mock shown, Bryce's answers recorded; no contracts dispatched, nothing built)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch (planning only):** `claude/nice-visvesvaraya-ff9197` (from origin/main 812b537). The build gets its own branch.

## Brief

- **Goal:** the kitchen wall tablet signs in as its own "Tablet" login
  (role `device`) instead of as Emily. Today anyone at the tablet can change
  Emily's name, colour, password, dashboard layout, goals and vision board,
  and every tablet action is recorded as hers. The `device` role was designed
  for this in the family-accounts plan ("Phase 4 Device mode") and about 60
  places in the code already behave differently for `user.isDevice`, but
  nothing can create a device login yet.
- **Done means:** an admin creates the Tablet login from Settings, Manage
  family; the "Tablet" chip appears last on the login page with a Tablet
  icon; the tablet signs in with its own password and gets the 365-day
  session; from the tablet, a self-service action (rename, password), a goal
  edit or Customize is refused, while checking a habit for anyone, putting
  groceries away, setting meals, importing a recipe and checking off any task
  all work; Sign out on the tablet asks for an admin password first. Gauntlet
  green; Vision, Strange and Captain PASS; Bryce has signed the real tablet in.
- **Out of scope:** a tap-your-name actor picker on the tablet (the
  family-accounts plan defers it to Chores); more than one device login;
  kiosk or screen-lock features; any change to what kids can do; voice
  tokens; the Assistant API (`src/app/api/assistant/` untouched).

## Danger register

As mission 36. No migration: the `device` role and the 365-day session are
already in the schema and `session.ts`. Forbidden: `db:seed`, `db:reset`,
`migrate reset`, `db push`, `migrate dev`; no script touches `User` rows
(this mission creates one User row through a Server Action, from the UI, on
the dev branch first); no `.env` edits; stage by path. Mission 38 added the
`Feedback` table to the shared dev database (migration
`20261111000000_add_feedback`); `prisma migrate status` on a branch without
that folder says a migration is "not found locally", which is expected and
is never fixed with `migrate reset`, `db push` or `migrate dev`. If this
mission ever needs a migration (none planned), date it after 20261111000000. The real tablet's
sign-in and its password are Bryce's, never an agent's.

**Collision rules while missions 37 and 38 are open:** do not edit
`src/lib/nav.ts`, `src/components/NavList.tsx`,
`src/app/(app)/settings/page.tsx`, `src/app/(app)/profile/`, any habits,
goals or plans file, or `src/app/api/assistant/`. Contract C4 (Sign out asks
for an admin password) touches whichever file owns the Sign out row after
mission 38 merges, so it waits for that merge.

## Gauntlet

tsc, `eslint .`, `npm test`, the UTC direct run
(`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`),
`npm run build`, recordcheck. C3 adds a `completeTask` test for the device
actor.

## Assembled

- Stark + Vision (always).
- Strange: a new sheet, a new login chip, a new password sheet.
- Captain: one new component file and a change to the people-management
  actions file, which is already near its size cap (`users.ts` header says it
  was over 350 lines before `usersRoles.ts` was split out).
- Banner: not needed; the research below was done inline (the code is small
  and well commented).
- Hill: **not consulted.** Logins are Bryce's call (CLAUDE.md, "Hill never
  decides logins"). Bryce answered the four questions himself (below).

## Research facts (2026-11-06, origin/main 812b537)

### What exists

- Role axis: `ROLES = ["admin","parent","kid","device"]`, `src/lib/constants.ts:236`.
  `ASSIGNABLE_ROLES` drops `device` (`:270`); its comment names the never-built
  "Phase 4 flow" (`:261-269`). `ROLE_LABELS.device = "Device"` (`:257`).
- Why a role and not a flag: `prisma/schema.prisma:482-489` (a flag pointing
  at a person "would make every tablet-originated change lie about who acted").
- Session: a device-role login gets a 365-day cookie instead of 30
  (`src/lib/session.ts:21-25,99`). `isDevice` comes from `role === "device"`
  in the DAL (`src/lib/dal.ts:75`).
- Login page lists every active user with a `passwordHash`, ordered by
  `createdAt` (`src/app/(app)/login/page.tsx:51-55`), drawn by
  `LoginForm.tsx:30-46` as chips with `AvatarBadge`. A device user with a
  password would appear as a chip today, in creation order, with an initial.
  The plan asked for "device chip last" (`.avengers/plans/family-accounts-v1.md:116`).
- `createPerson` refuses non-assignable roles (`src/app/actions/users.ts:84-87`)
  and already skips joining Everyone habits for a device (`:102`, `:203`).
  `setRole` refuses a device target the same way (`usersRoles.ts:37-38,78`).
  `prisma/bootstrap-users.ts:94` excludes device. **No creation path exists.**
- "Household people" rule excludes device logins from habit participants and
  vision boards: `src/lib/householdPeople.ts:12`, STRUCTURE.md:433.
- Manage family lists every User row through `PERSON_SELECT`
  (`settings/family/page.tsx:27`, `FamilyList.tsx:16-18` sorts), so a device
  row will show with the label "Device". `PersonManageSheet.tsx:256-272`
  offers Rename, Change role (over `ASSIGNABLE_ROLES`), Reset password,
  Upgrade profile, Deactivate.
- Sheets are the house dialog (DESIGN.md:143). `CreatePersonSheet.tsx` is the
  pattern for a create sheet (name, role, optional password, confirm).

### What a device login can do today (any-signed-in actions)

- Groceries: add, check off, delete (undo a mistake), put away. Inventory
  +/- and edits (delete and merge are manager-only, `pantry.ts:207`).
- Recipes: create and all four imports, including the AI ones that spend
  money. Edit, delete, share, cookbooks and tags are manager-only.
- Meal plan: set and clear slots (`mealPlans.ts:76` gates only delete-plan).
- Habits: check for **anyone** (`src/lib/habits/access.ts:65`), stats of
  non-private habits (`:74`), Whole family view forced (`habits/page.tsx:23`),
  streaks always on (`:57,72`).
- Calendar, tasks, Plans & Goals: read only (goals: non-private only,
  `goals.ts:117`).

### What it is refused today (already coded)

- Self-service name, colour, password: `account.ts:48,83,102`.
- Dashboard Customize and Show streaks: `preferences.ts:32,89`; default layout
  minus Habits and Chores tiles (`dashboardPicks.ts:26-29`, decision 138;
  `(home)/page.tsx:70-91`).
- Habits new, edit, manage, chart, report pages redirect; actions refuse
  (`habits.ts:180,287`, `choreChart.ts:41,81`, `vacations.ts:32,51`).
- Goals, plan items, visions: `goals.ts:70,82,235`, `planItems.ts:73,100`,
  `visions.ts:44`; `plans/goals/new` redirects. Profile redirects
  (`profile/page.tsx:17`). Settings hides vacations (`settings/page.tsx:23,44`).
- Tasks: `completeTask` needs a manager role or a `TaskPerson` row
  (`tasks.ts:271-281`); a device is never assigned, so **the tablet cannot
  check off a task today.** Bryce wants it to (decision 3 below).
- Sign out is a plain drawer row for every login (`nav.ts:20`, `auth.ts:91`).
  Nothing stops a kid signing the tablet out. Mission 38 is moving that row.

### Gaps this mission fills

1. A way to create a device user (admin only).
2. The login chip for it, placed last with an icon.
3. `completeTask` for the device actor.
4. Sign out that asks for an admin password on the tablet.
5. Manage family: hide Change role and Upgrade profile for a device row.

## Mock (text; Bryce has seen it)

Settings, Manage family, admin only. The Tablet row sits last in the list:

```
Tablet                                            Device · account
  > Rename   > Reset password   > Deactivate
  (no Change role, no Upgrade profile)

[ + Set up a tablet login ]
```

"Set up a tablet login" sheet (house bottom sheet, same bones as Add a person):

```
Set up a tablet login
Name              [ Tablet                  ]
Tablet password   [ ••••••••                ]
Confirm           [ ••••••••                ]
The tablet can check off habits, groceries, meals
and tasks for anyone, and add recipes. It can't
change people, goals, settings or its own name.
                                       [ Create ]
```

Login page: the "Tablet" chip last, with the Lucide `Tablet` icon in place of
an initial. On the tablet, the drawer name card reads "Tablet, Device".
Tapping Sign out opens a sheet:

```
Sign the tablet out?
Admin password    [ ••••••••                ]
                            [ Cancel ] [ Sign out ]
```

## Decisions by Bryce (2026-11-06, answered in the planning session)

1. **Name: "Tablet".** (Fury's default was "Kitchen tablet"; overturned.)
2. **Sign-in: a password chip** on the login page, last in the list, with its
   own password. Reuses `login` in `auth.ts`; the 365-day cookie is already
   coded. Not an admin "sign this device in" button, not a one-time code.
3. **The tablet may do all four:** check off any task (new rule:
   `completeTask` treats `device` like a manager, `tasks.ts:275`), add or
   import recipes including AI (stays), set the week's meals (stays), check
   habits for anyone (stays).
4. **Sign out stays visible on the tablet but asks for an admin password
   first.** New server action: take a password, check it against every active
   admin's hash (`verifyPassword`, `src/lib/password.ts`), count attempts in
   the login rate limit (`loginRateLimit.ts`), then `logout`.

### Round 2 (2026-11-06, Bryce widened the tablet: "pretty much fully capable")

Bryce's default for the tablet: **everything except seeing private goals and
deleting calendar events.** One rule protects the parents' own things.

5. **Own dashboard.** The tablet gets the Customize button like everyone
   else and its layout is saved on the Tablet login. Habits and Chores tiles
   become available on it. **Overturns decision 138** (`dashboardPicks.ts:26-29`
   and `preferences.ts:32` refuse the device today).
6. **Calendar: create and edit any event, delete none.** Today all three
   calendar writes are manager-only (`calendar.ts:144,184,245`). Tasks follow
   the same rule (create, edit, complete; no delete) unless a build-time
   question says otherwise.
7. **Habits, chores, routines and goals: the tablet may create them for
   anyone and check off anyone's.** Today the tablet is refused every create
   and edit (see "What it is refused today").
8. **The parent rule, judged by who made it.** The tablet may edit and delete
   anything a parent did not create (`createdById` is not an admin or parent:
   made on the tablet, by a kid, or by nobody). Anything a parent created,
   even for a kid, the tablet may only check off: no edit, no delete. Every
   model already records its creator (`Habit.createdById`, `Goal.createdById`,
   `CalendarEvent.createdById`, `Task.createdById`), so **no migration.**
   Bryce's example: Emily makes a chore for Ledger, the tablet can check it
   off but not delete it.
9. **Private goals and private habits stay hidden from the tablet** (already
   true: `goals.ts:95-98` `canSee`, `habits/access.ts` `canSeeHabit`).
11. **Everything shows on the tablet except what is marked private**
   (Bryce, 2026-11-06, round 4; this **replaces** round 3's "only Together
   goals", which Bryce withdrew because Emily will use the tablet to check
   off her own habits, chores and goals). Mine and Together goals, every
   person's habits and chores, and every vision board all show; a private
   habit or goal never does. This is today's behaviour (`goals.ts:95-98`,
   `countsInScope` keeps all for a device at `:116-118`, `visionsRead.ts:45`),
   so no change is needed for it. The tablet may create Mine goals for anyone.
12. **"Habits and chores" quick-link tiles on the dashboard** (Bryce, round 4).
   One small tile per household person ("Emily's habits and chores",
   "Bryce's ...", "Ledger's ...", "Eleanor's ...", "Lucy's ..."). In
   Customize, each person's tile is its own entry that can be shown or hidden,
   so a dashboard can carry none, one, two or all of them. Tapping one opens
   Habits & Chores on that person's list, ready to check things off. Available
   on everyone's dashboard, the tablet's included. Names come from the
   household-people list (`householdPeople.ts`), never typed in, so a new kid
   gets a tile automatically and the Tablet never gets one. See the mock in
   C8.
10. **A per-login permissions page is a later mission**, after Calendar is
   finished: switches such as "the Tablet may delete Emily's events but not
   Bryce's". Mission 39 ships the defaults above as fixed rules, each written
   as one named check (a single `tabletMay...` helper per rule, in one file)
   so the later page can turn each into a switch without hunting.

**Decision 3 is narrowed by 8:** "check habits for anyone" stays; the tablet
also may now create, edit and delete within the parent rule.

Fury's recommendations, recorded; Bryce can overturn any:

- The Tablet row in Manage family offers Rename, Reset password and
  Deactivate, never Change role or Upgrade profile.
- At most one active device login (the create button hides once one exists);
  a second tablet is a later decision.
- "Parent" in decision 8 means role admin or parent at the time of the check,
  read fresh from the creator's row (a deactivated parent still counts as a
  parent, so their things stay protected).
- Round 2 is too big for one PR. Split: **PR A** = C1 to C4 (the login
  itself, so Emily's account comes off the tablet quickly); **PR B** = the
  wider rights (C5 to C7); **PR C** = the quick-link tiles (C8). PR B waits for missions 37 and 38 to merge and
  must re-read the habits and calendar files then.

## Contracts (sketch; written in full when the build starts)

### C1 — Create the tablet login from Manage family
- **Boundaries:** may touch `src/app/actions/users.ts` (new
  `createDeviceLogin`, admin only, refuses if an active device exists),
  `src/components/FamilyList.tsx` (button), new
  `src/components/CreateDeviceSheet.tsx`, `src/components/PersonManageSheet.tsx`
  (hide Change role and Upgrade profile when `person.role === "device"`),
  `src/lib/constants.ts` (a `DEVICE_DISPLAY_NAME_DEFAULT = "Tablet"` only if
  the sheet needs a shared default). Must not touch schema, `nav.ts`,
  `NavList.tsx`, `settings/page.tsx`, `profile/`.
- **Verification:** tsc, eslint, `npm test`; on dev, create the Tablet, see it
  listed last; a kid cookie against `createDeviceLogin` is refused; a second
  create is refused.

### C2 — Login chip last, with a Tablet icon
- **Boundaries:** `src/app/(app)/login/page.tsx` (sort device last),
  `src/app/(app)/login/LoginForm.tsx` (icon in place of `AvatarBadge` for
  role `device`). Must not touch `auth.ts`, `session.ts`.
- **Verification:** sign in as Tablet on dev; decoded cookie expiry about 365
  days; a refused action from the tablet returns its existing device message.

### C3 — The tablet can check off any task
- **Boundaries:** `src/app/actions/tasks.ts` (`assertCanCompleteTask` lets
  `device` through, the way `canLogFor` does in `habits/access.ts:65`) and
  its test file. Note `uncompleteTask` stays manager-only unless Bryce says
  otherwise.
- **Verification:** new test; the gauntlet count rises by it.

### C4 — Sign out asks for an admin password on the tablet
- **Waits for mission 38 to merge.** Mission 38 moved Sign out and the name
  card from the drawer into Settings (`src/app/(app)/settings/page.tsx`), so
  that is the file C4 will touch, after the merge. Other boundaries:
  `auth.ts` (new `logoutWithAdminPassword`) and a new
  `src/components/AdminPasswordSheet.tsx`.
- **Verification:** wrong password refused and counted by the rate limit;
  right password signs out; a person login still signs out with one tap.

### C5 — The tablet's own dashboard (PR B)
- `preferences.ts` (`saveDashboardLayout` allows device; Show streaks stays
  refused), `dashboardPicks.ts` (drop the device filter), `(home)/page.tsx`
  (read the tablet's saved layout, show Customize). Decision 138 retired in
  DESIGN.md/STRUCTURE.md wherever it is named.

### C6 — Calendar and tasks: create and edit, no delete (PR B)
- `calendar.ts` and `tasks.ts`: create and update let `device` through;
  delete stays manager-only. Read `.avengers/plans/calendar-v2.md` first.

### C7 — Habits, chores and goals for the tablet, with the parent rule (PR B)
- One new home for the rule (for example `src/lib/tabletRules.ts`:
  `tabletMayChange(createdByRole)`), called by `habits/access.ts`,
  `goals.ts`, `actions/habits.ts`, `actions/goals.ts`, `actions/planItems.ts`,
  `choreChart.ts`; the page redirects in `habits/new`, `habits/[id]/edit`,
  `habits/manage`, `habits/chart`, `plans/goals/new` lifted for the tablet.
  Tests: a tablet edit and delete of a kid-made habit pass; of a parent-made
  habit are refused; a private goal stays invisible.
- Captain decides whether the rule file sits beside `habits/access.ts`.

### C8 — Per-person "habits and chores" quick-link tiles (PR C, decision 12)
- Mock (a small tile, half the height of the Inventory tile; two side by
  side on a phone, more across on the iPad):

```
+------------------------+  +------------------------+
| (E) Emily's            |  | (L) Ledger's           |
|     habits and chores >|  |     habits and chores >|
|     3 left today       |  |     All done           |
+------------------------+  +------------------------+
```

  The circle is the person's avatar colour and initial. "3 left today" is a
  Fury suggestion for Hill or Bryce to confirm at build time (the tile can be
  a plain link if the count costs too much).
- Where it leads: on someone's own phone, their own tile opens their Today;
  anyone else's opens Whole family with that person's chip picked (the chips
  exist, decision 95; `habits/page.tsx:23` forces Whole family on the tablet).
  Needs a `person` link parameter the family view reads.
- Likely files: the dashboard widget registry and layout parser
  (`src/lib/dashboard*.ts`), `DashboardWidgetList.tsx` / Customize sheet, a new
  tile component, `habits/page.tsx` and the family view (after mission 37
  merges). Widget ids per person must survive a person being deactivated
  (drop the tile silently, the `keepOwnPicks` precedent).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | not started | — | — |

## Handoff log

- 2026-11-06 — Planning session (started by the mission-38 session). Found
  mission numbers 37 and 38 taken across all worktrees and remote branches;
  took 39. Researched the device role inline; mock and four questions put to
  Bryce; answers recorded above. No code changed. Next: a build session
  starts from main after missions 37 and 38 merge, opens its own branch,
  writes C1 to C3 in full, dispatches Stark.
- 2026-11-06 — Round 2: Bryce widened the tablet (own dashboard, calendar
  create and edit, habits/chores/goals for anyone, the parent rule by
  creator, permissions page later). Decisions 5 to 10 recorded; C5 to C7
  sketched for a second PR.
- 2026-11-06 — Round 3: Bryce limits goals on the tablet to Together only
  (decision 11); tablet-made goals are Together. Mine vision boards open.
- 2026-11-06 — Round 4: Bryce withdrew round 3. Everything shows on the
  tablet except private (decision 11 rewritten). New: per-person habits and
  chores quick-link tiles on every dashboard (decision 12, C8, PR C).

## Delivery

- **Shipped:** nothing yet (planning only).
- **Shipped check:** this file's commit on `claude/nice-visvesvaraya-ff9197`,
  pushed; see the handoff log.
- **Deliberate leftovers:** the tap-your-name actor picker; a second tablet;
  whether Winnie should ever act as the tablet (no, by the Assistant API plan).
