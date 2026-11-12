# Calendar filter (mission 78)

Hides events and tasks on the Calendar by person and by calendar. It changes
nothing saved: it only decides what the views draw.

## The rules

- **What is stored:** what is HIDDEN (`hiddenPeople` user ids, `hiddenCalendars`
  linked-calendar ids plus the key `"marshee"` for events made in Marshee), so a
  person or calendar that appears later starts out shown.
- **Where:** the browser's localStorage, per login and per device
  (`calendarFilterStore.ts`, key `marshee:calendar-filter:<viewerId>`). No
  database column.
- **Calendars:** an event lives on its source calendar (the Google calendar it
  was pulled from, else Marshee) plus every calendar Marshee copied it to. It
  shows if ANY of them is ticked.
- **People AND calendars** must both match. An event with no people follows only
  the calendars.
- **Tasks and planned habit days follow People only.** Tasks have people and no
  calendar; habit days belong to the viewer, so they follow the viewer's tick.
- **The live filter:** a hidden id the sheet can no longer list (a deactivated
  person, an unlinked or switched-off calendar) hides NOTHING and is not
  counted, or the person would be stuck with events they cannot bring back.
  `liveFilter` drops those ids; every view, the count and the sheet's ticks read
  the live filter. The STORED value is untouched, so a calendar switched back
  on comes back hidden (and counted).
- **The count** on the Filter circle is the hidden ids that still exist today. The circle (solid, count
  chip, label "Filtered") is the only sign a filter is on: no strip or banner.
- **Search and the dashboard Calendar tile ignore the filter** (Bryce's call).

## Where things live

| Piece | File |
|---|---|
| EVERY rule (the ONE home): predicates, live filter, tick helpers, Schedule day dropping (`filterScheduleMonths`) | `src/lib/calendarFilter.ts` |
| Remembered filter | `src/lib/calendarFilterStore.ts` |
| Filtered lists, count, sheet props (wiring only, no rules) | `src/lib/useCalendarFilterView.ts` |
| The sheet | `src/components/CalendarFilterSheet.tsx` |
| The circle | `CalendarHeader.tsx` + `ActionCircle` (`badge`, `active`, `ariaLabel`) |
| The calendar list for the sheet | `loadFilterCalendars` in `linkedCalendarsRead.ts` |

`CalendarViews.tsx` filters once and hands every view the filtered `events`,
`tasks` and `habitDays` (and the month panel's dots). Schedule gets the filter as
a prop and drops the days it empties (today's row stays).

Every filter rule lives in `calendarFilter.ts` and is tested there; the store, the hook and the sheet call its helpers (`isFilterEmpty`, `isPersonShown`, `isCalendarShown`) instead of inline checks. A second copy of any rule anywhere else is a BLOCKER.

The sheet's account headings come from `loadFilterCalendars`: the account's label, else "<owner>'s Google"; an owner's second and later unlabelled accounts add the email in brackets. Emails are otherwise kept off the Calendar page.
