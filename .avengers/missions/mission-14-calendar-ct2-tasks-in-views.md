# Mission: CT2 — Tasks in every view, the detail sheet, and mark-complete

**Project:** family-hub (Marshee)
**Status:** DELIVERED
**Started:** 2026-09-04 · **Updated:** 2026-09-04

## Why this mission, and why now

CT1 built Tasks end to end — schema, guarded actions, a form, and a place
in the "+" sheet — but **a task saves and then appears nowhere**. That was
deliberate ("the destination exists before the trigger"), and CT2 is the
phase that closes it.

**It is also now the gate on shipping the whole calendar.** Bryce's
decision, 2026-09-04: the four stacked PRs (#9 → #10 → #11 → #12) merge
as **one complete release after CT2**, so nothing half-visible reaches
the family. He was offered "merge now" (Fury's recommendation) and "hold
until Google sync" (his own first instinct, which would have held
everything until K6/K7 — the far end of the roadmap, gated on a Google
Cloud account only he can create) and chose the middle deliberately.
So: **CT2 is the last mission before the calendar goes live.**

## Brief

- **Goal:** Tasks render everywhere events do, can be opened, and can be
  marked complete — including by a kid, on their own task.
- **Done means** — each observable:
  1. A task created through the form **appears** in the calendar views.
  2. Tapping it opens a detail sheet with title, details, people, due
     date, Mark complete / Mark not complete, Edit and Delete.
  3. A **kid** can complete a task they are assigned to, and cannot
     complete another's or edit anything — proven by attacking the action
     directly with a minted cookie, Phase-1e style, positive control first.
  4. A completed task reads as *done*, distinctly from an event that has
     merely *already happened*.
  5. Gauntlet green in all three timezones; database back to exact
     baseline.
- **Out of scope:** the Schedule view (CV3), the hour timeline (CV4),
  Month text pills / Year (CV5), recurrence UI (K4), Google sync (K6/K7).
  CT2 renders tasks in the views that **exist today**.

## Danger register (absolute)

- **`npm run db:seed` / `npm run db:reset` forbidden.** Scoped
  `db:seed-tasks` / `db:clean-tasks` only — and note CT1 gave those a
  **sentinel** discriminator, so they now genuinely refuse rows they did
  not create.
- **No committed script may create, update or delete `User` rows.**
- **Never a Neon branch reset** — that is Bryce's console action.
- **The migration file `20260904144140_…` must not be edited.** Its
  checksum is patched in `_prisma_migrations` on dev; any edit reintroduces
  drift. It is also **unmerged**, so production applies it fresh.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`. **`CalendarEvent`
  must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles and counts, never
  names or titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm run build`
- `npm test` (pins `TZ=America/Denver` internally)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`

CI now runs all three legs (CT1/C5). If a new test directory appears, its
glob entry ships in the **same commit** — the glob is hand-enumerated in
**three** places now (`package.json` plus two CI steps), which is worse
than the one AGENTS.md warns about.

## Standing constraints inherited from CT1

- **`CalendarViews.tsx` is at 348/350.** Captain's ruling stands as a
  written trigger: *the next mission that must add a line to that file
  performs the `ViewConfig` → `src/lib/calendarViewConfig.ts` extraction
  first, whether or not it is CV3.* C4b spent the one duplication that was
  available to pay for a line; there is nothing left to spend.
- **`line-through` is permitted for a completed task and only there.**
  DESIGN.md forbids it for past events because "already happened" ≠
  "done". The distinction must be stated in code, not just obeyed.
- **A third guard form (membership) exists but is NOT yet in STRUCTURE.md**
  — Captain drafted the amendment; Bryce has not approved it. Do not
  self-authorize; follow the pattern, don't document it.
- `parseLocalDateString` lives in `EventDateTimeFields.tsx`. Captain's
  trip condition: **a third consumer, or any consumer outside
  `src/components/`, makes moving it to `src/lib/` mandatory.**
- Two app-wide notes deliberately uncharged: form text at 4.33:1, and the
  calendar-shaped loading skeleton on form routes. Re-flag only if made
  worse.

## Assembled

- **Stark + Vision** — always.
- **Strange** — this mission is almost entirely things a human sees.
- **Captain** — new components and a type that must thread through several
  view files; plus `CalendarViews.tsx` sits at its cap.
- **Banner** — dispatched first.

## Banner's brief — accepted, with two corrections and three Fury decisions

### Corrections

1. **The plan names three rendering targets; two do not exist.** CT2 sits
   *after* CV3/CV4 in the plan's own order, so it says "Schedule → a task
   variant of `EventCard`; timeline → the all-day row via
   `partitionForTimeline`". Verified: **no `Schedule*` or `TimelineGrid*`
   component exists**, and `timelineLayout.ts` still has zero application
   callers. We are running CT2 early, so it renders into the views that
   exist **today**: Week and Day (via `DaySection`/`EventCard`) and Month
   (`MonthGrid`). CV3/CV4/CV5 inherit the obligation to render tasks when
   they build their views — recorded as a deliberate leftover, not a gap.

2. **DESIGN.md does not mention `line-through` at all** — Fury said
   otherwise earlier and was wrong. The rule exists only as a comment at
   `EventCard.tsx:63`, and it claims the vocabulary "means cancelled, not
   'already happened'". But `GroceryRow.tsx:79` already uses
   `line-through` for a **checked** item — struck off a list, i.e. *done*.
   So the app has one usage and one comment that disagree.

### Decisions — don't re-litigate

- **D1. Tasks travel as their own `tasks` prop, not a union with
  `CalendarEventView`.** Every view component takes `events:
  CalendarEventView[]` today, and `MonthGrid` narrows to
  `MonthLayoutEvent` while `DaySection` filters via `daysEventCovers`. A
  union would force a discriminant at every use site in three components.
  A parallel prop leaves the event path untouched and makes "CV3/CV4 do
  not render tasks yet" a **visible type-level gap** rather than a silent
  one. Internally, a task converts to the existing layout shape
  (`{id, startAt: due, endAt: due + 1d, allDay: true}`) so `assignLanes`
  is reused unchanged — no second packer, the same rule CV2 followed.

- **D2. `line-through` for a completed task joins `GroceryRow`'s existing
  vocabulary; it is not an exception.** A checked grocery item and a
  completed task are the same claim — *struck off a list*. The plan's
  framing ("permitted here and only here") is right in effect but wrong in
  reasoning, and `EventCard.tsx:63`'s "means cancelled" is the sentence
  that is actually incorrect. **Correct that comment** to say what it
  really protects: a *past* event must not be struck through, because
  "already happened" is not "done" — and note the completed-task and
  checked-grocery cases as the legitimate uses.

- **D3. The kid path passes a per-task boolean, never a role or a user
  object.** STRUCTURE.md: *"components never receive role or user objects
  for gating purposes"* and *"hiding UI is never the gate"*. The page
  computes, per task, whether the signed-in user is assigned to it, and
  passes that. `completeTask`'s own membership guard (CT1's third form)
  stays the real gate; the boolean only decides whether a control that
  would refuse is drawn at all.

## Contracts

Sequential — every contract after C1 touches files C1 moves. Sized so one
dispatch completes one.

### C1 — Extract `VIEW_CONFIG`, because `CalendarViews.tsx` is at the cap
- **Status:** DONE — `f12ae11`. 348 → 217; tests 241 → **252** (11 new, covering both 2026 DST transitions and the Jan 31 boundary — the coverage Captain's ruling was actually about). Purity proven by reconstructing the old config from `git show HEAD` and comparing across 6 views × 9 anchors × step/back/Today × 9 "today" values: **1674 comparisons, 0 mismatches.**
- **Why first:** the file is at **348/350** and CT2 must add lines to it to
  thread tasks through. Captain's CT1 ruling is a written trigger: *the
  next mission that must add a line performs the `ViewConfig` →
  `src/lib/calendarViewConfig.ts` extraction first, whether or not it is
  CV3.* C4b already spent the one duplication available to pay for a line.
  **Captain's decisive argument was coverage, not size:** `VIEW_CONFIG` is
  per-view date logic living in a `.tsx` the test glob cannot reach, while
  its sibling `VIEW_CURSOR` sits in `lib` with property tests across every
  day of 2026. Move the config, **not** the render switch — the switch is
  where future views land and it should stay flat and visible.
- **Boundaries:** may touch: `src/components/CalendarViews.tsx`, new
  `src/lib/calendarViewConfig.ts`, new
  `src/lib/calendarViewConfig.test.ts` · must not touch: anything else.
- **Verification:** gauntlet, three timezones; `wc -l` on both files; a
  before/after DOM+URL trace of paging in Week, Day and Month proving
  behaviour is byte-identical.
- **Evidence required:** the trace diff (empty); the new tests, which must
  cover what was previously untestable; line counts.
- **Done criteria:** pure refactor, test count **rises** (that is the
  point), `CalendarViews.tsx` comfortably under cap.

### C2 — `CalendarTaskView`, and the parallel query
- **Status:** DONE — `3dc628c`. Concurrency **measured**: the two queries dispatch 0.57ms apart, both long before either returns. `isMine` computed server-side from people already joined in the same round trip — no second query, and only a boolean crosses into a component.
- **Boundaries:** may touch: `src/app/(app)/calendar/page.tsx`,
  `src/components/CalendarViews.tsx`, a new type home · must not touch:
  `src/app/actions/**`, `prisma/**`.
- `page.tsx:61` currently runs **one** query with a comment saying there is
  nothing to batch with it. That comment stops being true here: the task
  query goes in a **`Promise.all` alongside it, never sequentially** — on
  a `force-dynamic` page each sequential `await` is another cross-country
  round trip (CLAUDE.md's performance section). **Update that comment too.**
- Per D3, compute per-task `isMine` server-side from the verified user.
- **Evidence required:** the `Promise.all` shown; a query-count measurement
  proving two queries, not two round trips in series.

### C3 — Render tasks in the views that exist
- **Status:** DONE — `03042b7`. `TaskCard.tsx` new (justified: `EventCard` exists to describe a start/end *span*, a task has one due date). `EventCard.tsx:63`'s "line-through means cancelled" corrected — it was never true anywhere, `GroceryRow` has struck checked items since it was built. Distinction proven by computed style in one frame: completed task struck through, past events same weight-drain but not struck. **Caught a bug outside the brief:** `DaySection`'s "No events" card only checked events, so a task-only day showed it beside a visible task.
- **Boundaries:** may touch: `src/components/DaySection.tsx`,
  `EventCard.tsx` (or a new `TaskCard.tsx`), `MonthGrid.tsx`,
  `CalendarViews.tsx` · must not touch: `src/lib/monthLayout.ts`,
  `src/lib/timelineLayout.ts` (**CV4 is its first consumer, not CT2**).
- Month pills reuse `assignLanes` via the D1 conversion — **no second
  packer**.
- Per D2: completed tasks get `line-through`; **correct `EventCard.tsx:63`'s
  comment** rather than leaving a sentence the codebase contradicts.
- **Evidence required:** 375px measurements, light and dark; a completed
  task visibly distinct from a past event; no layout shift.

### C4 — `TaskDetailSheet`, mark complete, and the kid attack
- **Status:** DONE — `17f7c6d`. The kid attack ran through the **shipped bundle** (action ids pulled from the chunk the running server served), positive control first, same kid session throughout: completes own ✅ → refused on another's ✅ → refused on un-complete, timestamp unchanged to the byte ✅ → refused on edit/delete ✅ → manager succeeds on all four ✅. Rendered DOM per role captured, not reasoned. **Dormant-export deadline met and measured: task action ids in the manifest 0 → 4.** Flagged two things honestly, both taken by C5.
- **Boundaries:** may touch: new `src/components/TaskDetailSheet.tsx`,
  `CalendarViews.tsx` · must not touch: `EventDetailSheet.tsx` (a separate
  sheet — a task's fields and verbs genuinely differ), `actions/tasks.ts`
  (CT1 built and gated it; **import, do not edit**).
- **Evidence required — the hard part.** A **kid session, positive control
  first**: completes their own task (succeeds), then is refused on
  another's, then refused on edit and delete. Minted cookie, Phase-1e
  style. CT1 proved these guards at the action level with a throwaway
  harness; CT2 is the first time they are reachable from **real shipped
  UI**, so the attack must go through it. Report roles and counts, never
  names.
- **Done criteria:** `deleteTask`/`completeTask`/`uncompleteTask` now have
  real Server Action ids in the built manifest — CT1 recorded **zero**;
  that number changing is the proof the dormant-export deadline is met.


### C3b — a completed task must not read as outstanding in Month view
- **Status:** DONE — `f8c4a40`
- **Recorded late.** C3's builder flagged that `MonthCell.tsx` sat outside
  its boundary, so a completed task's pill was pixel-identical to an open
  one — a signal that lies, in a primary view, about the very thing CT2
  exists to do. Fury made it a contract rather than letting it reach the
  design gate.
- **Boundaries:** may touch `MonthCell.tsx`, `MonthGrid.tsx`; must not
  touch `monthLayout.ts` or any file a parallel builder held.
- **Report — the contract named `line-through`, and the builder measured
  instead of obeying.** Below `md` the pill's title span is `sr-only`,
  genuinely display-hidden: a pill shows **zero** visible characters at
  375px, so `line-through` alone would have been invisible at exactly the
  viewport DESIGN.md targets. It shipped a checkmark glyph (renders at
  every size) with `line-through` layered on at `md`+, joining
  `TaskCard`/`GroceryRow`'s vocabulary rather than inventing a fourth.
  Completion is computed independently of past-ness, so a task finished
  early still reads done and an overdue-but-open one is never struck.
  **Lane assignment proven untouched**: identical pill counts and the same
  "+1 more" before and after; `monthLayout.ts` byte-identical.
  It also declined to clean up shared test data a sibling builder was
  still using — the right call.

### C5 — Split the sheet under the cap, and let Edit reassign people
- **Status:** DONE — `6aa2aef`
- **Recorded late — the builder flagged the gap itself**, exactly as Vision
  did in CT1. *A boundary living only in a dispatch prompt is not a
  boundary*; written down here so the audit trail is real.
- **Boundaries:** may touch `TaskDetailSheet.tsx`, new `TaskEditView.tsx`,
  `CalendarViews.tsx`, `page.tsx`; must not touch `actions/**`,
  `EventPeopleField.tsx` (import unchanged), `EventDateTimeFields.tsx`,
  `TaskForm.tsx`, `src/lib/**`, `prisma/**`.
- **Report:** 418 → **290**, edit view now its own 173-line component. The
  roster joins the existing `Promise.all` as a **third element** — all
  three dispatch at +0ms, where a sequential chain would stagger by
  hundreds of ms. Reuses `EventPeopleField` rather than a second picker.
  Reassignment proven end to end: chips toggled in a real browser, then
  `TaskPerson` rows confirmed by direct database read to match.
  **The kid check from two angles is the useful one:** a kid who *is*
  assigned sees Mark complete but still never sees Edit — proving
  membership and management are separate gates, not one.
  Kept CT1's standing constraint: wrote a local date helper rather than
  importing `parseLocalDateString`, which would have tripped Captain's
  third-consumer rule and forced a move outside its boundary.


### C6 — Fold the duplicate edit form back into `TaskForm`
- **Status:** DONE — `1d88afa`
- **Why it exists — Fury's contract error, the second of this arc.**
  `TaskForm.tsx:34` already declared itself *"One form for both New and
  Edit"* and already implemented it. C4's and C5's contracts — which Fury
  wrote — said **"must not touch `TaskForm.tsx`"** without checking that.
  The builders complied, `TaskEditView.tsx` got built, and `TaskForm`'s
  edit branch went dead. Captain put on record that the builders could not
  have avoided it. Both of this arc's contract errors were the same shape:
  **a false premise about what already existed.**
- **Boundaries:** may touch `TaskForm.tsx`, `TaskDetailSheet.tsx`,
  `CalendarViews.tsx`, and **delete** `TaskEditView.tsx` · must not touch
  `src/app/**`, `src/app/actions/**`, `src/lib/**`, `prisma/**`,
  `EventPeopleField.tsx`, `EventDateTimeFields.tsx`, `MonthGrid.tsx`,
  `MonthCell.tsx`, `TaskCard.tsx`, `DaySection.tsx`.
  **Recorded late — Captain filed this as a NOTE at pass 2 and was right.**
  Third time this session a contract reached a gate with its boundary
  living only in a dispatch prompt (C3b, C5, C6). Captain audited the diff
  and found no deviation, but could not check it *against* anything.
- **Verification:** full gauntlet, three timezone legs; `grep -rn
  "TaskEditView" src/` empty; editing proven by direct database read.
- **Report:** `TaskEditView.tsx` deleted (173 lines); `TaskForm` gained an
  optional `onSaved` (supplied → callback, absent → `router.push`
  unchanged) and an optional `currentUserId`. Net **−129**. Editing proven
  end to end — retitled and reassigned a task, saved, reverted, saved
  again, both writes confirmed by direct read. Create path unchanged (it
  still navigates). A kid still sees zero edit controls and still sees
  Mark complete. **Repaid the first instalment on the grandfathered
  date-helper debt**: the forward conversion went 5 definitions → 4 (3 in
  components, exactly the survivors STRUCTURE.md names), the inverse
  2 → 1 — verified by Captain.
  One measurement **routed to Strange rather than decided**: the edit view
  now carries `Repeat · coming soon`, leaving **23px of overflow** with
  the Save button's last ~7px below the fold at first render. Reachable by
  scrolling, and a real click produced a confirmed write — a near-miss,
  not an occlusion.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | **BLOCKED** | 1 | 4 notes; retired one of its own rules as failed |
| — | C6 fix | DONE `1d88afa` | — | Captain's blocker; Fury's contract error behind it |
| 2 | Captain | **PASS** | 0 | 6 notes; confirmed the debt repayment and the new rule's wording |
| 2 | Vision (Fable) | **PASS** | 0 | 5 notes; found a real pre-existing bug on a sibling surface |
| 1 | Strange | **PASS** | 0 | 5 notes; ruled to KEEP the Repeat row, with a measurable trigger for revisiting |

### Strange, pass 1 — PASS

**It discarded its own first instrument.** The built-in browser pane runs
`document.hidden === true` and stalls Suspense streams — three loads sat on
a skeleton for 60s+ while the server had returned 200 in 519ms, and one
screenshot showed a skeleton *over* a fully-rendered DOM. It threw all of
that out and drove headless Chrome instead — then checked *that* instrument
in both directions and caught its driver inheriting the Mac's dark OS theme
when a run omitted the override, the exact trap CLAUDE.md records. It also
proved transitions were live rather than frozen by catching a button
mid-transition at `opacity: 0.911839`.

**The ruling: keep `Repeat · coming soon` in the sheet. No `!isEdit`.**
It reproduced the numbers to the pixel and then measured the
counterfactual — hiding the row takes overflow 23 → **0** and Save's bottom
to 796 — so the row is the entire cause and "Save is below the fold" is
**not** an independent finding. It passes anyway: Save's **centre** is at
`y 794.8`, on screen, and `elementFromPoint` there returns the button, so
DESIGN.md's unocclusion rule is satisfied **with no scrolling at all**. The
clipped 6.8px is a button's bottom radius, which reads as a scroll
affordance. The overflow is constant, not content-dependent. And `!isEdit`
would re-split create from edit for 7 pixels, one contract after C6 spent
itself merging them.
**The revisit trigger is measurable, not taste:** watch **Save's centre
crossing y=812**, not its bottom. A real Repeat control, or a sixth
household member wrapping the chips to a fourth row, would do it — at which
point the arrival position stops being reachable and it becomes a blocker.

**Verified clean:** zero controls under 44px at 375 **or** 320 (21 measured
at 320); no horizontal overflow; 55px nav clearance at max scroll, the exact
figure DESIGN.md records; the ⋯ menu **replaces** sheet content rather than
stacking (`[role=dialog]` stays 1); three states stay distinct; and the `✓`
is `GroceryRow`'s existing character, not a fourth vocabulary.
**Roles read right, not just enforce right** — a kid on someone else's task
gets a clean read-only card, not a dead-ended sheet.
**And the completed-vs-past distinction holds in one frame, both themes:**
completed task struck through, three genuinely past events muted but *not*
struck. Deliberate and correct: an **overdue but open** task stays
`font-semibold` — pastness never dims a task, only completion does.

## Notes carried out of CT2 (none blocking; two need Bryce)

1. **⚠️ Mark complete is not optimistic, and DESIGN.md requires it.** The
   rule: *"instant feedback on every tap — optimistic updates, never a wait
   on the server round trip."* Measured settle over four toggles:
   **600 / 349 / 211 / 187 ms**. Strange did **not** block, for two recorded
   reasons: the screen never lies (the tap is acknowledged in-frame and the
   button is `disabled` while pending, so a double-tap **cannot** fire a
   second toggle — the one outcome that would have made it a real bug), and
   `EventDetailSheet` ships the identical pattern and **passed this gate in
   mission 8**, so charging CT2 alone would apply the rule for the first
   time to its second offender.
   **But CT2 is where the rule's reason starts to bite.** Delete is a
   one-shot verb on a row that vanishes; **Mark complete is a toggle on a
   row that stays on screen** — precisely `GroceryRow`'s check-off shape,
   which is what the rule was written for, and which the v2 plan's
   reward-points loop will make the most-tapped control in the app.
   **Decision needed: either DESIGN.md gains an explicit carve-out for
   one-shot/destructive verbs, or both sheets adopt `useOptimistic`.**
   Strange's words: *it should not go a third mission unexamined.*
2. **Month: an *open* task is pixel-identical to an event.** A pill is
   `47.9×16` with its title `sr-only`, so the completed task's `✓` is the
   **only** cue in all of Month that a pill is a task at all — meaning it
   reads ambiguously as "done" *or* "is a task". `TaskCard` already solved
   this in Week/Day with a two-state glyph (empty square open, filled ✓
   done). Rendering the empty `☐` on an open task's pill completes the same
   vocabulary for ~8px of a 48px pill. C3b's reasoning holds as far as it
   went; this is the half it did not need to cover.
3. **`NoEventsCard` says "No events" on a surface that now holds tasks.**
   The gate is correct and never asserts anything false — confirmed: a day
   with a task and no events shows the task and **no** card. But the label
   no longer names everything it covers.
4. **`NotLoadedCard` says "Not all *events* loaded" — the sharper of the
   two.** The task query shares `windowStart`/`windowEnd` exactly, so a day
   at the window edge may be missing a **task** too, and the caveat names
   only events. The state itself is present and distinct; it is the noun
   that is incomplete.
5. `current.isMine` goes stale after a manager reassigns people — inert
   today, since only managers reach Edit.

### Vision, pass 2 — PASS

All three re-gate items verified. **Case H re-run and still refused**: a
kid `updateTask` on a task they are not on, with `userIds` crafted as
[owner, self] *and* as [self only] — both refused, target row
byte-identical (`updatedAt` unchanged to the millisecond). Plus a forged
cookie signed with the **real** secret carrying the kid's userId but
`role: "admin"` — refused, because the DAL re-reads the row. Kid cookie
proven live first, every time.

Membership and management confirmed still separate: an **assigned** kid
(`isMine: true`) sees exactly `[Close, Mark complete]`; an unassigned kid
`[Close]`; neither has a form, "Edit", "Save changes" or "More actions"
anywhere on the page.

**The new surface got a genuinely adversarial test.** It proved `onSaved`
fires only on success by **deleting the task server-side while the edit
form was open**, then pressing Save: inline error, sheet stayed in the
edit view, `onSaved` never fired. And it proved an empty people selection
cannot look saved — client refuses, server independently refuses
`userIds: []` and a bogus id, row untouched in every case.

**⚠️ It caught Fury's third mid-gate commit.** `2178a9c` landed during the
run and touched `page.tsx`, inside C6's must-not-touch `src/app/**`.
Vision downgraded it from BLOCKER **only on proof**: the diff is one word
inside a `//` comment, comments are stripped at compile so the served
bundle is behaviourally identical, and it re-ran all four gauntlet legs at
HEAD. Its rule, which is now three-for-three this session: *a fix landing
after a PASS must either be enumerated as inert or re-gated.*

**NOTES:** the roster note stands (real display names serialise to every
role's client — no new exposure, `AvatarBadge` already did this);
`current.isMine` goes stale after a manager reassigns people (inert today,
since only managers reach Edit); and the 23px / 7px edit-view overflow
confirmed **to the pixel** for Strange.

## 🐞 Pre-existing bug found by Vision — NOT CT2's, and not fixed here

**A deactivated family member makes a task — or an event — permanently
uneditable.** Traced end to end, deliberately *not* reproduced, because
demonstrating it needs a `User` row update and the danger register forbids
that absolutely.

The chain: an admin deactivates someone via `PersonManageSheet`
(`/settings/family`, shipped); `deactivatePerson` keeps every row, so
their `TaskPerson` rows survive; `page.tsx:121` joins task people with
**no `deactivatedAt` filter**, so the sheet seeds `userIds` with the
deactivated id; the roster query (`page.tsx:136`) **does** filter
`deactivatedAt: null`, so no chip is drawn for them and the id **cannot be
deselected**; `validatedPeople` (`actions/tasks.ts:88`) then refuses it.
Every Save fails with *"One of those people isn't available anymore."*
until the task is deleted.

**The same shape exists on the event edit page and has since K1**
(`src/app/(app)/calendar/[id]/edit/page.tsx:75`) — so this is a sibling
surface **two gates have already passed**, which is why it is a NOTE
rather than a blocker here.

Two candidate fixes, and they mean different things — **Bryce's call**:
1. Filter the people joins with `where: { user: { deactivatedAt: null } }`
   — deactivated people then also stop appearing on cards, which may be
   the intended reading of "deactivated".
2. Seed `userIds` from `current.people` filtered to ids present in the
   roster — deactivated people keep showing on existing items but drop off
   on the next save.

Needs a contract that can touch `page.tsx` **and** the event edit page.
| 1 | Vision (Opus) | **PASS**, scoped to `c5fa5a0` | 0 | 4 notes; **C5's surface needs re-gating after C6** |
| 1 | Strange | queued (runs after Vision — both use fixtures) | — | — |

### Vision, pass 1 — PASS, and it verified far past what it was asked

Gauntlet matched exactly (252 / 252 / 248+4). Boundaries clean on all six
contracts. It re-derived every headline claim rather than accepting one:

- C1's purity proof was claimed at **1,674** comparisons; Vision redid it
  at **200,340** — every day of 2026 plus DST and year boundaries × 5
  "today" values × 3 timezones — then **proved its own harness could go
  red** by injecting a one-day shift and a stray space.
- C2's concurrency: dispatch offsets **0, 0, 0 ms**; parallel 66ms vs
  sequential 239ms, **3.6× over three runs**.
- The task→month adapter: **12,045 cases** (1,095 days × 11 timezones)
  including three quarter-hour offsets, half-hour DST, and the +14/−11
  extremes. Zero failures. The Week/Day filter got its own 6,570-case
  sweep.

**The permission attack, through the shipped bundle.** Nine kid attacks,
every refusal confirmed against the *database* rather than the response —
including `updateTask` with a **crafted `userIds` adding themselves to
another kid's task**, refused with `TaskPerson` unmoved. Then five forged
cookies signed with the **real** secret; the sharp one is a kid's userId
claiming `role: "admin"`, refused — **proving `dal.ts` re-reads the real
row rather than trusting the JWT's role claim.** Action confusion tested
too: real `CalendarEvent` ids passed to all four task actions left every
event byte-identical, same `updatedAt`.

It also swept a bug class nobody asked about — fetch-window honesty for
tasks — across 7 timezones, found **zero** cases of the dangerous
direction, and proved the harness detects it by reintroducing the
start-only check (5 lies in Kiritimati).

**⚠️ The caveat, and it is Fury's process error.** I dispatched C6 **while
Vision was gating.** Its verdict covers `c5fa5a0`; C6 is deleting
`TaskEditView.tsx`, which is C5's entire deliverable and the surface
Vision probed for the edit path. So **C1/C2/C3/C3b/C4 stand; C5's surface
is already stale** and needs re-gating after C6 — specifically that
`TaskForm`'s edit branch enforces the same manager-only path, that the
crafted-`userIds` attack still refuses, and that a kid still never reaches
an edit control.

This is the **stale-gate-record failure from CV2 arriving from the other
direction**: there a fix landed *after* a PASS; here a fix landed *during*
one. Doctrine says batch fixes before re-gating — I dispatched a fix mid-
gate instead, which is the same mistake wearing different clothes.
Vision refused to pretend otherwise: *"I did not re-run against a tree
that does not yet exist."*

**NOTES:** C4 touched `DaySection.tsx` outside its may-touch list —
provably inert (one doc-comment rewrite, zero code), recorded because a
boundary deviation should be visible even when harmless; the full roster
(names + avatar colours) now serialises to every client including kids,
which is **no new exposure** (`AvatarBadge` already renders those names
for all roles) but matters if per-person visibility ever arrives; and
`Task`/`TaskPerson` did **not** return to 0 — Vision deleted all five of
its own rows and verified them gone, then correctly **declined to delete
the C6 builder's live fixtures**, created after its cleanup.

### Captain, pass 1 — BLOCKED, and the blocker is Fury's contract error

**BLOCKER — `TaskEditView.tsx` is a second task-editing form.**
`TaskForm.tsx:34` already declares itself *"One form for both New and Edit
(the EventForm/RecipeForm precedent)"* and already implements it —
`defaultValues`, `isEdit`, `updateTask`, a "Save changes" label. Verified
by Fury: its only call site (`new/task/page.tsx`) passes **no**
`defaultValues`, and no task-edit route exists, so **CT2 created dead
code** — `TaskFormDefaults`, `isEdit` and the `updateTask` branch now have
zero callers and never will, because CT2 built the alternative.

The damage is measured, not principled: drift is **already present**
(`TaskForm` renders the `Repeat · coming soon` row, `TaskEditView` does
not, so K4 has two homes and one is unreachable), plus a third copy of two
validation strings and a second copy of the `Field` label pattern.

**Captain put on record that the builder could not have avoided this**, and
it is right: **C5's boundary — which Fury wrote — says "must not touch
`TaskForm.tsx`."** I never checked whether that file already did the job
before forbidding it. C4's contract made the same omission one contract
earlier. **Second contract error of this arc** (CT1's C4 was the first,
also a false premise about what already existed). The remedy needs a
contract that *can* touch `TaskForm.tsx`, which is exactly why it is a
blocker rather than a note.

### Captain retired one of its OWN rules as failed — the most valuable thing in this gate

Its CT1 trip condition was *"a third consumer of `parseLocalDateString`
forces the move to `src/lib/`."* Both C4 and C5 complied **by writing a
local copy**, each documenting that it was doing so to stay under the
threshold. So the importer count never reached three and the tree now
holds **five** copies of the forward conversion and **two** of the inverse.

> *"The rule counted importers, and a builder can hold importers at two
> forever by writing a copy. That is exactly what happened, twice."*

It also found `mealPlanDates.ts:87` already claims to be the shared home
for this job, while `TaskForm.tsx:13` cites the surviving copies as "the
house pattern" — **two comments asserting opposite conventions for the
same function.**

It declined to make this a blocker, and the reasoning is worth keeping:
three copies survived a previous Captain's PASS and a fourth survived its
own at CT1, so blocking the fifth *"would apply a standard I did not apply
one mission ago — the exact unpredictability Law 3 exists to prevent."*
**A replacement rule keyed to definitions rather than importers is drafted
and awaits Bryce.** The C6 fix deletes `TaskEditView.tsx`, which retires
CT2's two new copies for free.

**Its four rulings on my questions:** (1) the right thing moved — and the
*real* reason is stronger than C1's stated one: the render switch imports
`MonthGrid`/`DaySection`/the sheets, so moving it to `src/lib/` would be a
dependency-direction violation outright; it is structurally unable to
move. (2) Trajectory fine, cap returns in ~2 missions, and the next
candidate is the **sheets block** (`CalendarViews.tsx:215-277`), not the
switch. (3) Rule failed, see above. (4) **D1 holds at every boundary** —
no union exists anywhere — with one honest exception noted in `MonthGrid`.

**NOTES:** `MonthGrid`'s adapter makes an *open* task structurally
indistinguishable from an event below `MonthGrid` (right trade today, buys
"no second packer"; CV5 will need to tell them apart — and Captain gave
credit that `taskCompleted` is a **required** field, so a new slot site
must answer it); a **fourth** verbatim copy of the household-roster query
(sanctioned by the `personInfo.ts` clarification, but a trend at four);
`CalendarViews.tsx:87` still says `VIEW_CONFIG` is "above" when C1 moved
it; and `DaySection`'s `onOpenTask` promises a `day` its only caller
ignores.

## Handoff log

- 2026-09-04 — Mission opened on `claude/calendar-ct2-tasks-in-views`,
  branched from CT1 at `2109f75` (CT1 DELIVERED, all three gates PASS).
  Banner dispatched. **This is the last mission before the four-PR stack
  merges as one release** — Bryce's decision, recorded above.

## Delivery

**Shipped:** CT2 in full — tasks render in Week, Day and Month; a task
detail sheet with Mark complete / Mark not complete, Edit and Delete;
per-task reassignment through the existing people picker; and the kid
path (complete your own chore, nothing else) proven through shipped UI.
Seven contracts (C1, C2, C3, C3b, C4, C5, C6).

**Gate verdicts — all three PASS.** Captain BLOCKED (pass 1) → C6 →
**PASS** (pass 2). Vision **PASS** (pass 1, scoped) → **PASS** (pass 2,
narrow, on Fable). Strange **PASS** (pass 1). No gate exceeded 2 of its
3-pass budget.

**Numbers:** tests **241 → 252**. `CalendarViews.tsx` 348 → 217 → 280.
`TaskDetailSheet.tsx` 418 → 296. Net of C6: −129. Database back to exact
baseline after every run — `Task 0, TaskPerson 0, CalendarEvent 4,
User 5` — with the household's one real calendar event untouched
throughout.

**Fury's own record, since it is the honest part:** **two contract
errors**, both a false premise about what already existed (CT1/C4
forbade the only file that could satisfy its own done-criteria; CT2/C5
forbade `TaskForm.tsx` without checking it already did edit). **Three
contracts dispatched without a written boundary** (C3b, C5, C6) — caught
by a builder once and Captain once. **Three commits landed mid-gate**,
the last caught by Vision and downgraded only on proof of inertness.
Every one of those is a process failure, not a code failure, and each is
recorded where the next session will read it.

**Deliberate leftovers:** the five notes above, plus the deactivated-member
bug traced by Vision (pre-existing, same shape on the event edit page
since K1, needs a contract that can touch two files and a decision from
Bryce on which reading of "deactivated" is intended).
