import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planPull, type EventFields, type KnownEvent, type PullInput } from "./calendarSyncPull";
import type { GoogleEventIn } from "./google/types";

const NOW = new Date("2026-11-09T18:00:00Z");
const WINDOW = new Date("2026-10-10T00:00:00Z");
const T1 = new Date("2026-11-09T10:00:00Z"); // last push / pull
const EARLIER = new Date("2026-11-09T09:00:00Z");
const LATER = new Date("2026-11-09T12:00:00Z");
const LATEST = new Date("2026-11-09T14:00:00Z");

const CURRENT: EventFields = {
  title: "Dentist",
  notes: null,
  location: null,
  startAt: new Date("2026-11-12T19:00:00Z"),
  endAt: new Date("2026-11-12T20:00:00Z"),
  allDay: false,
};

function gEvent(over: Partial<GoogleEventIn> = {}): GoogleEventIn {
  return {
    id: "g1",
    status: "confirmed",
    etag: '"e2"',
    updated: LATER.toISOString(),
    summary: "Dentist",
    start: { dateTime: "2026-11-12T12:00:00-07:00" },
    end: { dateTime: "2026-11-12T13:00:00-07:00" },
    ...over,
  };
}

function knownEvent(over: Partial<KnownEvent> = {}): KnownEvent {
  return {
    eventId: "ev1",
    hasRow: true,
    etag: '"e1"',
    lastPushedAt: T1,
    lastPulledAt: null,
    eventUpdatedAt: T1,
    sourceLinkedCalendarId: null,
    current: CURRENT,
    ...over,
  };
}

function run(googleEvents: GoogleEventIn[], byGoogle: Record<string, KnownEvent> = {}, byMarshee: Record<string, KnownEvent> = {}) {
  const input: PullInput = {
    calendar: { id: "cal1" },
    linkerId: "u1",
    windowStart: WINDOW,
    googleEvents,
    known: { byGoogleId: new Map(Object.entries(byGoogle)), byMarsheeId: new Map(Object.entries(byMarshee)) },
    now: NOW,
  };
  return planPull(input);
}

describe("planPull inserts", () => {
  it("inserts an unknown event owned by the linker with a sync row", () => {
    const plan = run([gEvent()]);
    assert.equal(plan.inserts.length, 1);
    const ins = plan.inserts[0];
    assert.equal(ins.event.createdById, "u1");
    assert.deepEqual(ins.event.personIds, ["u1"]);
    assert.equal(ins.event.sourceLinkedCalendarId, "cal1");
    assert.equal(ins.event.title, "Dentist");
    assert.equal(ins.event.startAt.toISOString(), "2026-11-12T19:00:00.000Z");
    assert.deepEqual(ins.sync, {
      linkedCalendarId: "cal1",
      googleEventId: "g1",
      etag: '"e2"',
      status: "ok",
      lastPulledAt: NOW,
    });
    assert.deepEqual([plan.updates, plan.deletes, plan.pushBacks, plan.skipped], [[], [], [], []]);
  });

  it("inserts an all-day event at UTC midnight with an exclusive end", () => {
    const plan = run([gEvent({ start: { date: "2026-11-01" }, end: { date: "2026-11-02" } })]);
    const ev = plan.inserts[0].event;
    assert.equal(ev.allDay, true);
    assert.equal(ev.startAt.toISOString(), "2026-11-01T00:00:00.000Z");
    assert.equal(ev.endAt.toISOString(), "2026-11-02T00:00:00.000Z");
  });

  it("skips an unknown event that ended before the window", () => {
    const plan = run([gEvent({ start: { dateTime: "2026-09-01T10:00:00Z" }, end: { dateTime: "2026-09-01T11:00:00Z" } })]);
    assert.equal(plan.inserts.length, 0);
    assert.deepEqual(plan.skipped, [{ googleEventId: "g1", reason: "before-window" }]);
  });

  it("brings in an unknown event that is still running at the window start", () => {
    const plan = run([gEvent({ start: { dateTime: "2026-10-09T10:00:00Z" }, end: { dateTime: "2026-10-10T10:00:00Z" } })]);
    assert.equal(plan.inserts.length, 1);
  });

  it("skips working location and focus time", () => {
    const plan = run([gEvent({ id: "w", eventType: "workingLocation" }), gEvent({ id: "f", eventType: "focusTime" })]);
    assert.equal(plan.inserts.length, 0);
    assert.deepEqual(plan.skipped.map((s) => s.reason), ["not-an-event", "not-an-event"]);
  });

  it("treats tentative as confirmed", () => {
    assert.equal(run([gEvent({ status: "tentative" })]).inserts.length, 1);
  });

  it("strips Marshee's For line from the notes it brings in", () => {
    const plan = run([gEvent({ description: "Bring forms\n\nFor: Bryce" })]);
    assert.equal(plan.inserts[0].event.notes, "Bring forms");
  });

  it("imports a run that repeats an id once, from its last copy", () => {
    const plan = run([gEvent({ summary: "Old" }), gEvent({ summary: "New" })]);
    assert.equal(plan.inserts.length, 1);
    assert.equal(plan.inserts[0].event.title, "New");
  });
});

describe("planPull known events", () => {
  it("skips an echo when the etag equals the row's", () => {
    const plan = run([gEvent({ etag: '"e1"' })], { g1: knownEvent() });
    assert.deepEqual(plan.skipped, [{ googleEventId: "g1", reason: "echo" }]);
    assert.equal(plan.updates.length + plan.inserts.length + plan.deletes.length, 0);
  });

  it("takes a Google-only change, with no previousJson and no push back", () => {
    const plan = run([gEvent({ summary: "Dentist (moved)" })], { g1: knownEvent() });
    assert.equal(plan.updates.length, 1);
    const up = plan.updates[0];
    assert.equal(up.eventId, "ev1");
    assert.equal(up.fields?.title, "Dentist (moved)");
    assert.equal(up.changed, true);
    assert.equal(up.createRow, false);
    assert.deepEqual(up.row, { etag: '"e2"', lastPulledAt: NOW, status: "ok" });
    assert.equal(up.fields?.updatedAt, NOW);
    assert.deepEqual(plan.pushBacks, []);
  });

  it("reports changed false when only the etag moved", () => {
    const plan = run([gEvent()], { g1: knownEvent() });
    assert.equal(plan.updates[0].changed, false);
    assert.equal(plan.updates[0].row.etag, '"e2"');
  });

  it("leaves a Marshee-only change alone (the push sends it)", () => {
    const plan = run([gEvent({ etag: '"e1"' })], { g1: knownEvent({ eventUpdatedAt: LATER }) });
    assert.deepEqual(plan.skipped, [{ googleEventId: "g1", reason: "marshee-only" }]);
    assert.equal(plan.updates.length, 0);
    assert.deepEqual(plan.pushBacks, []);
  });

  it("both changed, Google later: Google wins and Marshee's version goes to previousJson", () => {
    const plan = run([gEvent({ summary: "Google title", updated: LATEST.toISOString() })], {
      g1: knownEvent({ eventUpdatedAt: LATER, current: { ...CURRENT, title: "Marshee title" } }),
    });
    const up = plan.updates[0];
    assert.equal(up.fields?.title, "Google title");
    const prev = JSON.parse(up.row.previousJson ?? "null");
    assert.equal(prev.title, "Marshee title");
    assert.deepEqual(Object.keys(prev).sort(), ["allDay", "endAt", "location", "notes", "startAt", "title"]);
    assert.equal(prev.startAt, "2026-11-12T19:00:00.000Z");
    assert.deepEqual(plan.pushBacks, []);
  });

  it("both changed, Marshee later: Marshee wins, Google's version goes to previousJson, event is pushed back", () => {
    const plan = run([gEvent({ summary: "Google title", updated: LATER.toISOString() })], {
      g1: knownEvent({ eventUpdatedAt: LATEST, current: { ...CURRENT, title: "Marshee title" } }),
    });
    const up = plan.updates[0];
    assert.equal(up.fields, null);
    assert.equal(up.changed, false);
    assert.equal(up.row.status, undefined);
    assert.equal(up.row.etag, '"e2"');
    const prev = JSON.parse(up.row.previousJson ?? "null");
    assert.equal(prev.title, "Google title");
    assert.equal(prev.startAt, "2026-11-12T19:00:00.000Z");
    assert.deepEqual(plan.pushBacks, ["ev1"]);
  });

  it("counts a row never pushed or pulled as a Marshee change", () => {
    const plan = run([gEvent({ updated: EARLIER.toISOString() })], {
      g1: knownEvent({ lastPushedAt: null, lastPulledAt: null }),
    });
    assert.deepEqual(plan.pushBacks, ["ev1"]);
  });

  it("does not see its own write as a Marshee change", () => {
    const plan = run([gEvent()], { g1: knownEvent({ lastPushedAt: null, lastPulledAt: T1, eventUpdatedAt: T1 }) });
    assert.equal(plan.pushBacks.length, 0);
    assert.equal(plan.updates[0].row.previousJson, undefined);
  });
});

describe("planPull deletes and matching", () => {
  it("deletes a known event cancelled in Google, even one made in Marshee", () => {
    const plan = run([{ id: "g1", status: "cancelled" }], { g1: knownEvent() });
    assert.deepEqual(plan.deletes, [{ eventId: "ev1", googleEventId: "g1" }]);
    assert.equal(plan.skipped.length, 0);
  });

  it("skips a cancelled event Marshee never knew", () => {
    const plan = run([{ id: "zz", status: "cancelled" }]);
    assert.deepEqual(plan.skipped, [{ googleEventId: "zz", reason: "cancelled-unknown" }]);
    assert.equal(plan.deletes.length, 0);
  });

  it("matches a Google copy by marsheeEventId when no row matches, and adopts it without an insert", () => {
    const plan = run(
      [gEvent({ id: "hex1", extendedProperties: { private: { marsheeEventId: "ev9" } } })],
      {},
      { ev9: knownEvent({ eventId: "ev9", hasRow: false, etag: null, lastPushedAt: null }) },
    );
    assert.equal(plan.inserts.length, 0);
    assert.equal(plan.updates.length, 1);
    const up = plan.updates[0];
    assert.equal(up.eventId, "ev9");
    assert.equal(up.googleEventId, "hex1");
    assert.equal(up.createRow, true);
    assert.equal(up.fields, null);
    assert.deepEqual(up.row, { etag: '"e2"', lastPulledAt: NOW, status: "ok" });
  });

  it("prefers the row over marsheeEventId", () => {
    const plan = run(
      [gEvent({ etag: '"e1"', extendedProperties: { private: { marsheeEventId: "ev9" } } })],
      { g1: knownEvent() },
      { ev9: knownEvent({ eventId: "ev9", hasRow: false }) },
    );
    assert.deepEqual(plan.skipped, [{ googleEventId: "g1", reason: "echo" }]);
  });

  it("does not bring back a Marshee event that no longer exists", () => {
    const plan = run([gEvent({ extendedProperties: { private: { marsheeEventId: "gone" } } })]);
    assert.equal(plan.inserts.length, 0);
    assert.deepEqual(plan.skipped, [{ googleEventId: "g1", reason: "marshee-deleted" }]);
  });

  it("never pushes back from a plan with only inserts, deletes and echoes", () => {
    const plan = run(
      [gEvent({ id: "n" }), { id: "g1", status: "cancelled" }, gEvent({ id: "g2", etag: '"e1"' })],
      { g1: knownEvent(), g2: knownEvent({ eventId: "ev2" }) },
    );
    assert.deepEqual(plan.pushBacks, []);
    assert.equal(plan.inserts.length, 1);
    assert.equal(plan.deletes.length, 1);
    assert.equal(plan.skipped.length, 1);
  });
});

describe("planPull busy or free", () => {
  const day = { start: { date: "2026-11-12" }, end: { date: "2026-11-13" } };

  it("an inserted all-day event carries Google's choice, busy when absent", () => {
    assert.equal(run([gEvent(day)]).inserts[0].event.showBusyOnGoogle, true);
    assert.equal(run([gEvent({ ...day, transparency: "transparent" })]).inserts[0].event.showBusyOnGoogle, false);
  });

  it("an inserted timed event is false", () => {
    assert.equal(run([gEvent({ transparency: "transparent" })]).inserts[0].event.showBusyOnGoogle, false);
  });

  it("a Google-wins update carries it too", () => {
    const plan = run([gEvent({ ...day, transparency: "transparent" })], { g1: knownEvent() });
    assert.equal(plan.updates[0].fields?.showBusyOnGoogle, false);
  });
});

describe("planPull: another link of the same Google calendar", () => {
  it("adopts an event a sibling link imported: a row here, no insert, nothing else changed", () => {
    const plan = run([gEvent()], { g1: knownEvent({ hasRow: false, etag: null, lastPushedAt: null, sourceLinkedCalendarId: "calOld" }) });
    assert.equal(plan.inserts.length, 0);
    assert.equal(plan.updates.length, 1);
    assert.equal(plan.updates[0].createRow, true);
    assert.equal(plan.updates[0].fields, null);
    assert.equal(plan.updates[0].pushOut, false);
    assert.equal(plan.updates[0].row.etag, '"e2"');
  });
});

describe("planPull: Google's change reaches other calendars", () => {
  it("sets pushOut when Google wins, something changed and copies exist elsewhere", () => {
    const plan = run([gEvent({ summary: "Moved" })], { g1: knownEvent({ hasOtherCopies: true }) });
    assert.equal(plan.updates[0].changed, true);
    assert.equal(plan.updates[0].pushOut, true);
  });

  it("does not set pushOut with no copies elsewhere, or when the fields are the same", () => {
    assert.equal(run([gEvent({ summary: "Moved" })], { g1: knownEvent() }).updates[0].pushOut, false);
    assert.equal(run([gEvent()], { g1: knownEvent({ hasOtherCopies: true }) }).updates[0].pushOut, false);
  });
});
