# STRUCTURE.md rationale: the stories behind the rules

This file holds the provenance stories that used to sit inside
[STRUCTURE.md](../../STRUCTURE.md): why a rule exists, the instance that
prompted it, which mission added it and how its wording was corrected. They
were cut from STRUCTURE.md at commit 7dc5b28 on 2026-11-08 by mission 54
(the housekeeping pass), moved word for word, never rewritten. Git holds the
old file at that commit.

How to read a pointer: a rule in STRUCTURE.md that lost text carries
`(Story: docs/history/structure-rationale.md, "<heading>".)`. Find that
heading here (one `###` per rule, under the `##` section of the same name
as in STRUCTURE.md). The rule text itself stays in STRUCTURE.md, and where a
sentence here reads oddly alone, the rule beside the pointer is what binds.

## Boundary rules

### No Prisma enums: the provider swap

This is what made the
SQLite→Postgres move a provider swap, not a rewrite.

### Guard forms: refusal versus emptiness

**Amended 2026-09-05, Bryce-approved**: this clause used
to say refuse with the empty value, and mission-15/C6 found that costs a
real bug — a client that cannot tell "you may not have this" from "there
is nothing here" either retries a refusal forever or treats an
unconfirmed range as checked territory. The Schedule's endless scroll
walled off every event beyond the first quiet month for exactly that
reason.

### Guard forms: the membership form correction

A clause whose binding rule cannot
describe the case it cites produces unsound verdicts later, which is
why this was fixed before form (c) was ever used to judge anything.

### Skipping server-only: the live database remark

This is not pedantry — a test file that transitively imports `db.ts`
puts the **live family database** one future test away from the test
runner.

### Browser return routes: the Google instance

Google's OAuth return is a browser GET that writes, which fit neither the
non-browser row nor the bytes-route row of the layout map. Mission 55 named
it as its own shape.

## One source of truth

### Household date helpers: where the clock formatter came from

(moved from
`feedbackTime.ts`'s private `CLOCK` in mission-48)

### validatedPeople: what changed its class

Note what changed
its class: it was ordinary input validation until mission-16/C3b gave it
an authorization carve-out, and that same security-shaped edit then had
to be made by hand in both copies — correctly, only because one builder
happened to hold both files in one contract.

### Code lines: the JSX-comment counter instance

Instance: one mission file reported `TimelineGrid.tsx` 555/297 and
`MonthCell.tsx` 350/108 by two different methods, three contracts apart —
the same file reading 237 or 108 depending on the counter.)

### Code lines: the blank-line counter instance

Instance: two gates reported the same file at **191 and 216 on the same
commit**, both in good faith, differing by exactly its **25 blank lines** —
the failure this clause exists to end, arriving in the clause's own terms.)

### Pointer-gesture machine: one machine, one bug

One machine, one bug, fixed by hand in each
copy a mission apart: the `validatedPeople` failure, caught late.

### Month grid today test: the DESIGN.md prediction

DESIGN.md predicted this failure in writing one mission earlier — *"a third
caller would reintroduce this with no compile error"* — and `MonthJumpSheet`
was that third caller, one mission later, wrong on arrival: **282 of 730
days** across 2026–27 painted a today marker on a foreign month's cell.)

### Wide pages: rule 1 and the container proof

Current Chrome does not (Vision proved
`container-type: inline-size` leaves a fixed child on the viewport,
mission-44), and iPad Safari is checked on the device.

### Wide pages: why the title row may switch

This exists because header buttons may render their
sheet inline (`PutAwayButton`, `ReviewQueueButton`) and rule 1 forbids a
container around them.

### Chrome dimension rule: the 73px header story

This rule exists because mission-16's worst defect was exactly
this shape: the app header is 73px, three files positioned against it,
and one still said 64 — so "go to today" scrolled the reader to a spot
hidden behind the header, and the same stale 64 sat in a second file one
directory away. One fact, three encodings, two agreeing by import and one
silently stale.

### Local-date string conversions: why the distinction is load-bearing

That distinction is load-bearing:
`mealPlanDates.ts` already described itself as this job's shared home
while `TaskForm.tsx` cited the survivors as "the house pattern" — two
comments asserting opposite conventions for the same function.

### Month and weekday names: the five definitions

Two mechanisms now coexist for one fact: three copies derive
names from `Intl` at runtime and two are hardcoded English arrays, so a
locale or ICU-data change moves three and leaves two, **and two screens
spell the same month differently**.

### Trip conditions: the parseLocalDateString story

This is not
hypothetical: the retired `parseLocalDateString` trip condition
(mission-13/Captain) said a third importer would force a move to
`src/lib/`, and two builders in consecutive contracts complied **by
copying**, each documenting in-file that it was doing so to stay under
the threshold. The importer count never reached three; the tree reached
five copies of a five-line function.

### Reachability gate: the closed instances

`showLocation` and `compact`, listed here through CV3–CV4, were
resolved differently and correctly: they now derive from the data shape
(`columnDays.length > 1`) rather than from the view tag, which answers for a
new member automatically.

### Reachability flip: the BUILT_VIEWS instance

Instance: mission-18/C4 flipped `BUILT_VIEWS.year` and necessarily
falsified nine test cases across `calendarPaging.test.ts`,
`calendarViewConfig.test.ts`, `calendarViewVocabulary.test.ts` and
`useCanonicalCalendarUrl.test.ts` — one of which, `calendarViewVocabulary.
test.ts`, had written its own obsolescence in-file: *"this assertion is
meant to fail then, and to be updated then."* The other three carry that
framing only because C4 added it while updating them; checked against the
pre-C4 blobs rather than the post-fix text, which reads as though all four
had foreseen it.)

## File-size caps

### Both caps: the two mission-16 measurements

This project deliberately explains itself at
length, and the caps were quietly taxing that. Two measurements from
mission-16 are why: `useScheduleWindow.ts` read 431/350 and was carried
as debt across two missions, but is **172 lines of code** — 60%
documentation, and Captain withdrew its own split ruling on measuring it.
And the change that pushed `ScheduleView.tsx` to 95% of the **hard** cap,
forcing a whole extra contract, added **82 lines of which 8 were code**.

### Housekeeping note

This file's growth is a trend to watch, never a BLOCKER: past
650 lines it is due a housekeeping pass that moves provenance narratives
("Added …", "Instance: …") into `docs/history/structure-rationale.md`,
leaving each rule's binding text and a one-line pointer.

### Soft cap: the groceries.ts split

(actions/groceries.ts
was split three ways at ~624 before hitting the hard cap; current largest
hand-written files sit in the ~350–420 range.)

### Test files cap: how the concern-split clause was corrected

(Clause added 2026-09-03: the previous text read as forbidding the
concern-split this repo had already shipped, and
`useCalendarPeriod.test.ts` at 344 now needs it — the letter was corrected
to match the practice before a builder obeyed the letter. **Re-worded
2026-09-03**, Bryce approving, after mission-12's second live use: Captain
found the text still demanded *each half* name its concern while both real
splits had deliberately kept the bare name on one of them. Tying the name
to the **primary concern** rather than to which file happened to be
retained turns an accident into a principle, and settles the second-split
case the previous wording left silent — which matters because files in this
repo demonstrably return to the cap: this very file was born at 349 and hit
376 inside one mission, and `useCalendarPeriod.test.ts` at 344 is next.)

### Adoption clause: the emptied instance list

— emptied 2026-09-02, mission 10's C2, which split
`calendarDates.test.ts` by concern into `calendarDates.test.ts`
(day/span math) and `calendarDatesFormat.test.ts` (label formatting) and
sent `calendarDayDiff`'s test home from `monthLayout.test.ts`.)

### Dormant exports: periodWindowEdges

`periodWindowEdges` was the
retired navigation wall; deleting it removed both the code and that future
wrong answer.

### Built-ahead engines: the first instance

First instance: `src/lib/habits/`
(mission 30; consumers in missions 31, 32 and 34).

## Naming

### Component file name: the first and last instances

First instance:
`MonthLoadingSkeleton.tsx`, which exported only `MonthGridSkeletonRows`
after mission-11/C1 deleted the wrapper, was renamed to
`MonthGridSkeletonRows.tsx` in mission-15/C5. **No live instance remains:** `HubNav.tsx`
(found 2026-09-06 exporting only `HubBottomNav`) was deleted in mission-23
when the side drawer replaced the bottom nav.)

## Danger register (absolute, for every agent)

### Migrations additive only: why CT1 needed an exception

CT1's all-day fix had to rewrite existing `CalendarEvent` rows —
leaving them would have meant two date conventions live in one column
with every reader guessing which one it held.

### Secrets: the FAMILY_PASSWORD correction

**(Corrected 2026-09-05: this rule used to open
with `FAMILY_PASSWORD` differing between dev and prod, which stopped
being current at the 2026-08-29 accounts cutover — Captain confirmed
zero references remain in `src/`, `prisma/`, `.github/` or AGENTS.md.
It survives only as a value in `.env` and Vercel, as a rollback lane
whose stated ~7-day window has now expired; deleting it from both is
outstanding cleanup, not a live rule.)**

## Settled decisions — don't relitigate

### Per-person accounts: the retired-architecture correction

**(Corrected 2026-09-05 on Captain's
finding: this line still described the retired architecture as current,
inside the section headed "don't relitigate.")**

## One link per Google calendar

Mission-60 pass 2: a shared Google calendar linked by two family members
gave two LinkedCalendar rows one googleCalendarId. The pull's first answer
was to adopt a sibling link's events, which needed a relation read of
LinkedCalendar outside linkedCalendarsRead.ts (Captain blocker) and made
twin sync rows that could delete or overwrite the real Google event (Vision
blocker). Bryce (answer 7) ruled that only one link may sync a Google
calendar. The rule moved to canTurnOn, the sibling read to
loadSiblingCalendars, and the pull stopped reading other links' rows. Bryce approved the entry (answer 8). Vision pass 3 then found that a handover between the two links imported everything again, so C10 added `adoptSiblingPulls`: switching a link on moves the old link's pulled state instead.
