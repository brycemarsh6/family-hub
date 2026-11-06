import { test } from "node:test";
import assert from "node:assert/strict";
import { toAssistantEvent } from "./serializeCalendar";

const base = {
  id: "e1",
  title: "Zzz Dentist",
  notes: null,
  location: "Main St",
  startAt: new Date("2026-10-12T00:00:00Z"),
  endAt: new Date("2026-10-14T00:00:00Z"),
  allDay: true,
  people: [{ userId: "u1", displayName: "Zed", avatarColor: "#fff" }],
};

test("all-day events carry UTC calendar dates, end exclusive", () => {
  const e = toAssistantEvent(base);
  assert.equal(e.startDate, "2026-10-12");
  assert.equal(e.endDate, "2026-10-14");
});

test("timed events omit startDate/endDate", () => {
  const e = toAssistantEvent({ ...base, allDay: false, startAt: new Date("2026-10-12T00:30:00Z") });
  assert.equal("startDate" in e, false);
  assert.equal("endDate" in e, false);
  assert.equal(e.start, "2026-10-12T00:30:00.000Z");
});

test("key sets: no avatar colour, no creator, people are {id, name}", () => {
  const e = toAssistantEvent({ ...base, createdByName: "X", avatarColor: "y" } as never);
  assert.deepEqual(Object.keys(e).sort(), [
    "allDay", "end", "endDate", "id", "location", "notes", "people", "start", "startDate", "title",
  ]);
  assert.deepEqual(e.people, [{ id: "u1", name: "Zed" }]);
});
