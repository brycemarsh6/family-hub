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

## The approved layout

Claude Design canvas: https://claude.ai/artifact/5WwnypeeowDJufRioZFSud
(five phone screens in Marshee's colors: This week, Goals, One goal, Add to
the plan, Vision board). Bryce approved it 2026-11-04: "I really like it."

## The model

Three layers, one menu item (`/plans`) with a segmented toggle.

- **Vision** (PR 2): 5, 10 or 15 years out, one statement per life area, a
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
  missing it carries nothing forward.
- Routines must not get cluttered: a habit will be able to opt in to showing
  there ("Show in Routines"), stored once. That switch waits until Routines
  exists.
- Prompts for each life area (empty vision cards, add-goal ideas): Bryce
  approves every line of wording before it ships.

## Build order

1. **PR 1 (mission 27):** goals, plan items, This week, Goals list, goal
   detail with check-ins, add/edit sheets and forms. Two tabs.
2. **PR 2:** Vision tab (5 / 10 / 15 yr, per-area cards), life-area prompts,
   idea chips in the Add-to-plan sheet, "Part of your 10-year vision" line
   on the goal detail. Wording approved by Bryce first.
3. **PR 3:** dashboard tile ("Goals this week"), a Sunday recap, the "Show in
   Routines" switch (once Routines exists), check-in history.
4. **Later:** photos on vision cards (Vercel Blob, after Bryce adds GitHub
   sign-in to his paid Google-based Vercel account and moves Marshee there),
   voice "log my exercise" via the assistant API.

## Deferred on purpose (don't build by accident)

- Start / end dates on a habit ("Jan to Mar" in the mock).
- A check-in history table (PR 1 stores `currentValue` + `checkedInAt` only).
- Assigning a goal to another person; Mine always means the creator.
- Over-logging past the week's target (the filled button becomes the undo).
