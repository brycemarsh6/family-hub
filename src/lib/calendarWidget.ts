import { addDays, isSameDay, startOfDay, SHORT_DAY_NAMES } from "./mealPlanDates";
import { allDayInstantToLocalDay, daysEventCovers, formatClockTime, isPast } from "./calendarDates";
import { compareEvents } from "./scheduleWindow";
import { CALENDAR_WIDGET_WORDS } from "./dashboardWidgets";
import type { CalendarWidgetOptions } from "./dashboardWidgetOptions";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "./types";

// Pure logic for the dashboard's Calendar widget (W2): which item is "next",
// what each day column holds, how it is capped, and the empty-state words.
// No React, no database, and no clock: `today` (a local midnight) and `now`
// always arrive as parameters. The BROWSER decides both, exactly as the
// Calendar page does, because the server getters are UTC on Vercel and would
// call the wrong day "today" for a household in Denver. Days are local
// midnights from `startOfDay`; events are matched to days by
// `daysEventCovers`, tasks by `allDayInstantToLocalDay(dueDate)` and habit
// days by `allDayInstantToLocalDay(dayInstant)` (the same rules Schedule
// uses), and events are ordered by Schedule's own `compareEvents`.

export type CalendarWidgetData = {
  events: CalendarEventView[];
  tasks: CalendarTaskView[];
  habitDays: CalendarHabitDayView[];
};

export type NextCalendarItem =
  | { type: "event"; event: CalendarEventView; day: Date }
  | { type: "task"; task: CalendarTaskView; day: Date };

export type DayItems = {
  tasks: CalendarTaskView[];
  habitDays: CalendarHabitDayView[];
  events: CalendarEventView[];
  /** How many ended timed events `hideEnded` left out. */
  endedHidden: number;
};

/** How many days ahead the "next item" line looks, today included (decision 233). */
const NEXT_LOOKAHEAD_DAYS = 7;

/** Today and the next `count - 1` days, as local midnights. */
export function widgetDays(today: Date, count: number): Date[] {
  const start = startOfDay(today);
  return Array.from({ length: Math.max(count, 0) }, (_, offset) => addDays(start, offset));
}

/**
 * The next thing coming up in the next 7 days (today included). Without
 * `tasksOnly` it is the next event that has not ended: a timed event needs
 * `endAt > now`, an all-day event counts while it covers today or a later day
 * in range. Events are ordered by the first day they cover from today on, then
 * by Schedule's sort. With `tasksOnly` it is the earliest task not yet done.
 * Null when nothing qualifies.
 */
export function nextCalendarItem(
  data: CalendarWidgetData,
  today: Date,
  now: Date,
  options: CalendarWidgetOptions,
): NextCalendarItem | null {
  const days = widgetDays(today, NEXT_LOOKAHEAD_DAYS);
  if (options.tasksOnly) {
    let best: { task: CalendarTaskView; day: Date } | null = null;
    for (const task of data.tasks) {
      if (task.completedAt !== null) continue;
      const day = allDayInstantToLocalDay(task.dueDate);
      if (!days.some((d) => isSameDay(d, day))) continue;
      if (best === null || day.getTime() < best.day.getTime()) best = { task, day };
    }
    return best ? { type: "task", ...best } : null;
  }
  const found: { event: CalendarEventView; day: Date }[] = [];
  for (const event of data.events) {
    if (!event.allDay && isPast(event.endAt, now)) continue;
    const [day] = daysEventCovers(event.startAt, event.endAt, event.allDay, days);
    if (day) found.push({ event, day });
  }
  found.sort((a, b) => a.day.getTime() - b.day.getTime() || compareEvents(a.event, b.event));
  return found.length > 0 ? { type: "event", ...found[0] } : null;
}

function dayWord(day: Date, today: Date): string {
  if (isSameDay(day, today)) return CALENDAR_WIDGET_WORDS.today;
  if (isSameDay(day, addDays(startOfDay(today), 1))) return CALENDAR_WIDGET_WORDS.tomorrow;
  return SHORT_DAY_NAMES[day.getDay()];
}

/**
 * The "when" line of the next item: "Today, 3 PM", "Tomorrow, 9 AM",
 * "Thu, All day". A task reads as the day alone. An all-day event reads as
 * the day plus "All day". A timed event reads its start time on the day it
 * starts; seen on a LATER day of a multi-day span (it began earlier), it reads
 * "All day" because it fills that day. Times use the house style, so on the
 * hour there is no ":00".
 */
export function nextItemWhen(item: NextCalendarItem, today: Date): string {
  const word = dayWord(item.day, startOfDay(today));
  if (item.type === "task") return word;
  const { event } = item;
  const startsToday = isSameDay(startOfDay(event.startAt), item.day);
  if (event.allDay || !startsToday) return `${word}, ${CALENDAR_WIDGET_WORDS.allDay}`;
  return `${word}, ${formatClockTime(event.startAt)}`;
}

/**
 * Everything on one day, in DaySection order: tasks, planned habit days, then
 * events (Schedule's sort). `tasksOnly` empties the habit days and events.
 * `hideEnded` hides only timed events that have ended (`endAt <= now`) and
 * counts them in `endedHidden`; all-day events, tasks and habit days are never
 * hidden, and a completed task or a done habit stays.
 */
export function calendarDayItems(
  data: CalendarWidgetData,
  day: Date,
  now: Date,
  options: CalendarWidgetOptions,
  { hideEnded }: { hideEnded: boolean },
): DayItems {
  const tasks = data.tasks.filter((task) => isSameDay(allDayInstantToLocalDay(task.dueDate), day));
  if (options.tasksOnly) return { tasks, habitDays: [], events: [], endedHidden: 0 };
  const habitDays = data.habitDays.filter((item) => isSameDay(allDayInstantToLocalDay(item.dayInstant), day));
  const onDay = data.events
    .filter((event) => daysEventCovers(event.startAt, event.endAt, event.allDay, [day]).length > 0)
    .sort(compareEvents);
  const events = hideEnded ? onDay.filter((event) => event.allDay || !isPast(event.endAt, now)) : onDay;
  return { tasks, habitDays, events, endedHidden: onDay.length - events.length };
}

/** The first `limit` items across tasks, then habit days, then events; `more` counts the rest, for "+N more". */
export function capDayItems(items: DayItems, limit: number): DayItems & { more: number } {
  let room = Math.max(limit, 0);
  const take = <T>(list: T[]): T[] => {
    const kept = list.slice(0, room);
    room -= kept.length;
    return kept;
  };
  const tasks = take(items.tasks);
  const habitDays = take(items.habitDays);
  const events = take(items.events);
  const total = items.tasks.length + items.habitDays.length + items.events.length;
  return { tasks, habitDays, events, endedHidden: items.endedHidden, more: total - (tasks.length + habitDays.length + events.length) };
}

/**
 * The empty line for a day, or null when it has items. "today" scope is the
 * Today list ("Nothing else today" once ended events were hidden); "column"
 * scope is one day column ("Nothing").
 */
export function dayEmptyWord(
  items: DayItems,
  options: CalendarWidgetOptions,
  scope: "today" | "column",
): string | null {
  if (items.tasks.length + items.habitDays.length + items.events.length > 0) return null;
  if (scope === "column") return options.tasksOnly ? CALENDAR_WIDGET_WORDS.dayEmptyTasks : CALENDAR_WIDGET_WORDS.dayEmpty;
  if (options.tasksOnly) return CALENDAR_WIDGET_WORDS.todayEmptyTasks;
  return items.endedHidden > 0 ? CALENDAR_WIDGET_WORDS.todayEnded : CALENDAR_WIDGET_WORDS.todayEmpty;
}

/** The empty line when nothing is coming up in the next 7 days. */
export function nextEmptyWord(options: CalendarWidgetOptions): string {
  return options.tasksOnly ? CALENDAR_WIDGET_WORDS.nextEmptyTasks : CALENDAR_WIDGET_WORDS.nextEmpty;
}
