import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PULL_FORCE_LEASE_MS,
  PULL_LEASE_MS,
  runPull,
  type PullAccessResult,
  type PullCalendarRow,
  type PullRunDeps,
} from "./calendarPullRun";
import type { KnownEvent, PullKnown } from "./calendarSyncPull";
import type { GoogleEventIn, ListEventsMode, ListEventsResult } from "./google/types";

// The pull's steps with every call faked. The rules for each event are in
// calendarSyncPull.test.ts; this file proves the order and the guards.

const NOW = new Date("2026-11-09T18:00:00Z");
const CAL: PullCalendarRow = { id: "c1", googleCalendarId: "g-cal", accountId: "a1", linkerId: "u1", syncToken: null, createdAt: new Date("2026-11-01T00:00:00Z") };
const EMPTY_KNOWN: PullKnown = { byGoogleId: new Map(), byMarsheeId: new Map() };

function gEvent(over: Partial<GoogleEventIn> = {}): GoogleEventIn {
  return {
    id: "g1",
    status: "confirmed",
    etag: '"e1"',
    updated: "2026-11-09T17:00:00Z",
    summary: "Dentist",
    start: { dateTime: "2026-11-12T12:00:00-07:00" },
    end: { dateTime: "2026-11-12T13:00:00-07:00" },
    ...over,
  };
}

type Fake = { deps: PullRunDeps; calls: string[]; listModes: ListEventsMode[] };

function fake(
  over: Partial<PullRunDeps> & { calendars?: PullCalendarRow[]; lists?: ListEventsResult[]; claimResult?: boolean } = {},
): Fake {
  const calls: string[] = [];
  const listModes: ListEventsMode[] = [];
  const lists = [...(over.lists ?? [{ ok: true, events: [], nextSyncToken: "tok-new" } as ListEventsResult])];
  const deps: PullRunDeps = {
    isConfigured: () => true,
    loadCalendars: async () => {
      calls.push("loadCalendars");
      return over.calendars ?? [CAL];
    },
    claim: async (id, staleBefore) => {
      calls.push(`claim:${id}:${NOW.getTime() - staleBefore.getTime()}`);
      return over.claimResult ?? true;
    },
    getAccessToken: async (accountId): Promise<PullAccessResult> => {
      calls.push(`token:${accountId}`);
      return { ok: true, accessToken: "access" };
    },
    markNeedsRelink: async (id) => void calls.push(`relink:${id}`),
    list: async (_t, _g, mode) => {
      calls.push("list");
      listModes.push(mode);
      return lists.shift() ?? { ok: false, reason: "network" };
    },
    saveSyncToken: async (id, token) => void calls.push(`saveToken:${id}:${token}`),
    loadKnown: async () => EMPTY_KNOWN,
    writeInsert: async (i) => void calls.push(`insert:${i.googleEventId}`),
    writeUpdate: async (_c, u) => void calls.push(`update:${u.googleEventId}`),
    writeDelete: async (d) => void calls.push(`delete:${d.eventId}`),
    pushBack: async (id, except) => void calls.push(except ? `pushBack:${id}:except=${except}` : `pushBack:${id}`),
    now: () => NOW,
    ...over,
  };
  return { deps, calls, listModes };
}

describe("runPull: guards", () => {
  it("calls nothing when Google is not configured", async () => {
    const f = fake({ isConfigured: () => false });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 0, checked: 0 });
    assert.deepEqual(f.calls, []);
  });

  it("skips a calendar whose lease another caller holds", async () => {
    const f = fake({ claimResult: false });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 0, checked: 0 });
    assert.deepEqual(f.calls, ["loadCalendars", `claim:c1:${PULL_LEASE_MS}`]);
  });

  it("counts no calendar as checked when every one is leased", async () => {
    const f = fake({ claimResult: false, calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }] });
    assert.equal((await runPull(f.deps, { force: true })).checked, 0);
  });

  it("counts each calendar it tried, a failed one too, and not one skipped as a twin", async () => {
    const twin = { ...CAL, id: "c3", createdAt: new Date("2026-10-02T00:00:00Z") };
    const f = fake({
      calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }, twin],
      lists: [{ ok: true, events: [], nextSyncToken: "t" }],
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: false, failed: 1, checked: 2 });
  });

  it("uses the 30 second lease for Refresh", async () => {
    const f = fake({ claimResult: false });
    await runPull(f.deps, { force: true });
    assert.ok(f.calls.includes(`claim:c1:${PULL_FORCE_LEASE_MS}`));
  });

  it("never throws when the calendar list fails", async () => {
    const f = fake({
      loadCalendars: async () => {
        throw new Error("db down");
      },
    });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 0 });
  });
});

describe("runPull: sync token", () => {
  it("sends timeMin 30 days back when there is no token", async () => {
    const f = fake();
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [{ timeMin: "2026-10-10T18:00:00.000Z" }]);
  });

  it("sends only the token when there is one", async () => {
    const f = fake({ calendars: [{ ...CAL, syncToken: "tok-old" }] });
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }]);
  });

  it("on restart clears the token and runs a full pull in the same run", async () => {
    const f = fake({
      calendars: [{ ...CAL, syncToken: "tok-old" }],
      lists: [
        { ok: false, reason: "restart" },
        { ok: true, events: [gEvent()], nextSyncToken: "tok-new" },
      ],
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }, { timeMin: "2026-10-10T18:00:00.000Z" }]);
    assert.deepEqual(
      f.calls.filter((c) => c.startsWith("saveToken") || c.startsWith("insert")),
      ["saveToken:c1:null", "insert:g1", "saveToken:c1:tok-new"],
    );
    assert.deepEqual(result, { changed: true, failed: 0, checked: 1 });
  });

  it("does not loop when a full pull answers restart", async () => {
    const f = fake({ lists: [{ ok: false, reason: "restart" }] });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.equal(f.listModes.length, 1);
  });

  it("saves no token when Google sends no nextSyncToken", async () => {
    const f = fake({ lists: [{ ok: true, events: [gEvent()], nextSyncToken: null }] });
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });

  it("saves the token only after every event is written", async () => {
    const f = fake({ lists: [{ ok: true, events: [gEvent()], nextSyncToken: "tok-new" }] });
    await runPull(f.deps, { force: false });
    assert.ok(f.calls.indexOf("insert:g1") < f.calls.indexOf("saveToken:c1:tok-new"));
  });

  it("keeps the old token when one event fails to write, and goes on with the rest", async () => {
    const f = fake({
      lists: [{ ok: true, events: [gEvent({ id: "g1" }), gEvent({ id: "g2" })], nextSyncToken: "tok-new" }],
      writeInsert: async (i) => {
        if (i.googleEventId === "g1") throw new Error("unique");
      },
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: true, failed: 1, checked: 1 });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });
});

describe("runPull: access", () => {
  it("marks the account needs-relink when Google says the link needs a reconnect", async () => {
    const f = fake({ getAccessToken: async () => ({ ok: false, reason: "reconnect" }) });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: false, failed: 1, checked: 1 });
    assert.ok(f.calls.includes("relink:a1"));
    assert.ok(!f.calls.includes("list"));
  });

  it("does not mark needs-relink for a network failure", async () => {
    const f = fake({ getAccessToken: async () => ({ ok: false, reason: "network" }) });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.ok(!f.calls.some((c) => c.startsWith("relink")));
  });

  it("asks for one access token per account and marks needs-relink once", async () => {
    const calls: string[] = [];
    const f = fake({
      calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }],
      getAccessToken: async (id) => {
        calls.push(`token:${id}`);
        return { ok: false, reason: "reconnect" };
      },
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(calls, ["token:a1"]);
    assert.deepEqual(result, { changed: false, failed: 2, checked: 2 });
    assert.equal(f.calls.filter((c) => c === "relink:a1").length, 1);
  });

  it("counts an unauthorized list as a failure and saves nothing", async () => {
    const f = fake({ lists: [{ ok: false, reason: "unauthorized" }] });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });
});

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
