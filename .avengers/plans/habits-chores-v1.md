# Habits & Chores v1: direction

Status: **direction only, nothing built.** The first PR's three features are
approved. The mock still shows the older "routines" idea and needs redrawing
before Bryce reviews it (open question 5).

Old mock (four screens, drawn for the routines idea):
https://claude.ai/artifact/WsWHY1oDmGhofjCFoaBXdu

This file was `routines-v1.md` until 2026-11-05, when Bryce clarified the
tab is for habits and chores, not morning and bedtime routines.

## Goal

The drawer's Routines item (`/routines`, today a "Coming soon" page) becomes
**Habits & Chores**: one daily place where everyone checks off their habits
and household chores. Bryce and Emily use their phones; the kids use the
kitchen wall tablet. Bryce's Habit tracker app (iPhone, used with Emily) is
the model for what to borrow. **Marshee should eventually replace that app**
once it covers the features they rely on. Starting fresh is fine; importing
old history is optional and not planned.

One-off jobs (returns, errands) belong in Lists, not here.

## Decisions (Bryce, 2026-11-05)

### The tab and its items

1. **The tab is called "Habits & Chores."**
2. **One list of items. Each item is a Habit or a Chore.**
   - A **habit** is something to keep up with (scripture study, workout,
     less phone).
   - A **chore** is a household job (vacuuming, laundry, a kid's bathroom).
3. **Each item belongs to one person, or to Everyone.** A shared item (for
   example Couples Prayers) is checked off once by either person and counts
   for both, the same way a Together goal's habits already work.
4. **Each item has a schedule**, one of:
   - every day (resets daily);
   - on certain days of the week;
   - once a week, any day (shows until done, resets weekly);
   - a number of times a week (how Plans & Goals habits already work);
   - every other week;
   - once a month.
5. **"Carry over if unfinished"** is a switch on any item. With it on, an
   unfinished item appears once on the next day's list, even if it is also
   due that day (missed Wednesday bathrooms show once on Thursday). With it
   off, the item just follows its schedule. Example: the nightly kitchen and
   living room reset starts fresh; laundry carries.
6. **A carried item finished the next day is saved as "done late" on its
   original day.** It clears off today's list, but it does not make the
   missed day a perfect day or save its streak.
7. **Time of day is optional.** Anytime is the default, or Morning,
   Afternoon or Evening. Morning and bedtime groupings exist only through
   this; there are no separate "routine" containers. (This replaces the
   first-round decision "a routine is a named checklist for a time of
   day.")
8. **Back-filling:** a missed check-off can be added up to 7 days back.
9. **Done or not done only.** No amounts (glasses of water, steps) for now;
   revisit when an item needs one.
10. Icons come from Lucide, Marshee's icon set, never emoji.

### The chore chart

11. **A chore chart setup**: a Sunday to Saturday week view where a person
    types chores under each day (Emily: vacuum Monday, laundry Tuesday,
    bathrooms Wednesday, and so on). Each one becomes an "on certain days"
    chore. The chart is her **default week**.
12. **This-week changes.** During weekly planning she can adjust just this
    week when the default is unrealistic, without changing the default.
13. **Bryce wants the chart visible on her dashboard**, not only on the
    Habits & Chores tab.

### Habits only

14. **One habit system.** Habits & Chores and Plans & Goals share the same
    habit rows. A habit that belongs to a goal and is shown here is the same
    habit as in This week, so checking it off in either place updates both.
15. **Streaks**, with one switch per person in Settings, in a new Habits &
    Chores section. This reverses the Plans & Goals rule "Habits don't carry
    streaks" (`plans-goals-v1.md`).
16. **Streaks count in each habit's own period:** days for a daily habit,
    weeks in a row where it hit its number for a weekly one, months for a
    monthly one.
17. **Stats:** current streak, best streak, a month calendar, and perfect
    days.
18. **A perfect day** means every habit due that day is done or skipped.
19. **Skip** excuses a habit for that day: the streak survives but does not
    grow. **Hide** only clears it from today's list so the list shows what
    is left; done and streaks are untouched, and hiding does not excuse it.
20. **Build and Quit habits.** Checking off a Quit habit means "I avoided it
    today," the same tap as a Build habit. Quit habits matter most for
    device habits (less phone, less TV).
21. **A small, optional idea library** to browse for new habits. Bryce will
    send screenshots of Habit tracker's Inspiration section. Every line of
    wording needs his approval, as with the Plans & Goals prompts.

### Chores only

22. **Chores do not count toward perfect days**, but they get **their own
    chore streak**, separate from habit streaks, so keeping up with chores
    is something to be proud of (Bryce, 2026-11-05, replacing "chores get no
    streaks").
23. **Shout-outs for chores.** A shout-out when a person finishes their
    chores on time, and a bigger one on Sunday when they finished all of
    that week's chores. Bryce approves the wording.
24. **Rewards come later**, building on the chore streak and the Sunday
    shout-out.

### Other

25. No points or rewards in the first version ("Rewards come later," above).
26. Kids check off on the wall tablet for now (kid logins wait on the P3 role
    gates).
27. No Apple Health sync (Marshee is a website; HealthKit needs an App Store
    app).
28. No phone reminders for now. Web push on an iPhone home-screen app is
    possible but is its own project.

## First PR (approved)

- The whole-family view on the wall tablet.
- An icon on each item.
- Skip today.

### Accepted recommendations (Bryce, 2026-11-05)

29. **A this-week change** can move a chore to another day this week or skip
    it this week. The default chart stays as it is, and next week starts
    from the default again.
30. **The dashboard chore chart is the second PR**, with the other dashboard
    work.
31. **Every other week** starts this week or next week, chosen when the item
    is created.
32. **Once a month means any day that month.**
33. **The chore streak** counts days in a row on which every chore due that
    day was done on time. Days with no chores due don't break it, a skipped
    chore is excused, and a chore done late breaks it.
34. **The daily shout-out** shows only on the person's own screen; **the
    Sunday shout-out** also shows on the family view and dashboard.
35. **One streak switch** in Settings turns off both habit and chore
    streaks.

### Plan the day

36. **"Plan the day" for flexible items.** Bryce's example: going to the
    temple once a month, or reaching out to a family member once a week.
    "Any time this month" quietly becomes "never" unless it is planned in.
    - When creating a once-a-month item, choose a planned day now, or leave
      it as any time.
    - Until it is planned, Marshee asks **every Sunday and every Thursday**:
      "You want to do this once a month. What day will you do it?"
    - A planned day is a plan, not a deadline. Missing it is no penalty;
      the item is still due any day that month.
37. **The dashboard matters most for this.** It should stay clean, not
    cluttered, and show the few things most likely to slip through the
    cracks: what is planned today, and what still needs a day picked.

## Open questions

1. **Does "plan the day" also apply to once-a-week, any-day items** (the
   family-member example) and to every-other-week items? Recommendation:
   yes, with the prompt on Sunday only for weekly items, since Sunday is
   already the planning day. Monthly items get Sunday and Thursday.
2. **When a planned day passes and the item isn't done, what happens?**
   Recommendation: it asks again for a new day at the next prompt, and
   the item stays due for the rest of its month or week.
3. **Where does the prompt appear?** Marshee can't send phone
   notifications yet (that is its own project). Recommendation: a card on
   the dashboard and at the top of Habits & Chores on Sundays and
   Thursdays, with one-tap day choices for the rest of the week or month.
4. **Does a planned day show on the Calendar?** Recommendation: yes, as a
   task on that day, in the second PR.
5. **Is the dashboard work (chore chart, planning prompts, shout-outs) all
   in the second PR?** Recommendation: yes. The first PR builds the tab,
   items, schedules, carry-over, streaks and the family tablet view; the
   second makes the dashboard the place nothing slips.
6. **Review the redrawn mock** once it shows Habits and Chores, streaks,
   stats, carry-over, the chore chart and "plan the day."

## Not in the first PR

Dashboard tile, the "Show in Routines" switch (may fold into the one habit
system instead), one-step-at-a-time mode, the idea library, stars or
rewards, parent approval of kids' check-offs (needs P3), amounts, reminders,
importing Habit tracker history.
