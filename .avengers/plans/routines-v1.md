# Routines v1: direction

Status: **direction only, nothing built.** The first PR's three features are
approved; the full mock is not reviewed yet (open question 4).

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

From the voice review (Bryce, 2026-11-05):

18. **Back-filling goes up to 7 days.**
19. **Checking off a Quit habit means "I avoided it today,"** the same tap as
    a Build habit.
20. **The streak switch is one per person**, in Settings under a new
    Routines section.
21. **A perfect day** means every habit due that day is done or skipped.
    Hiding does not excuse a habit. Hide only clears it from today's list so
    the list shows what is left; completion and streaks are untouched.
22. **Streaks for habits that aren't daily** count in periods: a daily habit
    counts days, a weekly habit counts weeks in a row where it hit its
    number (monthly the same, in months).
23. **Every routine step is a habit** in the one habit system, grouped into
    a routine, so a kid's "Brush teeth" gets streaks and stats.
24. **First PR includes** the whole-family view on the wall tablet, an icon
    on each step, and Skip today.
25. **The tab stays "Routines," with two sections inside it: Habits and
    Chores.** Bryce weighed naming the tab Habits or Chores.
    - **Habits** are things to keep up with. They reset each day (or each
      period).
    - **Chores** are scheduled household jobs, for example Emily's Monday
      vacuuming and Tuesday laundry. They show as a short list of what is
      due today, so they don't get buried in a long to-do list.
    - **One-off jobs** (returns, errands) belong in Lists, not Routines.
26. **"Carry over if unfinished"** is a setting chosen when creating any
    habit, chore or routine item. With it on, an unfinished item appears
    once on the next day's list, even if it is also due that day (missed
    Wednesday laundry shows once on Thursday). With it off, the item just
    follows its schedule. Example: the nightly kitchen and living room reset
    starts fresh; laundry carries.

## Open questions

1. **Do chores get streaks and count toward perfect days?** Recommendation:
   no to both. A chore is a job to get done, not a habit to keep up, and a
   carried chore would otherwise break a streak twice.
2. **Hard to undo. When a carried item is finished the next day, which day
   gets the credit?** Recommendation: it is recorded as finished late on
   its original day. Thursday's list clears, the original day shows "done
   late," and it does not count toward that day's perfect day or streak.
3. **Does a half-finished routine carry over whole, or only its unfinished
   steps?** Recommendation: only the unfinished steps, and only those with
   carry-over on.
4. **Review the full mock.** It shows the four screens from before
   (today on a phone, one step at a time, New routine, the family tablet
   view). It needs updating for Habits and Chores sections, streaks, stats
   and carry-over before Bryce approves it.

## Not in the first PR

Dashboard tile, the "Show in Routines" switch (may fold into the one habit
system instead), one-step-at-a-time mode, the idea library, stars or
rewards, parent approval of kids' check-offs (needs P3), amounts, reminders,
importing Habit tracker history.
