import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventFromGoogle, marsheeIdOf, textFromDescription } from "./eventFromGoogle";
import { toGoogleEvent, type EventPayloadInput } from "./eventPayload";
import type { GoogleEventIn } from "./types";

function marshee(over: Partial<EventPayloadInput> = {}): EventPayloadInput {
  return {
    marsheeEventId: "cm1abcdefghij0123456789xyz",
    title: "Dentist",
    notes: null,
    location: null,
    startAt: new Date("2026-03-07T19:00:00Z"),
    endAt: new Date("2026-03-07T20:00:00Z"),
    allDay: false,
    showBusyOnGoogle: false,
    forNames: [],
    ...over,
  };
}

/** Sends a Marshee event out as Google JSON and reads it back. */
function roundTrip(input: EventPayloadInput) {
  const sent = { ...toGoogleEvent(input), id: "abc123", etag: '"e1"', updated: "2026-03-01T10:00:00.000Z" };
  return eventFromGoogle(sent as unknown as GoogleEventIn);
}

function fieldsOf(input: EventPayloadInput) {
  return {
    title: input.title,
    notes: input.notes,
    location: input.location,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay,
  };
}

function eventKind(e: ReturnType<typeof eventFromGoogle>) {
  assert.equal(e.kind, "event");
  if (e.kind !== "event") throw new Error("not an event");
  return e;
}

describe("eventFromGoogle: kinds", () => {
  it("cancelled gives the id only", () => {
    assert.deepEqual(eventFromGoogle({ id: "x", status: "cancelled" }), { kind: "cancelled", id: "x" });
  });

  it("skips workingLocation and focusTime", () => {
    const start = { dateTime: "2026-03-07T19:00:00Z" };
    assert.deepEqual(eventFromGoogle({ id: "w", eventType: "workingLocation", start, end: start }), { kind: "skip", id: "w" });
    assert.deepEqual(eventFromGoogle({ id: "f", eventType: "focusTime", start, end: start }), { kind: "skip", id: "f" });
  });

  it("skips an event with no usable start", () => {
    assert.deepEqual(eventFromGoogle({ id: "n" }), { kind: "skip", id: "n" });
    assert.deepEqual(eventFromGoogle({ id: "n", start: { dateTime: "garbage" } }), { kind: "skip", id: "n" });
    assert.deepEqual(eventFromGoogle({ id: "n", start: { date: "2026-02-31" } }), { kind: "skip", id: "n" });
  });

  it("tentative counts as confirmed and default eventType is kept", () => {
    const e = eventKind(eventFromGoogle({ id: "t", status: "tentative", eventType: "default", summary: "Maybe", start: { dateTime: "2026-03-07T19:00:00Z" }, end: { dateTime: "2026-03-07T20:00:00Z" } }));
    assert.equal(e.title, "Maybe");
  });
});

describe("eventFromGoogle: fields", () => {
  it("empty or missing title becomes (No title)", () => {
    const base = { id: "a", start: { dateTime: "2026-03-07T19:00:00Z" }, end: { dateTime: "2026-03-07T20:00:00Z" } };
    assert.equal(eventKind(eventFromGoogle({ ...base })).title, "(No title)");
    assert.equal(eventKind(eventFromGoogle({ ...base, summary: "   " })).title, "(No title)");
  });

  it("parses a timed event with its offset", () => {
    const e = eventKind(eventFromGoogle({ id: "a", summary: "X", start: { dateTime: "2026-03-07T12:00:00-07:00" }, end: { dateTime: "2026-03-07T13:30:00-07:00" } }));
    assert.equal(e.startAt.toISOString(), "2026-03-07T19:00:00.000Z");
    assert.equal(e.endAt.toISOString(), "2026-03-07T20:30:00.000Z");
    assert.equal(e.allDay, false);
  });

  it("reads an all-day event at UTC midnight with the end exclusive", () => {
    const e = eventKind(eventFromGoogle({ id: "a", summary: "X", start: { date: "2026-11-01" }, end: { date: "2026-11-02" } }));
    assert.equal(e.startAt.toISOString(), "2026-11-01T00:00:00.000Z");
    assert.equal(e.endAt.toISOString(), "2026-11-02T00:00:00.000Z");
    assert.equal(e.allDay, true);
  });

  it("an all-day event with no end lasts one day", () => {
    const e = eventKind(eventFromGoogle({ id: "a", start: { date: "2026-11-01" } }));
    assert.equal(e.endAt.toISOString(), "2026-11-02T00:00:00.000Z");
  });

  it("returns etag, updated and marsheeEventId, and omits them when absent", () => {
    const base = { id: "a", start: { date: "2026-11-01" }, end: { date: "2026-11-02" } };
    const full = eventKind(eventFromGoogle({ ...base, etag: '"e9"', updated: "2026-11-02T08:00:00.000Z", extendedProperties: { private: { marsheeEventId: "cm1" } } }));
    assert.equal(full.etag, '"e9"');
    assert.equal(full.updated.toISOString(), "2026-11-02T08:00:00.000Z");
    assert.equal(full.marsheeEventId, "cm1");
    const bare = eventKind(eventFromGoogle(base));
    assert.equal(bare.etag, null);
    assert.ok(!("marsheeEventId" in bare));
  });

  it("strips Marshee's For line and trims blank notes and location to null", () => {
    const base = { id: "a", start: { date: "2026-11-01" }, end: { date: "2026-11-02" } };
    assert.equal(eventKind(eventFromGoogle({ ...base, description: "Bring form\n\nFor: Bryce" })).notes, "Bring form");
    assert.equal(eventKind(eventFromGoogle({ ...base, description: "For: Bryce", location: "  " })).notes, null);
    assert.equal(eventKind(eventFromGoogle({ ...base, location: "  Clinic " })).location, "Clinic");
  });
});

describe("eventFromGoogle: round trip with toGoogleEvent", () => {
  it("a timed event comes back with the same fields", () => {
    const input = marshee({ notes: "Bring the form", location: "Main St", forNames: ["Bryce", "Emily"] });
    const e = eventKind(roundTrip(input));
    assert.deepEqual({ ...fieldsOf(input) }, { title: e.title, notes: e.notes, location: e.location, startAt: e.startAt, endAt: e.endAt, allDay: e.allDay });
    assert.equal(e.marsheeEventId, input.marsheeEventId);
  });

  it("an all-day event comes back with the same fields", () => {
    const input = marshee({ allDay: true, startAt: new Date("2026-03-07T00:00:00Z"), endAt: new Date("2026-03-09T00:00:00Z") });
    const e = eventKind(roundTrip(input));
    assert.deepEqual(fieldsOf(input), { title: e.title, notes: e.notes, location: e.location, startAt: e.startAt, endAt: e.endAt, allDay: e.allDay });
  });

  it("an all-day event on the fall-back day 2026-11-01 keeps its date", () => {
    const input = marshee({ allDay: true, startAt: new Date("2026-11-01T00:00:00Z"), endAt: new Date("2026-11-02T00:00:00Z"), forNames: ["Bryce"] });
    const e = eventKind(roundTrip(input));
    assert.deepEqual(fieldsOf(input), { title: e.title, notes: e.notes, location: e.location, startAt: e.startAt, endAt: e.endAt, allDay: e.allDay });
  });

  it("a timed event across the fall-back hour keeps its instants", () => {
    // 2026-11-01: clocks in Denver go back at 2:00 AM MDT (08:00Z).
    const input = marshee({ startAt: new Date("2026-11-01T07:30:00Z"), endAt: new Date("2026-11-01T09:30:00Z") });
    const e = eventKind(roundTrip(input));
    assert.deepEqual(fieldsOf(input), { title: e.title, notes: e.notes, location: e.location, startAt: e.startAt, endAt: e.endAt, allDay: e.allDay });
  });

  it("a timed event across spring-forward keeps its instants", () => {
    const input = marshee({ startAt: new Date("2026-03-08T08:30:00Z"), endAt: new Date("2026-03-08T10:30:00Z") });
    const e = eventKind(roundTrip(input));
    assert.deepEqual(fieldsOf(input), { title: e.title, notes: e.notes, location: e.location, startAt: e.startAt, endAt: e.endAt, allDay: e.allDay });
  });
});

describe("eventFromGoogle: busy or free", () => {
  const timed = { start: { dateTime: "2026-03-07T19:00:00Z" }, end: { dateTime: "2026-03-07T20:00:00Z" } };
  const day = { start: { date: "2026-03-07" }, end: { date: "2026-03-08" } };

  it("an all-day event is busy unless Google says transparent", () => {
    assert.equal(eventKind(eventFromGoogle({ id: "a", ...day })).showBusyOnGoogle, true);
    assert.equal(eventKind(eventFromGoogle({ id: "a", ...day, transparency: "opaque" })).showBusyOnGoogle, true);
    assert.equal(eventKind(eventFromGoogle({ id: "a", ...day, transparency: "transparent" })).showBusyOnGoogle, false);
  });

  it("a timed event is always false, whatever Google says", () => {
    assert.equal(eventKind(eventFromGoogle({ id: "t", ...timed })).showBusyOnGoogle, false);
    assert.equal(eventKind(eventFromGoogle({ id: "t", ...timed, transparency: "transparent" })).showBusyOnGoogle, false);
  });
});

describe("eventFromGoogle: HTML descriptions from Google's web editor", () => {
  const timed = { start: { dateTime: "2026-03-07T19:00:00Z" }, end: { dateTime: "2026-03-07T20:00:00Z" } };

  it("turns <br>, </p> and </div> into new lines and drops other tags", () => {
    assert.equal(textFromDescription("Bring forms<br>and a pen<br/>ok"), "Bring forms\nand a pen\nok");
    assert.equal(textFromDescription("<p>One</p><p>Two</p>"), "One\nTwo\n");
    assert.equal(textFromDescription("<div>A</div><div><b>B</b></div>"), "A\nB\n");
    assert.equal(textFromDescription('See <a href="https://x.test">the page</a>'), "See the page");
  });

  it("decodes &amp; &lt; &gt; &quot; &#39; &nbsp; once, in HTML only", () => {
    assert.equal(textFromDescription("<p>Tom &amp; Jerry &lt;3 &gt; &quot;hi&quot; it&#39;s&nbsp;ok</p>"), 'Tom & Jerry <3 > "hi" it\'s ok\n');
    assert.equal(textFromDescription("<p>&amp;lt;</p>"), "&lt;\n");
  });

  it("leaves plain text alone, even with an ampersand or a less-than sign", () => {
    assert.equal(textFromDescription("Fish &amp; chips if 1 < 2\nline two"), "Fish &amp; chips if 1 < 2\nline two");
  });

  it("leaves a lone <Emma> alone (not a known tag), but strips known tags around it", () => {
    assert.equal(textFromDescription("Pick up <Emma> at 3"), "Pick up <Emma> at 3");
    assert.equal(textFromDescription("<p>Pick up <Emma> at 3</p>"), "Pick up <Emma> at 3\n");
  });

  it("puts each list item on its own line", () => {
    assert.equal(textFromDescription("<ul><li>Milk</li><li>Eggs</li></ul>"), "Milk\nEggs\n");
  });

  it("decodes numeric entities, decimal and hex", () => {
    assert.equal(textFromDescription("<p>It&#8217;s &#x2019; ok</p>"), "It\u2019s \u2019 ok\n");
    assert.equal(textFromDescription("<p>&#99999999999;x</p>"), "x\n");
  });

  it("eventFromGoogle gives clean notes, still removing Marshee's For line", () => {
    const e = eventKind(eventFromGoogle({ id: "h", ...timed, description: "Bring forms<br><br>For: Bryce" }));
    assert.equal(e.notes, "Bring forms");
    const f = eventKind(eventFromGoogle({ id: "h", ...timed, description: "<p>Call &amp; ask</p>" }));
    assert.equal(f.notes, "Call & ask");
  });
});

describe("marsheeIdOf", () => {
  it("reads the private property, and nothing for a missing or empty one", () => {
    assert.equal(marsheeIdOf({ id: "a", extendedProperties: { private: { marsheeEventId: "m1" } } }), "m1");
    assert.equal(marsheeIdOf({ id: "a", extendedProperties: { private: { marsheeEventId: "" } } }), undefined);
    assert.equal(marsheeIdOf({ id: "a" }), undefined);
  });
});
