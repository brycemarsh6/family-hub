// Unit tests for the all-day row's pure rules — mission-73 (PR 7).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TIMELINE_ALL_DAY_LANES,
  allDayHiddenCount,
  timelineAllDayItems,
} from "./timelineAllDay";
import { localDayToAllDayInstant } from "./calendarDates";
import type { CalendarHabitDayView, CalendarTaskView } from "./types";

const DAY_ONE = new Date(2026, 10, 9);
const DAY_TWO = new Date(2026, 10, 10);
const DAY_THREE = new Date(2026, 10, 11);
const COLUMNS = [DAY_ONE, DAY_TWO, DAY_THREE];

function allDayEvent(id: string, day: Date, lastDay: Date = day) {
  const end = new Date(lastDay);
  end.setDate(end.getDate() + 1);
  return {
    id,
    startAt: localDayToAllDayInstant(day),
    endAt: localDayToAllDayInstant(end),
    allDay: true,
  };
}

function task(id: string, day: Date): CalendarTaskView {
  return {
    id,
    title: id,
    details: null,
    dueDate: localDayToAllDayInstant(day),
    completedAt: null,
    people: [],
    isMine: true,
  };
}

function habitDay(id: string, day: Date): CalendarHabitDayView {
  return {
    id,
    habitId: "h",
    title: id,
    icon: null,
    kind: "habit",
    dayInstant: localDayToAllDayInstant(day),
    done: false,
  };
}

test("TIMELINE_ALL_DAY_LANES is two", () => {
  assert.equal(TIMELINE_ALL_DAY_LANES, 2);
});

test("timelineAllDayItems: events first, then tasks, then habit days, each a one-day all-day span", () => {
  const event = allDayEvent("e1", DAY_ONE, DAY_TWO);
  const items = timelineAllDayItems([event], [task("t1", DAY_TWO)], [habitDay("h:1", DAY_THREE)]);
  assert.deepEqual(items.map((item) => item.id), ["e1", "t1", "h:1"]);
  assert.equal(items[0], event);
  assert.equal(items[1].startAt.getTime(), localDayToAllDayInstant(DAY_TWO).getTime());
  assert.equal(items[1].endAt.getTime(), localDayToAllDayInstant(DAY_THREE).getTime());
  assert.equal(items[2].startAt.getTime(), localDayToAllDayInstant(DAY_THREE).getTime());
  assert.equal(items[2].endAt.getTime(), localDayToAllDayInstant(new Date(2026, 10, 12)).getTime());
  assert.ok(items.every((item) => item.allDay));
});

test("timelineAllDayItems: nothing in, nothing out", () => {
  assert.deepEqual(timelineAllDayItems([], [], []), []);
});

test("allDayHiddenCount: nothing hidden at or under two lanes", () => {
  assert.equal(allDayHiddenCount(COLUMNS, []), 0);
  const items = [allDayEvent("a", DAY_ONE), allDayEvent("b", DAY_ONE)];
  assert.equal(allDayHiddenCount(COLUMNS, items), 0);
});

test("allDayHiddenCount: totals what falls past the second lane across columns", () => {
  const items = [
    allDayEvent("a", DAY_ONE),
    allDayEvent("b", DAY_ONE),
    allDayEvent("c", DAY_ONE),
    allDayEvent("d", DAY_ONE),
    allDayEvent("e", DAY_THREE),
    allDayEvent("f", DAY_THREE),
    allDayEvent("g", DAY_THREE),
  ];
  assert.equal(allDayHiddenCount(COLUMNS, items), 3);
});

test("allDayHiddenCount: items outside the columns do not count", () => {
  const far = new Date(2026, 11, 20);
  const items = [allDayEvent("a", far), allDayEvent("b", far), allDayEvent("c", far)];
  assert.equal(allDayHiddenCount(COLUMNS, items), 0);
});
