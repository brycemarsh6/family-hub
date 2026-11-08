// Tests calendarWidget.ts: the Calendar widget's next item, per-day items,
// caps and empty-state words. Instants are built from local components (and
// UTC-midnight for all-day rows, the way the database stores them) so the
// file passes in both TZ=America/Denver and TZ=UTC. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarDayItems,
  capDayItems,
  dayEmptyWord,
  nextCalendarItem,
  nextEmptyWord,
  nextItemWhen,
  widgetDays,
  type CalendarWidgetData,
  type DayItems,
} from "./calendarWidget";
import { CALENDAR_WIDGET_DEFAULTS, type CalendarWidgetOptions } from "./dashboardWidgetOptions";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "./types";

// Thu 2026-11-12 is "today"; it is 2 PM.
const today = new Date(2026, 10, 12);
const now = new Date(2026, 10, 12, 14);
const local = (day: number, hour = 0, minute = 0) => new Date(2026, 10, day, hour, minute);
const utcDay = (day: number) => new Date(Date.UTC(2026, 10, day));
const opts = (patch: Partial<CalendarWidgetOptions> = {}): CalendarWidgetOptions => ({ ...CALENDAR_WIDGET_DEFAULTS, ...patch });

function event(id: string, startAt: Date, endAt: Date, allDay = false): CalendarEventView {
  return { id, title: id, notes: null, location: null, startAt, endAt, allDay, people: [], createdByName: null };
}
const timed = (id: string, startDay: number, startHour: number, endDay: number, endHour: number) =>
  event(id, local(startDay, startHour), local(endDay, endHour));
// An all-day event stores UTC-midnight instants, end exclusive.
const allDayEvent = (id: string, firstDay: number, lastDay = firstDay) => event(id, utcDay(firstDay), utcDay(lastDay + 1), true);
const task = (id: string, day: number, done = false): CalendarTaskView => ({
  id, title: id, details: null, dueDate: utcDay(day), completedAt: done ? local(1) : null, people: [], isMine: false,
});
const habit = (id: string, day: number, done = false): CalendarHabitDayView => ({
  id: `${id}:${day}`, habitId: id, title: id, icon: null, kind: "habit", dayInstant: utcDay(day), done,
});
const data = (parts: Partial<CalendarWidgetData>): CalendarWidgetData => ({ events: [], tasks: [], habitDays: [], ...parts });
const ids = (list: { id: string }[]) => list.map((i) => i.id);

test("widgetDays: today and the next days, local midnights", () => {
  const days = widgetDays(local(12, 15), 3);
  assert.deepEqual(days.map((d) => d.getTime()), [local(12).getTime(), local(13).getTime(), local(14).getTime()]);
  assert.deepEqual(widgetDays(today, 0), []);
});

test("next: a timed event later today, ordered ahead of tomorrow's", () => {
  const out = nextCalendarItem(data({ events: [timed("tomorrow", 13, 9, 13, 10), timed("later", 12, 16, 12, 17)] }), today, now, opts());
  assert.ok(out?.type === "event");
  assert.equal(out.event.id, "later");
  assert.equal(out.day.getTime(), today.getTime());
});

test("next: an event that already ended is skipped, one still running counts", () => {
  const ended = timed("ended", 12, 9, 12, 10);
  assert.equal(nextCalendarItem(data({ events: [ended] }), today, now, opts()), null);
  const running = timed("running", 12, 13, 12, 15);
  const out = nextCalendarItem(data({ events: [ended, running] }), today, now, opts());
  assert.ok(out?.type === "event" && out.event.id === "running");
  // ending exactly at now counts as ended
  assert.equal(nextCalendarItem(data({ events: [timed("edge", 12, 13, 12, 14)] }), today, now, opts()), null);
});

test("next: an all-day event today counts, and sorts by Schedule's order after earlier-starting ones", () => {
  const out = nextCalendarItem(data({ events: [allDayEvent("holiday", 12), timed("lunch", 12, 15, 12, 16)] }), today, now, opts());
  assert.ok(out?.type === "event");
  assert.equal(out.event.id, "holiday");
  assert.equal(nextCalendarItem(data({ events: [allDayEvent("holiday", 12)] }), today, now, opts())?.type, "event");
});

test("next: a multi-day event that started yesterday is today's next item", () => {
  const trip = event("trip", local(11, 9), local(14, 17));
  const out = nextCalendarItem(data({ events: [trip, timed("tomorrow", 13, 9, 13, 10)] }), today, now, opts());
  assert.ok(out?.type === "event" && out.event.id === "trip");
  assert.equal(out.day.getTime(), today.getTime());
});

test("next: nothing in 7 days is null, the 7th day (today+6) counts, the 8th is excluded", () => {
  assert.equal(nextCalendarItem(data({}), today, now, opts()), null);
  assert.equal(nextCalendarItem(data({ events: [timed("far", 18, 9, 18, 10)] }), today, now, opts())?.type, "event");
  assert.equal(nextCalendarItem(data({ events: [timed("far", 19, 9, 19, 10)] }), today, now, opts()), null);
  assert.equal(nextCalendarItem(data({ tasks: [task("t", 19)] }), today, now, opts({ tasksOnly: true })), null);
});

test("next with tasksOnly: the earliest undone task, completed and overdue skipped", () => {
  const tasks = [task("done", 12, true), task("overdue", 10), task("late", 15), task("soon", 13), task("also", 13)];
  const out = nextCalendarItem(data({ tasks, events: [timed("e", 12, 16, 12, 17)] }), today, now, opts({ tasksOnly: true }));
  assert.ok(out?.type === "task");
  assert.equal(out.task.id, "soon");
  assert.equal(out.day.getTime(), local(13).getTime());
  assert.equal(nextCalendarItem(data({ tasks: [task("done", 12, true)] }), today, now, opts({ tasksOnly: true })), null);
});

test("nextItemWhen: Today, Tomorrow, a weekday, All day and tasks", () => {
  const when = (item: Parameters<typeof nextItemWhen>[0]) => nextItemWhen(item, today);
  const at = (e: CalendarEventView, day: number) => ({ type: "event" as const, event: e, day: local(day) });
  assert.equal(when(at(timed("a", 12, 15, 12, 16), 12)), "Today, 3 PM");
  assert.equal(when(at(event("b", local(13, 9, 30), local(13, 10)), 13)), "Tomorrow, 9:30 AM");
  assert.equal(when(at(allDayEvent("c", 16), 16)), "Mon, All day");
  assert.equal(when(at(allDayEvent("d", 12), 12)), "Today, All day");
  assert.equal(when(at(event("e", local(11, 9), local(14, 17)), 12)), "Today, All day");
  assert.equal(when({ type: "task", task: task("t", 12), day: local(12) }), "Today");
  assert.equal(when({ type: "task", task: task("t", 13), day: local(13) }), "Tomorrow");
  assert.equal(when({ type: "task", task: task("t", 14), day: local(14) }), "Sat");
});

test("day items: tasks, habit days, then events; a multi-day event shows on each covered day", () => {
  const trip = event("trip", local(12, 9), local(14, 17));
  const d = data({
    events: [timed("b", 13, 15, 13, 16), timed("a", 13, 9, 13, 10), trip, allDayEvent("off", 14)],
    tasks: [task("t13", 13), task("t14", 14)],
    habitDays: [habit("h", 13)],
  });
  const out = calendarDayItems(d, local(13), now, opts(), { hideEnded: false });
  assert.deepEqual(ids(out.tasks), ["t13"]);
  assert.deepEqual(ids(out.habitDays), ["h:13"]);
  assert.deepEqual(ids(out.events), ["trip", "a", "b"]);
  assert.equal(out.endedHidden, 0);
  assert.deepEqual(ids(calendarDayItems(d, local(14), now, opts(), { hideEnded: false }).events).sort(), ["off", "trip"]);
  assert.deepEqual(ids(calendarDayItems(d, local(12), now, opts(), { hideEnded: false }).events), ["trip"]);
});

test("day items: hideEnded hides ended timed events only and counts them", () => {
  const d = data({
    events: [timed("past", 12, 9, 12, 10), timed("now", 12, 13, 12, 15), timed("edge", 12, 12, 12, 14), allDayEvent("holiday", 12)],
    tasks: [task("done", 12, true)],
    habitDays: [habit("h", 12, true)],
  });
  const hidden = calendarDayItems(d, today, now, opts(), { hideEnded: true });
  assert.deepEqual(ids(hidden.events).sort(), ["holiday", "now"]);
  assert.equal(hidden.endedHidden, 2);
  assert.deepEqual(ids(hidden.tasks), ["done"]);
  assert.deepEqual(ids(hidden.habitDays), ["h:12"]);
  const shown = calendarDayItems(d, today, now, opts(), { hideEnded: false });
  assert.equal(shown.events.length, 4);
  assert.equal(shown.endedHidden, 0);
});

test("day items: tasksOnly empties events and habit days and hides nothing", () => {
  const d = data({ events: [timed("e", 12, 9, 12, 10)], tasks: [task("t", 12)], habitDays: [habit("h", 12)] });
  const out = calendarDayItems(d, today, now, opts({ tasksOnly: true }), { hideEnded: true });
  assert.deepEqual(ids(out.tasks), ["t"]);
  assert.deepEqual([out.habitDays, out.events, out.endedHidden], [[], [], 0]);
});

test("capDayItems: keeps the first N across tasks, habit days, events and counts the rest", () => {
  const items: DayItems = {
    tasks: [task("t1", 12), task("t2", 12)],
    habitDays: [habit("h", 12)],
    events: [timed("e1", 12, 15, 12, 16), timed("e2", 12, 17, 12, 18)],
    endedHidden: 3,
  };
  const two = capDayItems(items, 2);
  assert.deepEqual([ids(two.tasks), two.habitDays.length, two.events.length, two.more, two.endedHidden], [["t1", "t2"], 0, 0, 3, 3]);
  const four = capDayItems(items, 4);
  assert.deepEqual([ids(four.habitDays), ids(four.events), four.more], [["h:12"], ["e1"], 1]);
  assert.equal(capDayItems(items, 5).more, 0);
  assert.equal(capDayItems(items, 99).more, 0);
  assert.equal(capDayItems(items, 0).more, 5);
});

test("capDayItems: open items win the room, done ones go last", () => {
  const items: DayItems = {
    tasks: [task("tDone", 12, true), task("tOpen", 12)],
    habitDays: [habit("hDone", 12, true)],
    events: [timed("e1", 12, 15, 12, 16), timed("e2", 12, 17, 12, 18)],
    endedHidden: 0,
  };
  const three = capDayItems(items, 3);
  assert.deepEqual([ids(three.tasks), three.habitDays.length, ids(three.events), three.more], [["tOpen"], 0, ["e1", "e2"], 2]);
  const four = capDayItems(items, 4);
  assert.deepEqual([ids(four.tasks), ids(four.habitDays), ids(four.events), four.more], [["tOpen", "tDone"], [], ["e1", "e2"], 1]);
  const five = capDayItems(items, 5);
  assert.deepEqual([ids(five.tasks), ids(five.habitDays), five.more], [["tOpen", "tDone"], ["hDone:12"], 0]);
});

test("capDayItems: an open habit day outranks events, and open comes before done inside each list", () => {
  const items: DayItems = {
    tasks: [],
    habitDays: [habit("hDone", 12, true), habit("hOpen", 12)],
    events: [timed("e1", 12, 15, 12, 16)],
    endedHidden: 0,
  };
  const two = capDayItems(items, 2);
  assert.deepEqual([ids(two.habitDays), ids(two.events), two.more], [["hOpen:12"], ["e1"], 1]);
  assert.deepEqual(ids(capDayItems(items, 9).habitDays), ["hOpen:12", "hDone:12"]);
});

test("day items: open tasks and habit days come before done ones", () => {
  const d = data({
    tasks: [task("tDone", 12, true), task("tOpen", 12), task("tOpen2", 12)],
    habitDays: [habit("hDone", 12, true), habit("hOpen", 12)],
  });
  const out = calendarDayItems(d, today, now, opts(), { hideEnded: false });
  assert.deepEqual(ids(out.tasks), ["tOpen", "tOpen2", "tDone"]);
  assert.deepEqual(ids(out.habitDays), ["hOpen:12", "hDone:12"]);
});

test("empty words: every branch", () => {
  const empty: DayItems = { tasks: [], habitDays: [], events: [], endedHidden: 0 };
  const ended = { ...empty, endedHidden: 2 };
  const full = { ...empty, tasks: [task("t", 12)] };
  assert.equal(dayEmptyWord(empty, opts(), "today"), "Nothing today");
  assert.equal(dayEmptyWord(ended, opts(), "today"), "Nothing else today");
  assert.equal(dayEmptyWord(empty, opts({ tasksOnly: true }), "today"), "No tasks today");
  assert.equal(dayEmptyWord(ended, opts({ tasksOnly: true }), "today"), "No tasks today");
  assert.equal(dayEmptyWord(empty, opts(), "column"), "Nothing");
  assert.equal(dayEmptyWord(ended, opts(), "column"), "Nothing");
  assert.equal(dayEmptyWord(empty, opts({ tasksOnly: true }), "column"), "No tasks");
  assert.equal(dayEmptyWord(full, opts(), "today"), null);
  assert.equal(dayEmptyWord(full, opts(), "column"), null);
  assert.equal(nextEmptyWord(opts()), "Nothing in the next 7 days");
  assert.equal(nextEmptyWord(opts({ tasksOnly: true })), "No tasks in the next 7 days");
});
