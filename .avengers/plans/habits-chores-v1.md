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
106. **No nudging someone who skipped today** (a skip is finished, 19, 76).
     Decided by Hill, 2026-11-05, high.
107. **Archived habits refuse nudges** (58). Decided by Hill, high.
108. **The Nudge row is on Side by side habits only** (51, 93). Decided by
     Hill, high.
109. **A person's "x of y done" leaves skipped habits out of both numbers**,
     on the family view the same as on Today, from one counting rule.
     Decided by Hill, high. Bryce's tiebreaker for Hill (2026-11-05): "the
     most user-friendly".
110. **Nudge row wording** (amends 97): avatar, "Emily · Not done yet today"
     (status muted), then Nudge. No pronoun, and no "check in", which is a
     Plans & Goals word. Decided by Hill, medium.
111. **Side by side table empty values:** streak always a count with its
     unit ("0 days", "1 day", "12 days"); rate "None yet" until a day has
     been due. Decided by Hill, medium.
112. **Stats calendar title** is the month name ("November"), with the year
     only when it is not the current year. Decided by Hill, high.
113. **Stats calendar shows the current month only** in PR C. Decided by
     Hill, high.
114. **Amends 105:** a row title links to stats only when the viewer may
     open that page (102); otherwise it is plain text, so no tap leads to
     Not found. Decided by Hill, high.

### Before PR D (decided by Hill, 2026-11-05; Bryce may overturn)

115. **Vacation days on Today:** the person's rows show excused (muted, at
     the bottom, meta "On vacation"); the check still works; excused rows
     leave "x of y done" and the confetti rule. A card at the top: "You're
     on vacation through Nov 12" ("You're on vacation today" on the last
     day) with a "Change" link to Settings. The family view shows "On
     vacation" under the name and the rows excused. (high)
116. **Default week Add:** an inline name field with Save in that day card;
     saving makes a Certain days chore on that weekday for the selected
     person (Anytime, carry over off, default icon, Side by side, not
     private). Tapping a chore opens its Edit page. A chore on several days
     shows under each. (high)
117. **This week changes:** tapping a chore opens a sheet titled with its
     name (plus its who label when shared): "Move to" chips for today and
     later days this week except its own day, "Skip this week", and "Back
     to the default" when a change exists. No Add on This week (the board's
     Add is removed there). Tags "Moved to Thu", "This week only",
     "Skipped this week". (medium)
118. **Who edits a chart:** yourself; parents and admins anyone; a kid only
     their own. The tablet is sent to `/habits`, like Manage. (high)
119. **Chart chips:** one per active non-tablet person by first name, the
     viewer first and selected, then family order. No "Kids" chip. (high)
120. **The chore streak** shows as a flame and "N days" after the "Chores"
     title on Today and on each person's family card; 2 or more, the Show
     streaks switch, always on the tablet. Chore rows lose their own flame;
     a chore's stats page keeps its tiles. Lifts 95's "no header flame".
     (high)
121. **No daily chore shout-out line:** confetti stays the one daily
     celebration (76). (medium)
122. **Sunday shout-out:** all Sunday, a card at the top of Today "You
     finished every chore last week. Way to go!", and on the person's
     family card "Finished every chore last week". Shown only when at least
     one chore was due last week and no day broke the chore streak. (medium;
     the plan said Bryce approves this wording)
123. **Vacation card:** each login sets only their own; no card on the
     tablet; current, then upcoming, then past (newest first), each with a
     one-tap Delete. From may be past; Through on or after From; overlap
     refused with "These days overlap a vacation you already have." Saving
     or deleting recomputes that person's streaks. Kids' vacations wait for
     kid profiles. (medium)
124. **The chart is reached** from Manage's row "Chore chart · Each
     person's default week" (above Archived), `/habits/chart`, BackLink
     "Manage", subtitle "Emily's week". (high)
125. **A shared chore's this-week change is a parent's:** on a chore with
     more than one person only a parent or admin may move or skip it this
     week; a kid's sheet shows "Ask a parent to change a shared chore."
     with no actions. Decided by Hill, high.
126. **A moved turn can change again:** once the original day has passed, a
     moved or skipped turn may still be moved to today or later, or
     skipped; "Back to the default" is hidden then. The rule: a change may
     be changed again as long as no past day becomes required or
     un-excused. Decided by Hill, medium.
127. **Done on a vacation day counts:** a habit or chore checked done on a
     vacation day grows the streak and counts in both numbers of "x of y
     done". Only undone rows on a vacation day are excused (left out of
     "x of y", muted, never breaking anything). Amends 115 ("excused rows
     leave x of y" becomes "undone vacation rows leave") and the reading of
     57. Card line: "Anything you don't do counts as skipped. Streaks are
     safe and chores are excused." Decided by Hill, medium.
128. **The vacation button:** "Turn on vacation mode" when the person has
     no current or upcoming vacation; "Add a vacation" when at least one
     exists. Decided by Hill, high.
129. **126 tightened: a passed moved-to day locks the turn.** A moved or
     skipped turn may change again only while the day it now sits on is
     today or later, or while it is already skipped this week. Once the
     moved-to day has passed (done or undone) the row is locked: tapping
     opens nothing, the same quiet look as other past rows. 126's rule
     becomes "no past day becomes required, un-excused, or un-required."
     Fix a miss with a back-filled check (8), which saves as late. Decided
     by Hill, high.
130. **A week-skipped chore done anyway counts:** it joins both numbers of
     "x of y done", grows the chore streak and reads as done. Only an
     undone skipped-this-week turn is excused. Stands or falls with 127.
     Decided by Hill, high.

### Before PR E (decided by Hill, 2026-11-05; Bryce may overturn)

PR E ships as two PRs (Fury's structure call): E1 (mission 34) tiles,
picker, drag to reorder, nudge and Sunday cards; E2 (mission 35)
plan-the-day and the Calendar. PR F becomes mission 36.

131. **New tiles:** "Habits" and "Chores today" (ids `habits`, `chores`),
     full width, on by default, right after "Today's meals", Habits first.
     (high)
132. **Habits tile:** with picks, the picked habits in picked order, only
     those Today would show (required, open, carried, or done or skipped
     today); each row is the live HabitRow. Nothing picked: up to three
     due today and not done or skipped (carried counts as due). Empty:
     "All done for today" only when something was due and all is done or
     skipped, else "Nothing due today". Header label "The ones you picked"
     when picks exist. The header is the tap into Habits & Chores; rows
     keep their own taps (DESIGN.md's DashboardTile rule gains a second
     tile shape for tiles with controls). (high)
133. **Chores today tile:** chores required or carried today plus those
     done today, live HabitRow, the chore flame after the title. Skipped,
     week-skipped and vacation rows stay out (a row skipped from the tile
     shows "Skipped today" until the next load). Empty: "No chores today".
     (high)
134. **Row wording:** the live Today wording everywhere, not the mock's.
     (high)
135. **Greeting:** keep "Dashboard" and "What's going on around the
     house." The mock's "Good morning, Bryce" is an idea for Bryce (it
     would need the browser's clock and 63's times). (medium)
136. **Goals picker picks goals,** not plan items: Mine and Together, not
     completed. With picks the tile's "Still to do" lists this week's
     habits with taps left from the picked goals only (picked-goal order,
     then item order, no cap of three); "x of y done" keeps the whole-week
     numbers. Empty with picks: "Nothing left in the goals you picked".
     (medium)
137. **The picker** is a second view inside the Customize sheet (a back
     control returns), never a second sheet. Button "Pick". Titles
     "Habits on your dashboard" and "Goals on your dashboard". A
     ToggleSwitch per item; picked items under "Showing" in picked order
     with a grip, the rest under "Not showing" (Manage order; goals by
     target date). Note when nothing is picked: "Nothing picked yet. The
     tile shows up to three habits due today." (Goals: "... up to three
     habits left this week."). No limit. Habits picker lists kind habit
     only, not archived, private included. (medium)
138. **Wall tablet:** no Habits or Chores today tile. (high)
139. **Nudge and Sunday cards** on the dashboard: the same cards and words
     as Today, under the heading row, above the tiles, nudges first; not
     widgets; none on the tablet. (high)
140. **Drag to reorder in Customize:** SortableList, grip on the right,
     arrows removed. (high)
141. (E2) **Weekly prompt day is Friday** (38); the mock's Thursday was
     illustrative. (high)
142. (E2) **Prompt chips:** up to three days left in the period from
     today: "Today", then short weekday names; "Other day" (date input
     limited to the period) only when more days remain. A tap plans it and
     the card leaves. (medium)
143. (E2) **Only a planned day inside the current week or month** (today or
     later) silences the prompt. (high)
144. (E2) **Together planning** writes one planned day per participant;
     Side by side plans only for yourself. (high)
145. (E2) **Planned today:** a "Planned today" card on the dashboard above
     the tiles (live HabitRows; the Habits tile leaves those out). On
     Today no card: the row's meta reads "Planned for today" after the who
     label, replacing "Anytime" ("Mine · Planned for today · 1 of 4 this
     month"). A planned row is required that day (counts and confetti).
     (high)
146. (E2) **Calendar:** planned days only to the habit's participants (a
     private habit's only to its person; none on the tablet), all-day,
     the habit's icon, opens `/habits/[id]`; done is struck through with
     a check; undone stays plain. (high)

## Open questions

1. **Review the redrawn mock** (link at the top), after it is updated for
   the audit decisions (audit, Part 6).

## Not in the first PR

- Month paging on the stats calendar (decision 113).

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
