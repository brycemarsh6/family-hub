import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPull } from "./calendarPullRun";
import type { KnownEvent, PullKnown } from "./calendarSyncPull";
import type { ListEventsResult } from "./google/types";
import { CAL, fake, gEvent, type Fake } from "./testing/calendarPullRunHarness";

// The pull's steps with every call faked. The rules for each event are in
// calendarSyncPull.test.ts. This file proves what calendarPullRun.ts writes
// and where a change goes next: the writes, the push to other calendars and
// the one-import rule. Its guards, sync token and access cases are in
// calendarPullRun.test.ts.

describe("runPull: writes", () => {
  it("deletes, then pushes back after the run's writes", async () => {
    const known: PullKnown = {
      byGoogleId: new Map([
        [
          "gdel",
          {
            eventId: "evDel",
            hasRow: true,
            etag: '"e1"',
            lastPushedAt: null,
            lastPulledAt: new Date("2026-11-09T10:00:00Z"),
            eventUpdatedAt: new Date("2026-11-09T10:00:00Z"),
            sourceLinkedCalendarId: "c1",
            current: {
              title: "Old",
              notes: null,
              location: null,
              startAt: new Date("2026-11-12T19:00:00Z"),
              endAt: new Date("2026-11-12T20:00:00Z"),
              allDay: false,
            },
          },
        ],
        [
          "gwin",
          {
            eventId: "evWin",
            hasRow: true,
            etag: '"e1"',
            lastPushedAt: new Date("2026-11-09T10:00:00Z"),
            lastPulledAt: null,
            eventUpdatedAt: new Date("2026-11-09T17:30:00Z"),
            sourceLinkedCalendarId: "c1",
            current: {
              title: "Marshee title",
              notes: null,
              location: null,
              startAt: new Date("2026-11-12T19:00:00Z"),
              endAt: new Date("2026-11-12T20:00:00Z"),
              allDay: false,
            },
          },
        ],
      ]),
      byMarsheeId: new Map(),
    };
    const f = fake({
      loadKnown: async () => known,
      lists: [
        {
          ok: true,
          events: [gEvent({ id: "gdel", status: "cancelled" }), gEvent({ id: "gwin", etag: '"e2"', updated: "2026-11-09T16:00:00Z" })],
          nextSyncToken: "t",
        },
      ],
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: true, failed: 0, checked: 1 });
    const order = f.calls.filter((c) => /^(update|delete|pushBack)/.test(c));
    assert.deepEqual(order, ["update:gwin", "delete:evDel", "pushBack:evWin"]);
  });
});

describe("runPull: rewindow collects the token's changes first", () => {
  it("deletes an event the token pass cancelled, then saves the full pass's token", async () => {
    const known: PullKnown = {
      byGoogleId: new Map([
        [
          "gdel",
          {
            eventId: "evDel",
            hasRow: true,
            etag: '"e1"',
            lastPushedAt: null,
            lastPulledAt: new Date("2026-11-09T10:00:00Z"),
            eventUpdatedAt: new Date("2026-11-09T10:00:00Z"),
            sourceLinkedCalendarId: "c1",
            current: { title: "Old", notes: null, location: null, startAt: new Date("2026-11-12T19:00:00Z"), endAt: new Date("2026-11-12T20:00:00Z"), allDay: false },
          },
        ],
      ]),
      byMarsheeId: new Map(),
    };
    let loads = 0;
    const f = fake({
      calendars: [{ ...CAL, syncToken: "tok-old" }],
      // Only the token pass sees the event; the full pass has nothing left to delete.
      loadKnown: async () => (++loads === 1 ? known : { byGoogleId: new Map(), byMarsheeId: new Map() }),
      lists: [
        { ok: true, events: [gEvent({ id: "gdel", status: "cancelled" })], nextSyncToken: "tok-mid" },
        { ok: true, events: [], nextSyncToken: "tok-full" },
      ],
    });
    const result = await runPull(f.deps, { force: true, rewindow: true });
    assert.deepEqual(result, { changed: true, failed: 0, checked: 1 });
    assert.equal(f.calls.includes("delete:evDel"), true);
    assert.equal(f.calls.at(-1), "saveToken:c1:tok-full");
  });
});

/** One known event with a row, the fields Marshee holds being "Old". */
function knownOne(over: Partial<KnownEvent> = {}): PullKnown {
  const known: KnownEvent = {
    eventId: "evG",
    hasRow: true,
    etag: '"e1"',
    lastPushedAt: new Date("2026-11-09T10:00:00Z"),
    lastPulledAt: null,
    eventUpdatedAt: new Date("2026-11-09T10:00:00Z"),
    sourceLinkedCalendarId: "c1",
    current: { title: "Old", notes: null, location: null, startAt: new Date("2026-11-12T19:00:00Z"), endAt: new Date("2026-11-12T20:00:00Z"), allDay: false },
    ...over,
  };
  return { byGoogleId: new Map([["g1", known]]), byMarsheeId: new Map() };
}

describe("runPull: a Google change reaches the other calendars", () => {
  const changed = { ok: true, events: [gEvent({ etag: '"e2"', summary: "New title" })], nextSyncToken: "t" } as ListEventsResult;

  it("pushes a Google-wins change after the writes when the event has copies elsewhere", async () => {
    const f = fake({ loadKnown: async () => knownOne({ hasOtherCopies: true }), lists: [changed] });
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.calls.filter((c) => /^(update|pushBack)/.test(c)), ["update:g1", "pushBack:evG:except=c1"]);
  });

  it("pushes nothing when the event has no copies elsewhere", async () => {
    const f = fake({ loadKnown: async () => knownOne(), lists: [changed] });
    await runPull(f.deps, { force: false });
    assert.ok(!f.calls.some((c) => c.startsWith("pushBack")));
  });

  it("does not push a change whose write failed (it would put the old version over Google's)", async () => {
    const f = fake({
      loadKnown: async () => knownOne({ hasOtherCopies: true }),
      lists: [changed],
      writeUpdate: async () => {
        throw new Error("db");
      },
    });
    assert.equal((await runPull(f.deps, { force: false })).failed, 1);
    assert.ok(!f.calls.some((c) => c.startsWith("pushBack")));
  });
});

describe("runPull: one Google calendar, one import", () => {
  const OLD = new Date("2026-10-01T00:00:00Z");
  const NEWER = new Date("2026-10-05T00:00:00Z");
  const claimed = (f: Fake) => f.calls.filter((c) => c.startsWith("claim")).map((c) => c.split(":")[1]);

  it("pulls a Google calendar linked twice once: the oldest link; breaks a tie by the lower id", async () => {
    const f = fake({
      calendars: [
        { ...CAL, id: "cB", accountId: "aB", createdAt: NEWER },
        { ...CAL, id: "cA", accountId: "aA", createdAt: OLD },
        { ...CAL, id: "cOther", googleCalendarId: "g-other", accountId: "aC", createdAt: NEWER },
      ],
    });
    await runPull(f.deps, { force: false });
    assert.deepEqual(claimed(f), ["cA", "cOther"]);
    const tie = fake({ calendars: [{ ...CAL, id: "c2", createdAt: OLD }, { ...CAL, id: "c1", createdAt: OLD }] });
    await runPull(tie.deps, { force: false });
    assert.deepEqual(claimed(tie), ["c1"]);
  });
});

describe("runPull: a push out keeps off the original", () => {
  it("a Google-wins push out excepts the calendar it came from; a Marshee-wins push back excepts nothing", async () => {
    const out = fake({
      loadKnown: async () => knownOne({ hasOtherCopies: true }),
      lists: [{ ok: true, events: [gEvent({ etag: '"e2"', summary: "New title" })], nextSyncToken: "t" }],
    });
    await runPull(out.deps, { force: false });
    assert.deepEqual(out.calls.filter((c) => c.startsWith("pushBack")), ["pushBack:evG:except=c1"]);

    const back = fake({
      loadKnown: async () =>
        knownOne({ eventUpdatedAt: new Date("2026-11-09T18:00:00Z"), lastPushedAt: new Date("2026-11-09T10:00:00Z") }),
      lists: [{ ok: true, events: [gEvent({ etag: '"e2"', summary: "New title", updated: "2026-11-09T12:00:00Z" })], nextSyncToken: "t" }],
    });
    await runPull(back.deps, { force: false });
    assert.deepEqual(back.calls.filter((c) => c.startsWith("pushBack")), ["pushBack:evG"]);
  });
});
