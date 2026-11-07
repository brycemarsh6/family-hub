import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRIEFING_EVENT_TYPE,
  briefingDateLabel,
  briefingEvents,
  briefingTasks,
  briefingTitle,
  buildBriefingMessage,
  isBriefingHour,
  joinNames,
  type BriefingInput,
} from "./briefing";
import { formatAllDayLabel } from "./calendarDates";
import { formatHouseholdClock } from "./householdDate";

const FRI = { year: 2026, month: 11, day: 13 };

// Denver wall clock to an instant. Nov 13 is MST (UTC-7); Jul 10 is MDT (UTC-6).
const mst = (day: number, h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 10, day, h + 7, m, s));
const mdt = (day: number, h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 6, day, h + 6, m, s));
const clock = (instant: Date) => formatHouseholdClock(instant, "America/Denver", { dropZeroMinutes: true });
const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const base: BriefingInput = {
  name: "Bryce",
  today: FRI,
  vacationThrough: null,
  chores: [],
  tasks: [],
  events: [],
  meals: [],
  picks: [],
};

test("event type", () => {
  assert.equal(BRIEFING_EVENT_TYPE, "briefing.daily");
});

test("date label and title", () => {
  assert.equal(briefingDateLabel(FRI), "Friday, Nov 13");
  assert.equal(briefingTitle(FRI), "Marshee briefing: Friday, Nov 13");
});

test("the hour check in winter (MST) and summer (MDT)", () => {
  assert.equal(isBriefingHour(mst(13, 8, 59, 59)), false);
  assert.equal(isBriefingHour(mst(13, 9, 0, 0)), true);
  assert.equal(isBriefingHour(mst(13, 9, 59, 59)), true);
  assert.equal(isBriefingHour(mst(13, 10, 0, 0)), false);
  assert.equal(isBriefingHour(mdt(10, 8, 59, 59)), false);
  assert.equal(isBriefingHour(mdt(10, 9, 0, 0)), true);
  assert.equal(isBriefingHour(mdt(10, 9, 59, 59)), true);
  assert.equal(isBriefingHour(mdt(10, 10, 0, 0)), false);
});

test("joinNames", () => {
  assert.equal(joinNames(["Emily"]), "Emily");
  assert.equal(joinNames(["Emily", "Ledger"]), "Emily and Ledger");
  assert.equal(joinNames(["Emily", "Ledger", "Lucy"]), "Emily, Ledger and Lucy");
});

test("tasks: due today first, overdue most recent first, future dropped, singular and plural", () => {
  const out = briefingTasks(
    [
      { title: "Old", dueDate: utcDay(2026, 11, 10) },
      { title: "Soon", dueDate: utcDay(2026, 11, 14) },
      { title: "Yesterday A", dueDate: utcDay(2026, 11, 12) },
      { title: "Today A", dueDate: utcDay(2026, 11, 13) },
      { title: "Yesterday B", dueDate: utcDay(2026, 11, 12) },
      { title: "Today B", dueDate: utcDay(2026, 11, 13) },
    ],
    FRI,
  );
  assert.deepEqual(out, [
    "Today A",
    "Today B",
    "Yesterday A (1 day overdue)",
    "Yesterday B (1 day overdue)",
    "Old (3 days overdue)",
  ]);
});

test("events: a timed event, all-day, with others, in order", () => {
  const out = briefingEvents(
    [
      { title: "Date night", startAt: mst(13, 18, 30), endAt: mst(13, 21), allDay: false, others: ["Emily"] },
      { title: "Dentist", startAt: mst(13, 10), endAt: mst(13, 11), allDay: false, others: [] },
      { title: "Piano recital", startAt: utcDay(2026, 11, 13), endAt: utcDay(2026, 11, 14), allDay: true, others: ["Emily", "Ledger"] },
      { title: "Tomorrow", startAt: mst(14, 10), endAt: mst(14, 11), allDay: false, others: [] },
    ],
    FRI,
  );
  assert.deepEqual(out, [
    "All day Piano recital (with Emily and Ledger)",
    "10 AM Dentist",
    "6:30 PM Date night (with Emily)",
  ]);
});

test("events: a timed event ending at midnight does not touch the next day", () => {
  const late = { title: "Late", startAt: mst(13, 20), endAt: mst(14, 0), allDay: false, others: [] };
  assert.deepEqual(briefingEvents([late], FRI), ["8 PM Late"]);
  assert.deepEqual(briefingEvents([late], { year: 2026, month: 11, day: 14 }), []);
});

test("events: a trip from yesterday 6 PM to tomorrow 10 AM is Day 2 of 3, ahead of timed items", () => {
  const trip = { title: "Trip", startAt: mst(12, 18), endAt: mst(14, 10), allDay: false, others: [] };
  const lunch = { title: "Lunch", startAt: mst(13, 8), endAt: mst(13, 9), allDay: false, others: [] };
  assert.deepEqual(briefingEvents([lunch, trip], FRI), ["Day 2 of 3 Trip", "8 AM Lunch"]);
});

test("events: a multi-day all-day event reads Day N of M", () => {
  const camp = { title: "Camp", startAt: utcDay(2026, 11, 12), endAt: utcDay(2026, 11, 15), allDay: true, others: [] };
  assert.deepEqual(briefingEvents([camp], FRI), ["Day 2 of 3 Camp"]);
});

test("events: a Denver evening event that is already tomorrow in UTC still lands on today", () => {
  const dinner = { title: "Dinner", startAt: mst(13, 19), endAt: mst(13, 20), allDay: false, others: [] };
  assert.equal(dinner.startAt.toISOString(), "2026-11-14T02:00:00.000Z");
  assert.deepEqual(briefingEvents([dinner], FRI), ["7 PM Dinner"]);
});

test("the Calendar's own all-day badge still reads as before", () => {
  const day = new Date(2026, 10, 13);
  assert.equal(formatAllDayLabel(utcDay(2026, 11, 13), utcDay(2026, 11, 14), true, day), "All day");
  assert.equal(formatAllDayLabel(utcDay(2026, 11, 12), utcDay(2026, 11, 15), true, day), "Day 2 of 3");
});

const APPROVED = [
  "Good morning, Bryce. Here's Friday, Nov 13.",
  "Chores: Take out trash · Unload dishwasher",
  "Tasks: Call the HOA · Renew car registration (1 day overdue)",
  "Calendar: 10 AM Dentist · 6:30 PM Date night (with Emily)",
  "Meals: Breakfast: Oatmeal · Dinner: Chicken tacos",
  "Pick a day: Long run (this week) · Deep clean garage (this month). Tap the Pick a day card in Marshee.",
].join("\n");

const FULL: BriefingInput = {
  ...base,
  chores: ["Take out trash", "Unload dishwasher"],
  tasks: ["Call the HOA", "Renew car registration (1 day overdue)"],
  events: ["10 AM Dentist", "6:30 PM Date night (with Emily)"],
  meals: [
    { slot: "Breakfast", title: "Oatmeal" },
    { slot: "Lunch", title: null },
    { slot: "Dinner", title: "Chicken tacos" },
  ],
  picks: [
    { title: "Long run", period: "this week" },
    { title: "Deep clean garage", period: "this month" },
  ],
};

test("the approved six-line copy, word for word", () => {
  assert.equal(buildBriefingMessage(FULL), APPROVED);
});

test("everything empty: one line", () => {
  assert.equal(buildBriefingMessage(base), "Good morning, Bryce. Here's Friday, Nov 13. Nothing on today.");
});

test("empty sections hide", () => {
  assert.equal(
    buildBriefingMessage({ ...base, tasks: ["Call the HOA"] }),
    "Good morning, Bryce. Here's Friday, Nov 13.\nTasks: Call the HOA",
  );
});

test("vacation: through a later day, and on the last day; shown even with no chores", () => {
  assert.equal(
    buildBriefingMessage({ ...base, vacationThrough: { year: 2026, month: 11, day: 15 }, chores: ["Ignored"] }),
    "Good morning, Bryce. Here's Friday, Nov 13.\nChores: You're on vacation through Nov 15",
  );
  assert.equal(
    buildBriefingMessage({ ...base, vacationThrough: FRI }),
    "Good morning, Bryce. Here's Friday, Nov 13.\nChores: You're on vacation today",
  );
});

test("no output holds an en dash, an em dash or a narrow no-break space", () => {
  const outputs = [
    buildBriefingMessage(FULL),
    buildBriefingMessage(base),
    briefingTitle(FRI),
    clock(mst(13, 18, 30)),
    clock(mst(13, 0, 15)),
    ...briefingEvents(
      [
        { title: "Dinner", startAt: mst(13, 19, 15), endAt: mst(13, 20), allDay: false, others: ["Emily"] },
        { title: "Trip", startAt: mst(12, 18), endAt: mst(14, 10), allDay: false, others: [] },
      ],
      FRI,
    ),
  ];
  for (const text of outputs) assert.doesNotMatch(text, /[\u2013\u2014\u202f]/);
});
