# PR F decisions and idea wording (Hill, 2026-11-06; Bryce may overturn)

Copied verbatim from Hill's answer. Fury folds 163 to 174 into habits-chores-v1.md and the idea list into habitIdeas.ts when mission 36 is contracted.


**163. Where the Report lives and how it is reached.** `/habits/report`, h1 "Report", BackLink "Habits & Chores" to `/habits` (103's pattern). One entry: a link card at the bottom of `/habits`, under whichever view is showing (Mine or Whole family), in Manage's card style: `BarChart3` icon box, "Report", hint "Every item by week, month and year", chevron. Not a header pill (at 375px the h1 plus Manage and New already fill the row), not a third chip (HabitViewChips is a view switch of today's list, not tabs, DESIGN.md), not a drawer item (the drawer reaches destinations; the Report is a page under Habits & Chores like the chart), not inside Manage (Manage is for editing, 66 and 67; the chart is there because it is setup, 124). The tablet never sees the card and `/habits/report` sends it to `/habits` (118's pattern): it is on no items, kids have no logins yet, and the family view is its one screen. Risk: medium.

**164. Three views, one page order.** The Report is three views, Week, Month and Year, switched by the one tab control (PlansTabs, generalized however Fury decides), choice in the URL (`?view=month`), default Week. Page order: BackLink, h1, tabs, person chips (165, parents only), filter chips (169), the pager, the legend (Month and Year only), then the content. Why: one pager and one job per view beats one long page with three pagers to scroll past. Risk: low.

**165. Whose items.** The shown person's active items (every habit and chore they are on, Together and Side by side included; archived items stay on their stats page via Edit). A row is that person's own checks; a Together item shows its shared check; a Side by side item shows only the shown person's checks (other people's live on the stats page, 52 and 104). Parents and admins get the chart's person chips above the filter (119: first names, viewer first and selected, then family order, no "Kids" chip); a kid login and a plain member see only their own, no chips. Another person's private habits never appear (78, 102). Risk: low.

**166. Week view.** Rows under "Habits" then "Chores" in Manage order. Each item is one card of two lines: line 1 the icon box, the title (a link to `/habits/[id]` only when the viewer may open it, 114; plain text otherwise) and, muted at the right, a count: scheduled items "5 of 6" (done of due so far, today only once done, the stats page's rule); weekly items "2 of 3" (done of the week's target); monthly items "1 this week". Line 2 a full-width 7-column strip, Sunday first (49px cells at 375), drawn with the same cells as the stats month calendar, extracted into one shared cell component: done or late a filled accent disc with the day number, skipped a dashed ring with the skip glyph, missed amber, today an outline, future and not due plain. One header row S M T W T F S above the first card, not sticky. Cells are read-only spans with the calendar's spoken labels, never buttons: back-filling stays on the stats page one tap away (8, 94), and a parent reading a kid's week must not tick for them by accident. Pager: 44px ChevronLeft and ChevronRight (CalendarHeader's look) around "Nov 1 to 7"; across a month "Oct 26 to Nov 1"; a date outside the current year carries its year, "Dec 28, 2025 to Jan 3" (112's rule). Next is disabled on the current week; previous is disabled before the week holding the earliest start among the shown items. A "This week" pill shows beside the title only on a past week. No swipe to page in PR F. (The Meal Plan's `formatWeekRange` writes an en dash; the Report's title is dash-free; amend or add is Fury's call.) Risk: low.

**167. Month view.** HabitMonthCalendar reused read-only in a compact size (cells about 22px, numbers 10px, no per-grid legend), one card per shown item, cards auto-fit at a 160px minimum (two across on a phone, four or five on an iPad), Habits then Chores. Card: icon, title (same link rule), count "12 of 14" for scheduled items, "3 of 4" for monthly items, "9 this month" for weekly items, then the mini grid. One legend (Done, Skipped, Missed) under the pager. Title "November", year only outside the current year (112); next disabled on the current month, previous disabled before the earliest start month; "This month" pill on a past month. 113 was PR C's scope and month paging sits under "Not in the first PR", so this is the planned follow-up, not a reversal. Risk: medium (22px legibility; Strange measures, Bryce's iPad confirms).

**168. Year view.** One item at a time: twelve compact month grids (the same compact calendar as 167), two across on a phone (YearView's layout), each headed by its month name, January to December of the shown year; months before the item's start or after today draw plain. Same four marks; today's outline only in the current month's grid (the compact grid holds in-month days only, so DESIGN.md's today rule holds by construction). Choosing the item: a 48px button under the pager showing the current item (icon, title, ChevronDown) that opens a `RadioSheet` titled "Which item?" listing the shown items (after the filter), Habits then Chores in Manage order; default the first shown item; the choice kept in the URL. Under the grids one muted line: "84 done · 6 missed · 3 skipped". Pager title "2026"; next disabled on the current year, previous disabled before the item's start year. Not a 53 by 7 strip: at 375px its cells would be 6px wide and need sideways scrolling. Risk: low.

**169. The filter.** HabitFilterChips reused (one lit, scrolls sideways): "All", then "Habits" and "Chores" (only when both kinds are shown), then the times of day present (Today's sun, sunset and moon icons), then the life areas present, built from the shown person's items the way Today builds its row. The chip holds while switching Week, Month and Year and across a refresh (in the URL) and falls back to All when it no longer matches anything. Person is its own row (165), not a chip here. Why: decision 59 names time of day and life area as the two sorts; Habits and Chores are added because the Month view can be long. Risk: low.

**170. Vacation and chore week changes in every grid.** No new state and no fourth legend mark. An undone vacation day and a chore's week-skipped day draw as Skipped (dashed ring, skip glyph) in every grid, the stats page included, from the one `monthCalendar` rule; a chore's moved-away day is not due (plain) and its moved-to day is a due day; a check done on any of these days draws Done (127, 130). Legend stays "Done, Skipped, Missed". Spoken labels: "Nov 8, skipped (on vacation)", "Nov 8, skipped this week", "Nov 9, not due (moved to Thu)". Why: 57 and 127 say vacation days "count as skipped" and 117 tags the chore "Skipped this week"; a plain cell in the middle of a daily habit's month reads as a schedule gap, and "excused" is a word the app shows nowhere. Risk: medium (changes how the live stats calendar draws vacation days; the completion rate already treats them as skipped, so the numbers do not move).

**171. Empty states.** No active items for the shown person, any view: EmptyState, emoji "📊", title "Nothing to report yet", hint "Add a habit or chore in Manage and it shows up here."; when a parent is looking at someone else: hint "{Name} has no habits or chores yet." Nothing else can be empty: the pagers stop at the earliest start, the filter falls back to All, and the Year chooser lists what the filter shows. Risk: low.

**172. Idea library placement (New form only, not Edit).** The Life area field moves up to directly under Name. For a Habit its hint reads "Optional. Pick one to see ideas." until an area is lit, then "Optional"; with an area lit, an IdeaChips row "Ideas for {short}" (GoalForm's label: "Ideas for Health") shows under it with that area's six ideas. For a Chore, an IdeaChips row "Chore ideas" shows under Name with the eight chore ideas, whatever the area, and the Life area hint is "Optional". The rest of the order stays: Icon, Kind (Build or quit), Who, How often, Time of day, the switches. Why: one row of six chips does two jobs, the field and the idea browser, so the form grows by one chip row and never shows the same six words twice; a separate area row would duplicate the field, and a disclosure button hides the library from the people it is for (21: small, optional). Edit gets no ideas because one tap overwrites several fields. Risk: medium (field order changes; 88 approved the PR B mock's wording, not its order).

**173. A tap fills a whole idea.** Tapping an idea sets Name, Icon, How often (schedule, days, times), Time of day and Build or quit; the Life area is already the lit chip (chore ideas leave Life area alone). It never touches Kind of item, Who, Carry over or Private. A typed Name is replaced. IdeaChips keeps taking strings: the title is the key into `habitIdeas.ts`, where each idea's fields sit beside its words, with a test against this plan the way `goalPrompts.test.ts` guards the prompts file. Why: one tap gives a complete, sensible item and teaches the form by example, and everything it sets can be changed before Save. Risk: low.

**174. The idea wording is approved as written below** (Hill, under "Hill decides for Bryce"; Bryce may overturn any line). Chores are one list, not by life area: the six areas do not sort household jobs, and eight chips fit in three lines at 375px. Risk: low.

## The idea list (paste into `habits-chores-build.md` and `habitIdeas.ts`)

Format: Title | icon (HABIT_ICONS) | How often | Time of day | mode (build unless marked quit). No line has a dash; every title is under 40 characters; no title repeats here or in `goalPrompts.ts`.

**Spiritual**
1. Scripture study | BookOpen | Every day | Morning
2. Family prayer | HandHeart | Every day | Evening
3. Couple prayer | Heart | Every day | Evening
4. Go to the temple | Church | Monthly, 1 time | Anytime
5. Ministering visit or call | Phone | Monthly, 1 time | Anytime
6. Family home evening | Smile | Certain days: Mon | Evening

**Health & Wellness**
1. Take a walk | Footprints | Every day | Anytime
2. Work out | Dumbbell | Weekly, 4 times | Anytime
3. Drink enough water | GlassWater | Every day | Anytime
4. Take my vitamins | Pill | Every day | Morning
5. In bed by 10 | Bed | Every day | Evening
6. No phone in bed | Phone | Every day | Evening | quit

**Personal Growth**
1. Read for 20 minutes | BookOpen | Every day | Anytime
2. Write in my journal | PenLine | Every day | Evening
3. Practice an instrument | Music | Weekly, 3 times | Anytime
4. Work on a skill for 30 minutes | GraduationCap | Weekly, 3 times | Anytime
5. Wake up at 6 | AlarmClock | Certain days: Mon, Tue, Wed, Thu, Fri | Morning
6. Plan tomorrow before bed | Brain | Every day | Evening

**Relationships & Connections**
1. Date night | Heart | Weekly, 1 time | Evening
2. One on one time with a kid | Smile | Weekly, 1 time | Anytime
3. Call a parent or sibling | Phone | Weekly, 1 time | Anytime
4. No screens at dinner | Utensils | Every day | Evening | quit
5. Say something kind to my spouse | Flower2 | Every day | Anytime
6. Write a thank you note | PenLine | Weekly, 1 time | Anytime

**Work & Money**
1. Look over the budget | PiggyBank | Weekly, 1 time | Anytime
2. Pay the bills | PiggyBank | Monthly, 1 time | Anytime
3. No impulse buys | ShoppingCart | Every day | Anytime | quit
4. Pack a lunch | Salad | Certain days: Mon, Tue, Wed, Thu, Fri | Morning
5. Plan the work week | Briefcase | Certain days: Mon | Morning
6. Home for dinner | Car | Weekly, 4 times | Evening

**Fun & Adventure**
1. Family game night | Sparkles | Certain days: Fri | Evening
2. Play outside with the kids | Sun | Weekly, 2 times | Afternoon
3. Go on a family hike | Footprints | Monthly, 1 time | Anytime
4. Ride bikes together | Bike | Weekly, 1 time | Anytime
5. Try a new recipe | CookingPot | Weekly, 1 time | Anytime
6. Kitchen dance party | Music | Weekly, 1 time | Evening

**Chore ideas** (one list, shown when Kind of item is Chore)
1. Make the bed | Bed | Every day | Morning
2. Tidy my room | Sparkles | Every day | Evening
3. Kitchen reset before bed | CookingPot | Every day | Evening
4. Take out the trash | Trash2 | Weekly, 1 time | Anytime
5. Do a load of laundry | WashingMachine | Weekly, 2 times | Anytime
6. Vacuum the floors | Brush | Weekly, 1 time | Anytime
7. Clean the bathroom | SprayCan | Weekly, 1 time | Anytime
8. Feed the pets | PawPrint | Every day | Morning

## For Bryce to look at first (medium calls)

- **163** (the Report card at the bottom of Habits & Chores, not in the header or Manage).
- **167** (22px month cells, two cards across on a phone): a real iPad and iPhone look belongs on his checklist, never blocking.
- **170** (vacation days and week-skipped chores draw as Skipped in the stats calendar too).
- **172** (Life area moves under Name on the New form; ideas hang off it).


**175. Together or Side by side needs at least two people.** The form and
the server both refuse to save with fewer than two people. They show the
same words, "Pick at least two people, or choose Just me.", in the amber
alert line above Save in `HabitForm.tsx`, the same place as "Give it a
name.". The server check sits next to `participantsAllowed` in
`actions/habits.ts`. Save never grays out, and existing rows get no data
fix. Decided by Hill, low risk. Goes into PR F's C3.
