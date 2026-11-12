// Tests for the Calendar filter's rules (mission 78). Pure functions only.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CALENDAR_FILTER,
  MARSHEE_CALENDAR_KEY,
  eventCalendarKeys,
  eventPasses,
  filterRows,
  filterScheduleMonths,
  habitDaysPass,
  hiddenCount,
  isCalendarShown,
  isFilterEmpty,
  isPersonShown,
  liveFilter,
  parseStoredFilter,
  taskPasses,
  toggleHiddenCalendar,
  toggleHiddenPerson,
  type CalendarFilter,
} from "./calendarFilter";
import type { ScheduleRenderMonthWithHabits } from "./scheduleHabitDays";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "./types";

const person = (userId: string) => ({ userId, displayName: userId, avatarColor: "x", deactivated: false });
const sync = (linkedCalendarId: string) => ({
  linkedCalendarId,
  calendarName: linkedCalendarId,
  status: "ok" as const,
  failReason: null,
});

function event(over: Partial<CalendarEventView> = {}): CalendarEventView {
  return {
    id: "e1",
    title: "Event",
    notes: null,
    location: null,
    startAt: new Date(2026, 10, 12, 9),
    endAt: new Date(2026, 10, 12, 10),
    allDay: false,
    people: [person("ann")],
    createdByName: null,
    syncs: [],
    ...over,
  };
}

function task(people: string[]): CalendarTaskView {
  return {
    id: "t1",
    title: "Task",
    details: null,
    dueDate: new Date(2026, 10, 12),
    completedAt: null,
    people: people.map(person),
    isMine: false,
  };
}

const hide = (over: Partial<CalendarFilter>): CalendarFilter => ({ ...EMPTY_CALENDAR_FILTER, ...over });

test("eventCalendarKeys: Marshee-made is 'marshee', pulled is its source, copies are added once", () => {
  assert.deepEqual(eventCalendarKeys(event()), [MARSHEE_CALENDAR_KEY]);
  assert.deepEqual(eventCalendarKeys(event({ sourceLinkedCalendarId: "gcal1" })), ["gcal1"]);
  assert.deepEqual(eventCalendarKeys(event({ syncs: [sync("work"), sync("work")] })), ["marshee", "work"]);
});

test("eventPasses: a pulled event hides when its source calendar is hidden", () => {
  const pulled = event({ sourceLinkedCalendarId: "gcal1" });
  assert.equal(eventPasses(pulled, hide({ hiddenCalendars: ["gcal1"] })), false);
  assert.equal(eventPasses(pulled, hide({ hiddenCalendars: ["marshee"] })), true);
});

test("eventPasses: a Marshee event copied to Work stays when only Work is hidden", () => {
  const copied = event({ syncs: [sync("work")] });
  assert.equal(eventPasses(copied, hide({ hiddenCalendars: ["work"] })), true);
});

test("eventPasses: a Marshee event copied to Work hides when marshee and Work are both hidden", () => {
  const copied = event({ syncs: [sync("work")] });
  assert.equal(eventPasses(copied, hide({ hiddenCalendars: ["marshee", "work"] })), false);
});

test("eventPasses: an event with no people ignores the people check", () => {
  assert.equal(eventPasses(event({ people: [] }), hide({ hiddenPeople: ["ann"] })), true);
});

test("eventPasses: shows while any person is shown, hides when every person is hidden", () => {
  const two = event({ people: [person("ann"), person("bob")] });
  assert.equal(eventPasses(two, hide({ hiddenPeople: ["ann"] })), true);
  assert.equal(eventPasses(two, hide({ hiddenPeople: ["ann", "bob"] })), false);
});

test("eventPasses: people AND calendars must both match", () => {
  const e = event({ sourceLinkedCalendarId: "gcal1" });
  assert.equal(eventPasses(e, hide({ hiddenPeople: ["ann"] })), false);
  assert.equal(eventPasses(e, hide({ hiddenCalendars: ["gcal1"] })), false);
  assert.equal(eventPasses(e, EMPTY_CALENDAR_FILTER), true);
});

test("taskPasses: follows People only", () => {
  assert.equal(taskPasses(task([]), hide({ hiddenPeople: ["ann"] })), true);
  assert.equal(taskPasses(task(["ann"]), hide({ hiddenPeople: ["ann"] })), false);
  assert.equal(taskPasses(task(["ann", "bob"]), hide({ hiddenPeople: ["ann"] })), true);
  assert.equal(taskPasses(task(["ann"]), hide({ hiddenCalendars: ["marshee"] })), true);
});

test("habitDaysPass: hidden when the viewer is hidden, shown for a null viewer", () => {
  assert.equal(habitDaysPass("ann", hide({ hiddenPeople: ["ann"] })), false);
  assert.equal(habitDaysPass("ann", hide({ hiddenPeople: ["bob"] })), true);
  assert.equal(habitDaysPass(null, hide({ hiddenPeople: ["ann"] })), true);
});

test("filterRows: filters each list and keeps the rest of the row", () => {
  const habit: CalendarHabitDayView = {
    id: "h:2026-11-12",
    habitId: "h",
    title: "Run",
    icon: null,
    kind: "habit",
    done: false,
  } as CalendarHabitDayView;
  const rows = {
    label: "row",
    events: [event({ id: "a" }), event({ id: "b", people: [person("bob")] })],
    tasks: [task(["ann"]), task(["bob"])],
    habitDays: [habit],
  };
  const out = filterRows(rows, hide({ hiddenPeople: ["ann"] }), "ann");
  assert.equal(out.label, "row");
  assert.deepEqual(out.events.map((e) => e.id), ["b"]);
  assert.equal(out.tasks.length, 1);
  assert.deepEqual(out.habitDays, []);
  assert.equal(filterRows(rows, hide({ hiddenPeople: ["ann"] }), "bob").habitDays.length, 1);
});

test("hiddenCount: counts only hidden ids still in today's lists", () => {
  const filter = hide({ hiddenPeople: ["ann", "gone"], hiddenCalendars: ["work", "unlinked"] });
  assert.equal(hiddenCount(filter, ["ann", "bob"], ["marshee", "work"]), 2);
  assert.equal(hiddenCount(EMPTY_CALENDAR_FILTER, ["ann"], ["marshee"]), 0);
});

test("toggleHidden: adds then removes, returning a new filter", () => {
  const once = toggleHiddenPerson(EMPTY_CALENDAR_FILTER, "ann");
  assert.deepEqual(once.hiddenPeople, ["ann"]);
  assert.deepEqual(EMPTY_CALENDAR_FILTER.hiddenPeople, []);
  assert.deepEqual(toggleHiddenPerson(once, "ann").hiddenPeople, []);
  const cal = toggleHiddenCalendar(once, "work");
  assert.deepEqual(cal, { hiddenPeople: ["ann"], hiddenCalendars: ["work"] });
  assert.deepEqual(toggleHiddenCalendar(cal, "work").hiddenCalendars, []);
});

test("parseStoredFilter: anything malformed is the empty filter", () => {
  assert.deepEqual(parseStoredFilter(null), EMPTY_CALENDAR_FILTER);
  assert.deepEqual(parseStoredFilter("{"), EMPTY_CALENDAR_FILTER);
  assert.deepEqual(parseStoredFilter("[]"), EMPTY_CALENDAR_FILTER);
  assert.deepEqual(parseStoredFilter('{"hiddenPeople":5}'), EMPTY_CALENDAR_FILTER);
  assert.deepEqual(parseStoredFilter('{"hiddenPeople":["a"],"hiddenCalendars":[1]}'), EMPTY_CALENDAR_FILTER);
});

test("parseStoredFilter: a good value comes back as stored", () => {
  assert.deepEqual(parseStoredFilter('{"hiddenPeople":["ann"],"hiddenCalendars":["marshee"]}'), {
    hiddenPeople: ["ann"],
    hiddenCalendars: ["marshee"],
  });
});

test("liveFilter: drops hidden ids the lists no longer hold, keeps the rest", () => {
  const live = liveFilter(hide({ hiddenPeople: ["ann", "gone"], hiddenCalendars: ["work", "old"] }), ["ann", "bo"], [MARSHEE_CALENDAR_KEY, "work"]);
  assert.deepEqual(live, { hiddenPeople: ["ann"], hiddenCalendars: ["work"] });
});

test("live filter: an event from a calendar no longer listed shows, and the count is 0", () => {
  const stored = hide({ hiddenCalendars: ["old"] });
  const live = liveFilter(stored, ["ann"], [MARSHEE_CALENDAR_KEY, "work"]);
  assert.equal(eventPasses(event({ sourceLinkedCalendarId: "old" }), live), true);
  assert.equal(hiddenCount(stored, ["ann"], [MARSHEE_CALENDAR_KEY, "work"]), 0);
});

test("live filter: a deactivated person's hidden id hides nothing", () => {
  const stored = hide({ hiddenPeople: ["dee"] });
  const live = liveFilter(stored, ["ann"], [MARSHEE_CALENDAR_KEY]);
  assert.equal(eventPasses(event({ people: [person("dee")] }), live), true);
  assert.equal(taskPasses(task(["dee"]), live), true);
  assert.equal(hiddenCount(stored, ["ann"], [MARSHEE_CALENDAR_KEY]), 0);
});

test("live filter: a calendar listed again is hidden again", () => {
  const stored = hide({ hiddenCalendars: ["work"] });
  const evt = event({ sourceLinkedCalendarId: "work" });
  assert.equal(eventPasses(evt, liveFilter(stored, ["ann"], [MARSHEE_CALENDAR_KEY])), true);
  const relisted = liveFilter(stored, ["ann"], [MARSHEE_CALENDAR_KEY, "work"]);
  assert.equal(eventPasses(evt, relisted), false);
  assert.equal(hiddenCount(stored, ["ann"], [MARSHEE_CALENDAR_KEY, "work"]), 1);
});

test("isFilterEmpty, isPersonShown, isCalendarShown", () => {
  assert.equal(isFilterEmpty(EMPTY_CALENDAR_FILTER), true);
  assert.equal(isFilterEmpty(hide({ hiddenCalendars: ["x"] })), false);
  assert.equal(isPersonShown(hide({ hiddenPeople: ["ann"] }), "ann"), false);
  assert.equal(isPersonShown(hide({ hiddenPeople: ["ann"] }), "bo"), true);
  assert.equal(isCalendarShown(hide({ hiddenCalendars: ["x"] }), "x"), false);
  assert.equal(isCalendarShown(EMPTY_CALENDAR_FILTER, "x"), true);
});

const TODAY = new Date(2026, 10, 12);
const dayRow = (day: number, over: Partial<ScheduleRenderMonthWithHabits["days"][number]> = {}) => ({
  day: new Date(2026, 10, day),
  events: [] as CalendarEventView[],
  tasks: [] as CalendarTaskView[],
  habitDays: [] as CalendarHabitDayView[],
  ...over,
});
const month = (days: ScheduleRenderMonthWithHabits["days"]): ScheduleRenderMonthWithHabits => ({
  monthStart: new Date(2026, 10, 1),
  days,
});
const hideAnn = hide({ hiddenPeople: ["ann"] });
const annEvent = event({ people: [person("ann")] });

test("filterScheduleMonths: a day the filter empties drops out", () => {
  const out = filterScheduleMonths([month([dayRow(13, { events: [annEvent] }), dayRow(14, { events: [event({ id: "e2", people: [person("bo")] })] })])], hideAnn, null, TODAY);
  assert.deepEqual(out[0].days.map((row) => row.day.getDate()), [14]);
});

test("filterScheduleMonths: today's emptied row stays", () => {
  const out = filterScheduleMonths([month([dayRow(12, { events: [annEvent] })])], hideAnn, null, TODAY);
  assert.equal(out[0].days.length, 1);
  assert.equal(out[0].days[0].events.length, 0);
});

test("filterScheduleMonths: a day that was already empty keeps today's behaviour", () => {
  const out = filterScheduleMonths([month([dayRow(15)])], hideAnn, null, TODAY);
  assert.equal(out[0].days.length, 1);
});

test("filterScheduleMonths: a month left with no days drops out", () => {
  const out = filterScheduleMonths([month([dayRow(20, { events: [annEvent] })])], hideAnn, null, TODAY);
  assert.deepEqual(out, []);
});

test("filterScheduleMonths: an empty filter returns the same array", () => {
  const months = [month([dayRow(20, { events: [annEvent] })])];
  assert.equal(filterScheduleMonths(months, EMPTY_CALENDAR_FILTER, null, TODAY), months);
});
