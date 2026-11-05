# Routines v1: direction

Status: **direction only, nothing built.** Bryce has not yet approved the
mock or the first PR's contents (see "Waiting on Bryce" below).

Mock (Claude Design canvas, four screens):
https://claude.ai/artifact/WsWHY1oDmGhofjCFoaBXdu

## Goal

Routines (`/routines`, today a "Coming soon" page) becomes the one daily
place where everyone checks off their routines and habits: Bryce and Emily
on their phones, the kids on the kitchen wall tablet. Bryce's Habit tracker
app (iPhone, used with Emily) is the model for what to borrow. **Marshee
should eventually replace that app** once it covers the features they rely
on. Starting fresh is fine; importing old history is optional and not
planned.

## Decisions (Bryce, 2026-11-05)

From the first round:

1. A routine is a named checklist for a time of day: Morning, Afternoon or
   Evening.
2. Each routine belongs to one person, or to Everyone.
3. Each routine picks its days: every day, weekdays, weekends, or chosen
   days.
4. No points or rewards in the first version.
5. Kids check off on the wall tablet for now (kid logins wait on the P3
   role gates).
6. Icons come from Lucide, Marshee's icon set, never emoji.
7. No Apple Health sync (Marshee is a website; HealthKit needs an App Store
   app).
8. No phone reminders for now. Web push on an iPhone home-screen app is
   possible but is its own project.

From the Habit tracker review:

9. **One habit system.** Routines and Plans & Goals share the same habit
   rows. A habit shown in Routines is the same habit as in This week, so
   checking it off in either place updates both. Habits are stored once.
10. **Shared habits.** A habit shared by two people (for example Couples
    Prayers) is checked off once by either of them and counts for both.
    This matches how a Together goal's habits already work.
11. **Streaks, with a setting to turn them off.** This reverses the Plans &
    Goals rule "Habits don't carry streaks" (`plans-goals-v1.md`).
12. **Stats:** current streak, best streak, a month calendar, and perfect
    days.
13. **Skip** excuses a habit for that day: the streak survives but does not
    grow. **Hide** takes a habit off today's list and changes nothing about
    whether it was done.
14. **Back-filling:** a habit done yesterday but not logged can be checked
    off afterwards. How far back is still open (question 1 below).
15. **Build and Quit habits** are both supported. Quit habits matter most for
    device habits (less phone, less TV).
16. **Done or not done only.** No amounts (glasses of water, steps) for now;
    revisit when a habit needs one.
17. **A small, optional idea library** to browse for new habits. Bryce will
    send screenshots of Habit tracker's Inspiration section. Every line of
    wording needs his approval, as with the Plans & Goals prompts.

## Proposed for the first PR (not approved yet)

Kept on the list for Bryce's review:

- The whole-family view on the wall tablet.
- An icon on each step.
- Skip today.

## Open questions

1. **How far back can a missed check-off be added?** Recommendation: up to
   7 days. It covers "forgot yesterday" and a busy weekend, and keeps a
   streak from being rebuilt months later.
2. **Hard to undo. What does checking off a Quit habit mean?**
   Recommendation: the check means "I avoided it today," the same tap as a
   Build habit, so streaks and perfect days work one way for both. The
   alternative (tap only when you slip, otherwise the day counts) would
   count days nobody opened the app.
3. **Where does the streak setting live?** Recommendation: one switch per
   person in Settings, so Emily can turn streaks off for herself without
   changing Bryce's.
4. **What makes a perfect day?** Recommendation: every habit due that day is
   done or skipped. Hiding a habit does not excuse it, since Hide changes
   nothing about done.
5. **Hard to undo. How do streaks count for a habit that isn't daily?**
   Plans & Goals habits can be "3 times a week." Recommendation: a daily
   habit's streak counts days; a weekly or monthly habit's streak counts
   weeks or months in which it hit its number.
6. **Hard to undo. Are a routine's steps habits?** Recommendation: yes,
   every step is a habit in the one habit system, grouped into a routine.
   Then a kid's "Brush teeth" gets streaks and stats like any other habit,
   and there is nothing separate to keep in sync.
7. Approve the mock and the first-PR list above, or send changes.

## Not in the first PR

Dashboard tile, the "Show in Routines" switch (may fold into the one habit
system instead), one-step-at-a-time mode, the idea library, stars or
rewards, parent approval of kids' check-offs (needs P3), amounts, reminders,
importing Habit tracker history.
