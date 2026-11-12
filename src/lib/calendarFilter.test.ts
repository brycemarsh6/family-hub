// Tests for the Calendar filter's rules (mission 78). Pure functions only.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CALENDAR_FILTER,
  MARSHEE_CALENDAR_KEY,
  eventCalendarKeys,
  eventPasses,
  filterRows,
  habitDaysPass,
  hiddenCount,
  parseStoredFilter,
  taskPasses,
  toggleHiddenCalendar,
  toggleHiddenPerson,
  type CalendarFilter,
} from "./calendarFilter";
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
