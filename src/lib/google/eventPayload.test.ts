import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleEventIdFor, toGoogleEvent, type EventPayloadInput } from "./eventPayload";

function base(over: Partial<EventPayloadInput> = {}): EventPayloadInput {
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

describe("googleEventIdFor", () => {
  it("is lowercase hex of the id's bytes", () => {
    assert.equal(googleEventIdFor("abc"), "616263");
    assert.equal(googleEventIdFor("cm1abc"), "636d31616263");
  });

  it("only uses characters Google allows and is 5 to 1024 long for a cuid", () => {
    const id = googleEventIdFor("cmabcdefghijklmnopqrstuvw");
    assert.match(id, /^[a-v0-9]+$/);
    assert.ok(id.length >= 5 && id.length <= 1024);
    assert.equal(id.length, 50);
  });

  it("is the same every time for the same event", () => {
    assert.equal(googleEventIdFor("cmx1234567"), googleEventIdFor("cmx1234567"));
  });

  it("refuses an id too short or too long to be valid", () => {
    assert.throws(() => googleEventIdFor("ab"));
    assert.throws(() => googleEventIdFor("a".repeat(513)));
  });
});

describe("toGoogleEvent: timed", () => {
  it("sends instants with the household time zone, before daylight saving starts", () => {
    // 2026-03-07 12:00 MST (UTC-7)
    const p = toGoogleEvent(base());
    assert.deepEqual(p.start, { dateTime: "2026-03-07T19:00:00.000Z", timeZone: "America/Denver" });
    assert.deepEqual(p.end, { dateTime: "2026-03-07T20:00:00.000Z", timeZone: "America/Denver" });
  });

  it("keeps the instant across the spring-forward change", () => {
    // Noon Denver on 9 March 2026 is MDT (UTC-6) = 18:00Z, one hour earlier in UTC than the day before
    const p = toGoogleEvent(base({ startAt: new Date("2026-03-09T18:00:00Z"), endAt: new Date("2026-03-09T19:00:00Z") }));
    assert.deepEqual(p.start, { dateTime: "2026-03-09T18:00:00.000Z", timeZone: "America/Denver" });
  });

  it("keeps the instant across the fall-back change", () => {
    // Noon Denver on 2 Nov 2026 is MST (UTC-7) = 19:00Z
    const p = toGoogleEvent(base({ startAt: new Date("2026-11-02T19:00:00Z"), endAt: new Date("2026-11-02T20:00:00Z") }));
    assert.deepEqual(p.start, { dateTime: "2026-11-02T19:00:00.000Z", timeZone: "America/Denver" });
  });

  it("handles an event that spans the daylight saving change", () => {
    const p = toGoogleEvent(base({ startAt: new Date("2026-03-08T08:00:00Z"), endAt: new Date("2026-03-08T11:00:00Z") }));
    assert.deepEqual(p.start, { dateTime: "2026-03-08T08:00:00.000Z", timeZone: "America/Denver" });
    assert.deepEqual(p.end, { dateTime: "2026-03-08T11:00:00.000Z", timeZone: "America/Denver" });
  });

  it("is always busy", () => {
    assert.equal(toGoogleEvent(base()).transparency, "opaque");
    assert.equal(toGoogleEvent(base({ showBusyOnGoogle: true })).transparency, "opaque");
  });
});

describe("toGoogleEvent: all day", () => {
  it("sends a one-day event as dates with an exclusive end", () => {
    const p = toGoogleEvent(
      base({ allDay: true, startAt: new Date("2026-07-04T00:00:00Z"), endAt: new Date("2026-07-05T00:00:00Z") }),
    );
    assert.deepEqual(p.start, { date: "2026-07-04" });
    assert.deepEqual(p.end, { date: "2026-07-05" });
  });

  it("sends a multi-day event as dates with an exclusive end", () => {
    const p = toGoogleEvent(
      base({ allDay: true, startAt: new Date("2026-12-30T00:00:00Z"), endAt: new Date("2027-01-03T00:00:00Z") }),
    );
    assert.deepEqual(p.start, { date: "2026-12-30" });
    assert.deepEqual(p.end, { date: "2027-01-03" });
  });

  it("does not shift the date whatever the process time zone is", () => {
    const p = toGoogleEvent(
      base({ allDay: true, startAt: new Date("2026-01-01T00:00:00Z"), endAt: new Date("2026-01-02T00:00:00Z") }),
    );
    assert.deepEqual(p.start, { date: "2026-01-01" });
  });

  it("is free by default and busy when switched", () => {
    const allDay = { allDay: true, startAt: new Date("2026-07-04T00:00:00Z"), endAt: new Date("2026-07-05T00:00:00Z") };
    assert.equal(toGoogleEvent(base(allDay)).transparency, "transparent");
    assert.equal(toGoogleEvent(base({ ...allDay, showBusyOnGoogle: true })).transparency, "opaque");
  });
});

describe("toGoogleEvent: text and fixed fields", () => {
  it("leaves out description and location when empty", () => {
    const p = toGoogleEvent(base({ notes: "  ", location: " " }));
    assert.equal("description" in p, false);
    assert.equal("location" in p, false);
  });

  it("puts the For line alone when there are no notes", () => {
    assert.equal(toGoogleEvent(base({ forNames: ["Bryce", "Emily"] })).description, "For: Bryce, Emily");
  });

  it("puts notes, a blank line, then the For line", () => {
    const p = toGoogleEvent(base({ notes: "Bring forms", forNames: ["Bryce", "Emily"] }));
    assert.equal(p.description, "Bring forms\n\nFor: Bryce, Emily");
  });

  it("sends notes alone when nobody is named", () => {
    assert.equal(toGoogleEvent(base({ notes: "Bring forms" })).description, "Bring forms");
  });

  it("sets summary, location, status and the Marshee id; no attendees or recurrence", () => {
    const p = toGoogleEvent(base({ location: "Main St" }));
    assert.equal(p.summary, "Dentist");
    assert.equal(p.location, "Main St");
    assert.equal(p.status, "confirmed");
    assert.deepEqual(p.extendedProperties, { private: { marsheeEventId: "cm1abcdefghij0123456789xyz" } });
    assert.equal("attendees" in p, false);
    assert.equal("recurrence" in p, false);
  });
});
