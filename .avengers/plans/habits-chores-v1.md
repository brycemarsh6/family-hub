# Habits & Chores v1: direction

Status: **direction only, nothing built.** Audited on 2026-11-05
(`habits-chores-audit.md`): sixteen questions wait on Bryce, several of
them hard to reverse; the build plan follows his answers. The mock was
redrawn for Habits & Chores the same day and waits for review.

Mock (eight screens: Today, Habit manager, New habit or chore, one habit's
stats, Chore chart, Settings section, Dashboard tiles for the second PR, and
the wall tablet):
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

## More decisions (Bryce, 2026-11-05)

### Accepted recommendations

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
    - Until it is planned, Marshee asks what day you will do it, on the
      schedule in "When the plan-the-day prompt goes out" below.
    - A planned day is a plan, not a deadline. Missing it is no penalty;
      the item is still due any day that month.
37. **The dashboard matters most for this.** It should stay clean, not
    cluttered, and show the few things most likely to slip through the
    cracks: what is planned today, and what still needs a day picked.

### Plan the day, round two (Bryce, 2026-11-05)

38. **When the plan-the-day prompt goes out.** A prompt only goes out for
    an item that is not done and has no planned day still ahead.
    - **Once a week, any day:** one prompt on **Friday** (the week runs
      Sunday to Saturday). An item already planned for Friday, Saturday or
      Sunday gets no prompt.
    - **Once a month** (calendar month, resets each month): in the first
      two weeks, **Sundays only**; in the last two weeks, **Sundays and
      Thursdays**. Fewer prompts early, more as the month runs out, so they
      don't get ignored.
    - A planned day that passes undone asks again at the next prompt, and
      the item stays due for the rest of its week or month.
39. **The prompt appears** as a card on the dashboard and at the top of
    Habits & Chores, with one-tap day choices.
40. **A planned day shows on the Calendar** as a task, in the second PR.
41. **The dashboard work** (chore chart, planning prompts, shout-outs) is
    the second PR. The first PR builds the tab, items, schedules,
    carry-over, streaks and the family tablet view.

### Reminders by text, through Winnie

42. **No phone notifications from Marshee.** Instead, **Winnie** (Bryce's
    Grok bot, the client of `/api/assistant/v1/`) texts Bryce and Emily
    the reminders and prompts. Texts are harder to ignore than
    notifications.
    - Marshee tells Winnie when a reminder is due (a webhook: Marshee calls
      a web address Winnie listens on), and Winnie sends the text.
    - Later, Winnie can act in Marshee on a text reply ("I'll do the temple
      on the 14th"), using the Assistant API.
    - This is its own project, after the Habits & Chores PRs. It touches
      the Assistant API plan (`assistant-api-v1.md`).
43. **An assistant button inside Marshee** (a small sparkles-style icon)
    opens a chat that goes to Winnie. Its own project, after the texts.

### The dashboard, Bryce's vision

44. **The dashboard is extremely customizable, down to single items.**
    Today each person can show, hide and reorder tiles. Next, inside the
    Customize sheet, a tile like Habits or Goals opens a list of that
    person's habits or goals, and they pick which ones the tile shows.
    Example: hide "Brush teeth" (always done), show the one or two habits
    they struggle with. The same for goals and the vision board. Limited
    space, chosen on purpose, nothing cluttered.

### Accepted recommendations, round two

45. **Winnie's texts are opt-in per person**, switched on or off in each
    person's own Settings, so Emily chooses her own.
46. **Texts go out at 8:00 am Denver time**, one bundled text per person per
    day, not one text per item.
47. **"First two weeks" of a month means days 1 to 14** (Sunday prompts);
    day 15 to the end of the month gets Sunday and Thursday prompts.
48. **A Habits tile with nothing picked** shows up to three habits due today
    and not done yet.
49. **The "Goals this week" tile gets the same item picker**, in the same
    dashboard PR, so every tile works the same way.

### Shared habits and the report (Habit tracker Group and Report screens)

50. **Two kinds of shared habit.**
    - **Together:** one check by either person counts for both (Couples
      Prayers).
    - **Side by side:** each person checks their own and sees the others'
      progress (Morning Prayers, Workout).
    This refines "Each item belongs to one person, or to Everyone" above.
51. **Nudge.** On a side-by-side habit, a person can nudge someone who
    hasn't done theirs. The nudge shows as a note at the top of that
    person's Habits & Chores and dashboard; later it also goes out as a
    Winnie text.
52. **A side-by-side stats table** on a shared habit's page: total done,
    completion rate and current streak for each person, plus a chart with
    one color per person.
53. **Kids can join side-by-side habits** (a family scripture study
    streak), checked off on the wall tablet.
54. **No owners, invites or scan-to-join.** Everyone in Marshee is family;
    the people in a habit are picked when it is created.
55. **A Report view** in Habits & Chores, after the first PR: a weekly grid
    (every item by day), a small calendar per item for the month, and a
    year grid per item, with a filter for which items to show.
56. **Not borrowed:** the daily Mood row, "BestDay," and sharing a report
    as a picture.

### Settings ideas (Habit tracker Settings screens)

57. **Vacation mode** in each person's Settings: a start and end date, and
    every habit and chore of theirs counts as skipped on those days, so
    streaks are safe and chores are excused. Built right after the first PR.
58. **Archive, as well as Delete.** Archive takes an item off the lists but
    keeps its history and stats, and it can be brought back. Delete stays
    one tap with no confirmation; Archive is listed before it. (A year of
    streaks should not be one mistaken tap from gone.)
59. **No custom groups.** Each habit has an optional life area, the same
    six as Plans & Goals, plus its time of day. Filter chips at the top of
    the tab sort by either. Habit tracker's groups map onto these: Morning,
    Night and Midday are times of day; Spiritual, Physical Health,
    Emotional Health, Personal Development and Relationships are life
    areas.
60. **Done items drop to the bottom** of the list. No setting.
61. **Items are reordered by drag and drop** (Bryce, 2026-11-05, replacing
    "the same way as the dashboard's Customize sheet," which uses up and
    down arrows). Each row has a grip handle on the right; press and drag
    the handle to move the row. Dragging only starts on the handle, so
    swiping the list still scrolls and swiping a row still opens its
    actions. **The dashboard's Customize sheet switches to drag and drop
    too**, in the dashboard PR, so reordering works one way everywhere.
62. **Each habit row shows its current streak** (a small flame and number),
    hidden when the person's streak switch is off.
63. **Fixed times of day:** Morning until noon, Afternoon until 6 pm,
    Evening after that. No setting.
64. **A small, quiet confetti burst** when a person finishes everything due
    today. No sound (the wall tablet is in the kitchen).
65. **Not borrowed from Settings:** a Monday week start (Marshee weeks start
    Sunday), a daily reset time (midnight Denver; the 7-day back-fill covers
    late check-offs), swipe to check in (swipe opens a row's other actions,
    so checking in stays a tap), themes, widget styles, app icon and badge,
    daily notification (Winnie's texts cover it), iCloud sync, export,
    backup, safety lock, Reset app, Fix stats, Moods, Stress meter, Daily
    quote.

66. **A Habit manager, apart from the main list.** The main Habits & Chores
    list is only for checking things off. Reordering, editing, archiving
    and adding items happen in a separate Habit manager, the way Habit
    tracker has one.

67. **Where things live (split).** The Habit manager is inside the Habits &
    Chores tab: a "Manage" button at the top of the list opens it, and it
    is where items are added, edited, reordered, archived and deleted, and
    where the chore chart is set up. The per-person switches (streaks,
    vacation mode, Winnie texts) live in Marshee's Settings, in a Habits &
    Chores section, and the manager links there.

### Audit decisions (Bryce, 2026-11-05: "I agree with all of your recommendations")

The sixteen questions in `habits-chores-audit.md`, Part 5, all accepted.
The audit holds the reasoning; these lines are the record.

68. **New `Habit` tables.** Plans & Goals habits move onto them in the
    first PR; a goal's plan links to a habit. "Show in Routines" is gone:
    every habit is in Habits & Chores.
69. **One check per person per day, everywhere**, enforced by a unique
    key. "N times a day" leaves Plans & Goals.
70. **Five schedules:** Every day, Certain days, Weekly N times (1 to 7),
    Every other week (optional days, anchored to its first Sunday),
    Monthly N times. This replaces the six in "Each item has a schedule".
71. **Required versus open.** Scheduled-day items are required on their
    days; weekly and monthly items are open until N is reached and are
    required only on a planned day. A perfect day counts required items.
72. **Carry-over** only on scheduled-day items; absorbed when the item is
    also due today (no "done late" row then); carries until done or
    absorbed.
73. **No Hide.** Rows are done, skipped or waiting.
74. **Done rows drop to the bottom on the next load**, never while you
    are tapping.
75. **Manager rows: tap to edit, handle to drag, no swipe.** The editor
    ends with Archive, then Delete. Today rows: tap the check, swipe for
    Skip today.
76. **One celebration:** confetti when everything required today is done
    or skipped. The Sunday chores shout-out stays its own thing.
77. **The streak switch is a viewing preference:** off hides streaks on
    that person's own screens; the family tablet shows everyone's.
    Default on.
78. **Private habits:** a switch on single-person habits; hidden from the
    family view, other people's screens, nudges and texts. A habit on a
    private goal is private.
79. **Who may check for whom:** yourself; the tablet for any participant;
    parents and admins for anyone. One policy function.
80. **Streaks are cached on the participant row** and recomputed in the
    same transaction as any write that can change them; an admin-only
    "Recompute streaks" button in Settings.
81. **Drag and drop with dnd-kit**, pinned, handle only, proved on
    Bryce's iPad in a one-screen spike before anything is built on it;
    hand-written sortable is the fallback.
82. **Six PRs, A to F** (audit, Part 4), replacing "First PR (approved)"
    above.
83. **P3 is live** (CLAUDE.md corrected). Kid profiles without a password
    may be created from Settings when Bryce is ready.

### After PR A (Bryce, 2026-11-05: "Yes to all")

Three recommendations from mission 30's gates, all accepted. They are built
in PR B (mission 31).

84. **The Recompute streaks result counts habits**, for example "Rechecked
    1 habit", not the per-person streak records behind it ("Updated 5
    streaks" for one habit shared by five people).
85. **A new Every day habit's first week counts only the days it existed.**
    Made on a Thursday, it shows "1 of 3", not "1 of 7". From its next week
    on, the target is 7 as usual.
86. **A person added to the family later joins every Together habit
    automatically**, when their profile is created or turned back on.
    Together means the whole household. (Refined by 87.)

### After the PR B mock (Bryce, 2026-11-05: "I like those recommendations")

87. **Together and Side by side let you pick people.** The people picker
    has an "Everyone" button that picks every active person who isn't the
    family tablet. Only habits made with Everyone are flagged to include
    the whole family, and only those add a new or reactivated person
    automatically (this narrows 86). A couple habit like the temple stays
    two people.
88. **The PR B mock is approved** with its wording as drawn: "Skip today",
    "Swipe a row left to skip it for today.", "Tap a row to edit. Drag the
    grip to reorder.", the Private hint ("Only you see it: not on the
    family tablet, other screens or nudges") and the Archive hint
    ("Archive keeps its history and can be brought back."). The nudge
    banner, plan-a-day card and streak numbers drawn on Today are PRs C
    and E.

### During PR B's gates (Bryce, 2026-11-05: "I agree with all of the recs")

89. **Skip on a carried-over row skips the missed day**, not today; the row
    then leaves Today.
90. **The Quit tag is neutral gray**, not amber (amber means a warning).
91. **Plans & Goals moves to the empty-circle check later**, in its own small
    change; PR B keeps its "+".
92. **Manage lists only your own habits in PR B**; other people's habits
    arrive with the family view in PR C.
93. **Wording:** the Together hint is "Together: one check counts for
    everyone"; the Side by side hint, the Every other week controls ("Pick
    days (optional)", "This week", "Next week", "Keep its weeks") and the
    settings row's "Show streaks and more" stay as built.

### Before PR C (decided by Hill, 2026-11-05; Bryce may overturn)

94. **Stats page approved** as the Stats board, plus: a perfect-days line
    under the month grid ("3 perfect days this month"); the calendar shows
    Done, Skipped (dashed ring) and Missed differently from future or not-due
    days, with a short legend; the streak tile's unit follows the habit
    ("days", "weeks", "months"); the tiles show the viewer's own numbers, or
    the kid's when a parent opens a kid's habit. (Hill: medium)
95. **Family view approved** as the Family board, plus: the "Mine" / "Whole
    family" chips show on it too (not on the tablet); on a phone the person
    cards stack under the Together strip; no flame in a person's column
    header until PR D's chore streak. (Hill: medium)
96. **Nudge card:** "Emily nudged you about Morning Prayers" with a "Got it"
    button that marks it seen. One card per unseen nudge.
97. **Stats nudge row:** "Emily hasn’t done hers today" + "Nudge"; after a
    tap, "Nudged" with a check, disabled until Denver midnight; the row goes
    once she is done; one nudge per person, habit and day (server enforced);
    hidden on the tablet.
98. **Streaks on rows:** flame plus number with its unit ("12 days", "3
    weeks"), only at 2 or more, hidden by the person's Show streaks switch,
    always shown on the tablet.
99. **Confetti has no words.**
100. **Checking a carried-over row** writes done late on the missed day; the
     row shows done until the next load, then leaves Today (matches 89).
101. **A skipped row's meta line reads "Skipped today".**
102. **Who opens a stats page:** participants; parents and admins for any
     non-private habit; the tablet for any habit on the family view (Nudge
     hidden there). A private habit's stats open only for its participant.
103. **Stats BackLink:** "Habits & Chores", to `/habits`.
104. **The weekly chart is one small strip per person** (Side by side habits
     only), all bars in the accent color, each headed by the person's avatar
     badge and name, sharing one axis and the same weeks. A tap on a week
     column (44px or wider) writes "Bryce, week of Oct 4: 6 of 7" under that
     strip. No hover-only tooltip. Avatar colors failed the chart color
     check, so identity comes from the name and badge (carries out 52 a
     different way). (Hill: medium)
105. **Opening stats:** tapping a row's title area on Today or the family view
     opens `/habits/[id]`; the check keeps its own tap, swipe keeps Skip. The
     Edit page gets a "See stats" link under its BackLink.

## Open questions

1. **Review the redrawn mock** (link at the top), after it is updated for
   the audit decisions (audit, Part 6).

## Not in the first PR

Dashboard tiles and the item picker, Winnie texts, the in-app assistant
button, the "Show in Routines" switch (may fold into the one habit system
instead), one-step-at-a-time mode, the idea library, stars or rewards,
parent approval of kids' check-offs (needs P3), amounts, importing Habit
tracker history.

## Build note (2026-11-05)

PR A (mission 30, the engine and the move) is built on branch
`claude/habits-a-engine`; it is not pushed or merged. Record:
`.avengers/missions/mission-30-habits-a-engine.md`. PRs B to F are not
started.
