# Plans & Goals v1: the direction

Written 2026-11-04 with Bryce. Read this before any Plans & Goals work.
The mission that builds PR 1 is `.avengers/missions/mission-27-plans-goals-p1.md`.

## Where it came from

Bryce and Emily each have a framed 2026 goal board with five life areas:
Spiritual, Health & Wellness, Personal Growth, Financial, Relationships &
Connections. Most of their goals are recurring actions (exercise 4x a week,
Sunday budget, monthly temple, weekly date night), a few are numbers (weigh
165 lb, earn $500K), and a few are one-time steps (buy an investment
property, take a watercolor course). Bryce's rule for the feature: "enough
help that it reminds us of our goals and makes plans easy to implement and
track, but not too much to keep up with."

Research that shaped it: 4DX lead vs. lag measures (the plan is the lead
measure, the goal is the lag), The 12 Week Year (short horizons), Strides'
goal types (target / habit / average / project), and couples apps (shared
goals, weekly recap). Avoided on purpose: streaks that reset, heavy logging.

**Six life areas (Bryce, 2026-11-04, during mission 28).** The framed boards
have five, and PR 2 widened it to six: Spiritual, Health & Wellness,
Personal Growth, Relationships & Connections, **Work & Money** (Financial
renamed; the key stays `financial` so saved goals keep their area) and
**Fun & Adventure** (new, key `fun`). Six cards make three even rows on the
Vision board.

## The approved layout

Claude Design canvas: https://claude.ai/artifact/5WwnypeeowDJufRioZFSud
(five phone screens in Marshee's colors: This week, Goals, One goal, Add to
the plan, Vision board). Bryce approved it 2026-11-04: "I really like it."

## The model

Three layers, one menu item (`/plans`) with a segmented toggle.

- **Vision** (PR 2, built; the photo slot is still later): 5, 10 or 15 years out, one statement per life area, a
  photo slot per card (photos need Vercel Blob, after the account merge).
  Nothing to track.
- **Goal**: the result. Life area, target date, Mine or Together, optional
  "why", optional number to track (start, target, current, unit).
- **Plan item**: an action under a goal. **Habit** (N times a day / week /
  month, logged by tapping), **Step** (done once), **Reminder** (text only).
- **This week**: the daily screen. Every goal's plan items with a 44px log
  button and "2 of 4" counts, reminders as plain text, the next undone step
  with a checkbox.

## Bryce's decisions (final, 2026-11-04)

- One drawer item, three views behind a toggle. No separate Plans menu item.
- **Goals are shared by default; a "Mine" goal can be marked private**, seen
  by its owner only. "This is good for certain things one spouse might not
  want the other to know they are working on, especially if it has to do
  with the other."
- **Check-in numbers are typed, with −/+ too.** A weigh-in or a dollar
  figure is a measurement, not a pantry count; the tap-only rule for
  quantities stands everywhere else.
- **Every goal has a target date**, entered with quick chips ("End of this
  year", "In 90 days") or a date picker. The Goals list filters Active /
  Done and sorts soonest first.
- Habits don't carry streaks. Reaching the week's count fills the button;
  missing it carries nothing forward. **Reversed by Bryce on 2026-11-05:**
  streaks are coming, with a setting to turn them off. See
  `.avengers/plans/routines-v1.md`.
- Routines must not get cluttered: a habit will be able to opt in to showing
  there ("Show in Routines"), stored once. That switch waits until Routines
  exists. Routines and Plans & Goals will share one habit system
  (`routines-v1.md`, decision 9).
- Prompts for each life area (empty vision cards, add-goal ideas): Bryce
  approves every line of wording before it ships.

## Build order

1. **PR 1 (mission 27):** goals, plan items, This week, Goals list, goal
   detail with check-ins, add/edit sheets and forms. Two tabs.
2. **PR 2 (mission 28): merged as PR #37, live 2026-11-04.** Vision
   tab (5 / 10 / 15 yr, per-area cards), life-area prompts, idea chips in
   the Add-to-plan sheet and the New goal form, "Part of your 10-year
   vision" line on the goal detail. Wording approved by Bryce first
   (`.avengers/plans/plans-goals-prompts.md`). Mission file:
   `.avengers/missions/mission-28-plans-goals-p2-vision.md`.
3. **PR 3 (mission 29): live, merged as PR #39 on 2026-11-04.** Dashboard tile
   ("Goals this week", second in the default order), a Sunday recap card on
   This week, check-in history on the goal page (the `GoalCheckIn` table).
   The "Show in Routines" switch is still waiting for Routines to exist.
   Mission file: `.avengers/missions/mission-29-plans-goals-p3-recap.md`.
4. **Later:** photos on vision cards (Vercel Blob, after Bryce adds GitHub
   sign-in to his paid Google-based Vercel account and moves Marshee there),
   voice "log my exercise" via the assistant API.

## Bryce's PR 2 decisions (2026-11-04)

Pass 1, drawn as canvas screens A, B and C and approved ("those Canvas
proposals all look good, so let's start building it"):

- The Vision board heading stays in Cormorant Garamond italic (its second
  allowed use).
- An empty card on a board the viewer can't edit says "{Name} hasn't written
  this yet" (no prompt, no buttons); on the Together board seen by a device
  it says "Not written yet". The hint line on someone else's board reads
  "Only {Name} can change this board"; on a read-only Together board it is
  hidden.
- New goal order: Life area first, then Name, then the idea chips.
- Board chips on their own row; the 5 / 10 / 15 yr choice is a small
  three-part switch on the heading line.
- Empty cards: dashed outline, no icon band, page-colored fill. Filled cards
  keep the band.
- When a Mine goal shows the Together vision because the owner's is empty,
  the goal page says "Part of your family's 10-year vision".

Pass 2 ("Yes to all three"):

- The Work & Money and Fun & Adventure wording is approved as written.
- When someone other than the goal's owner reads a Mine goal whose vision
  line comes from the owner's own board, the line names the owner: "Part of
  Bryce's 10-year vision". The owner still reads "your".
- A prompt that names a horizon ("in five years", "in ten years", "in
  fifteen years") shows only on that horizon's board. Wording unchanged.

## Bryce's PR 3 decisions (2026-11-04)

Approved from the mock ("Yes, as recommended"):

- The tile "Goals this week" is full width, second in the default order,
  and one tap opens This week. It counts the viewer's own goals plus
  Together goals; a device login counts every goal it may see.
- The Sunday recap shows on Sundays only (Denver), all day, at the top of
  This week. No dismiss button, no notification. It follows the Mine and
  Together / Everyone chips.
- Every check-in is kept. The goal page lists the newest three, "Show all"
  for the rest, and a swipe-to-Delete on each row. Existing check-ins carry
  over as each goal's first history entry.

Pass 1 of the gates ("those recs sound good"):

- **Removing a goal's number to track deletes its check-in history**, in
  the same step, so old readings never return under a new number. Editing
  only the unit keeps the history, as it already keeps the current number.
- The recap hides "{done} of {total} done" when the week had no habits, and
  shows only the number changes and finished steps.

## Deferred on purpose (don't build by accident)

- Start / end dates on a habit ("Jan to Mar" in the mock).
- Assigning a goal to another person; Mine always means the creator.
- Over-logging past the week's target (the filled button becomes the undo).
