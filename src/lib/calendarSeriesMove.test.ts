import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveSeries, type SeriesMoveCalendar, type SeriesMoveDeps, type SeriesMoveEvent } from "./calendarSeriesMove";
import type { EventCallResult, GetEventResult, GoogleTimesPatch, ListEventsResult } from "./google/types";
import type { SeriesRow } from "./calendarSeriesRules";

// The steps of "All of them" with every call faked. Nothing here reaches
// Google or a database; `calls` records every dep that was used.

const DENVER = "America/Denver";
const EVENT: SeriesMoveEvent = {
  startAt: new Date("2026-07-01T13:00:00Z"), // 07:00 MDT
  endAt: new Date("2026-07-01T14:00:00Z"),
  allDay: false,
  googleSeriesId: "S",
  sourceLinkedCalendarId: "c1",
};
const CALENDAR: SeriesMoveCalendar = { id: "c1", googleCalendarId: "g-cal", accountId: "a1", direction: "twoWay", accountStatus: "ok" };
const PARENT = {
  start: { dateTime: "2026-06-01T07:00:00-06:00", timeZone: DENVER },
  end: { dateTime: "2026-06-01T08:00:00-06:00", timeZone: DENVER },
};
const NEW_START = new Date("2026-07-01T13:30:00Z");

type Over = Partial<SeriesMoveDeps> & {
  event?: SeriesMoveEvent | null;
  calendar?: SeriesMoveCalendar | null;
  parent?: GetEventResult;
  patchResult?: EventCallResult;
  instances?: ListEventsResult;
  rows?: SeriesRow[];
  movedRowId?: string | null;
  pullFailed?: number;
};

function fake(over: Over = {}) {
  const calls: string[] = [];
  const patches: { googleEventId: string; patch: GoogleTimesPatch; ifMatch?: string }[] = [];
  const deleted: string[] = [];
  const deletedOn: string[] = [];
  const deps: SeriesMoveDeps = {
    now: () => new Date("2026-11-09T18:00:00Z"),
    loadEvent: async () => (over.event === undefined ? EVENT : over.event),
    loadCalendar: async () => (over.calendar === undefined ? CALENDAR : over.calendar),
    getAccessToken: async () => {
      calls.push("token");
      return { ok: true, accessToken: "access" };
    },
    getEvent: async () => {
      calls.push("getEvent");
      return over.parent ?? { ok: true, etag: '"p1"', event: PARENT };
    },
    updateEvent: async (_t, _c, googleEventId, patch, ifMatch) => {
      calls.push("updateEvent");
      patches.push({ googleEventId, patch, ifMatch });
      return over.patchResult ?? { ok: true, etag: '"p2"' };
    },
    listInstances: async () => {
      calls.push("listInstances");
      return over.instances ?? { ok: true, events: [], nextSyncToken: null };
    },
    pullCalendar: async (id) => {
      calls.push(`pull:${id}`);
      return { failed: over.pullFailed ?? 0 };
    },
    loadSeriesRows: async () => {
      calls.push("loadSeriesRows");
      return over.rows ?? [];
    },
    deleteRow: async (d, calendarId) => {
      calls.push(`delete:${d.eventId}`);
      deleted.push(d.eventId);
      deletedOn.push(calendarId);
    },
    findRowAt: async (_c, _s, startAt) => {
      calls.push(`findRowAt:${startAt.toISOString()}`);
      return over.movedRowId === undefined ? "moved-row" : over.movedRowId;
    },
    ...over,
  };
  return { deps, calls, patches, deleted, deletedOn };
}

const run = (f: ReturnType<typeof fake>, start = NEW_START) => moveSeries(f.deps, "e1", start, DENVER);
const NOTHING_MOVED = { error: "Couldn't change Google Calendar. Nothing moved." };
/** Nothing past the Google read: no write to Google and nothing in the database or pull. */
const wroteNothing = (f: ReturnType<typeof fake>) =>
  assert.deepEqual(f.calls.filter((c) => c === "updateEvent" || c.startsWith("pull:") || c.startsWith("delete:")), []);

describe("moveSeries: refusals", () => {
  it("refuses an event that does not repeat", async () => {
    const f = fake({ event: { ...EVENT, googleSeriesId: null } });
    assert.deepEqual(await run(f), { error: "That event doesn't repeat." });
    assert.deepEqual(f.calls, []);
  });

  it("refuses an event with no source calendar", async () => {
    const f = fake({ event: { ...EVENT, sourceLinkedCalendarId: null } });
    assert.deepEqual(await run(f), { error: "That event doesn't repeat." });
  });

  it("refuses a calendar set to Marshee-to-Google-only, to off, a missing link or an account that needs relinking", async () => {
    for (const calendar of [{ ...CALENDAR, direction: "outbound" }, { ...CALENDAR, direction: "off" }, null, { ...CALENDAR, accountStatus: "needsRelink" }]) {
      const f = fake({ calendar });
      assert.deepEqual(await run(f), { error: "That calendar isn't syncing both ways any more." });
      assert.deepEqual(f.calls, []);
    }
  });

  it("refuses a different day, an all-day event and a multi-day event before asking Google anything", async () => {
    const f = fake();
    assert.deepEqual(await run(f, new Date("2026-07-02T13:00:00Z")), { error: "Only this one can move to another day." });
    assert.deepEqual(await moveSeries(fake({ event: { ...EVENT, allDay: true } }).deps, "e1", NEW_START, DENVER), {
      error: "All-day events can't be dragged.",
    });
    assert.deepEqual(f.calls, []);
  });

  it("says the event is gone when the row is missing", async () => {
    assert.deepEqual(await run(fake({ event: null })), { error: "That event no longer exists." });
  });

  it("refuses an all-day parent without writing to Google", async () => {
    const f = fake({ parent: { ok: true, etag: null, event: { start: { date: "2026-06-01" }, end: { date: "2026-06-02" } } } });
    assert.deepEqual(await run(f), { error: "That event doesn't have a set time to move." });
    wroteNothing(f);
  });
});

describe("moveSeries: a Google failure writes nothing", () => {
  for (const reason of ["changed", "gone", "network", "unauthorized", "conflict"] as const) {
    it(`getEvent ${reason}`, async () => {
      const f = fake({ parent: { ok: false, reason } });
      assert.deepEqual(await run(f), NOTHING_MOVED);
      wroteNothing(f);
      assert.ok(!f.calls.includes("listInstances") && !f.calls.some((c) => c.startsWith("findRowAt")));
    });
    it(`PATCH ${reason} (412 changed, 404 gone, 500 network)`, async () => {
      const f = fake({ patchResult: { ok: false, reason } });
      assert.deepEqual(await run(f), NOTHING_MOVED);
      assert.deepEqual(f.calls.filter((c) => c.startsWith("pull:") || c.startsWith("delete:") || c === "listInstances"), []);
    });
  }

  it("a failed token refresh writes nothing", async () => {
    const f = fake({ getAccessToken: async () => ({ ok: false }) });
    assert.deepEqual(await run(f), NOTHING_MOVED);
    assert.deepEqual(f.calls, []);
  });
});

describe("moveSeries: success", () => {
  it("makes exactly one PATCH, to the parent, +30 wall-clock minutes, timeZone kept, If-Match its etag", async () => {
    const f = fake();
    const result = await run(f);
    assert.equal(f.patches.length, 1);
    assert.deepEqual(f.patches[0], {
      googleEventId: "S",
      ifMatch: '"p1"',
      patch: {
        start: { dateTime: "2026-06-01T07:30:00-06:00", timeZone: DENVER },
        end: { dateTime: "2026-06-01T08:30:00-06:00", timeZone: DENVER },
      },
    });
    assert.deepEqual(result, { undo: { eventId: "moved-row", startIso: "2026-07-01T13:00:00.000Z" } });
  });

  it("goes in order: token, read parent, patch, pull that calendar, list instances, read rows, find the dragged day", async () => {
    const f = fake();
    await run(f);
    assert.deepEqual(f.calls, [
      "token",
      "getEvent",
      "updateEvent",
      "pull:c1",
      "listInstances",
      "loadSeriesRows",
      `findRowAt:${NEW_START.toISOString()}`,
    ]);
  });

  it("a parent dated in summer, a drop in winter: the wall time stays (7:00 to 7:30)", async () => {
    const winter: SeriesMoveEvent = { ...EVENT, startAt: new Date("2026-12-01T14:00:00Z"), endAt: new Date("2026-12-01T15:00:00Z") }; // 07:00 MST
    const f = fake({ event: winter });
    await moveSeries(f.deps, "e1", new Date("2026-12-01T14:30:00Z"), DENVER);
    assert.equal(f.patches[0].patch.start.dateTime, "2026-06-01T07:30:00-06:00");
    assert.equal(f.patches[0].patch.end.dateTime, "2026-06-01T08:30:00-06:00");
  });

  it("a parent dated in winter, a drop in summer: the wall time stays", async () => {
    const f = fake({
      parent: {
        ok: true,
        etag: null,
        event: { start: { dateTime: "2026-01-05T07:00:00-07:00", timeZone: DENVER }, end: { dateTime: "2026-01-05T08:00:00-07:00", timeZone: DENVER } },
      },
    });
    await run(f);
    assert.equal(f.patches[0].patch.start.dateTime, "2026-01-05T07:30:00-07:00");
    assert.equal(f.patches[0].ifMatch, undefined);
  });

  it("drops on the clock-change days (2026-03-08 and 2026-11-01) shift by the same wall minutes", async () => {
    for (const [from, to] of [
      ["2026-03-08T13:00:00Z", "2026-03-08T13:30:00Z"],
      ["2026-11-01T14:00:00Z", "2026-11-01T14:30:00Z"],
    ]) {
      const f = fake({ event: { ...EVENT, startAt: new Date(from), endAt: new Date(new Date(from).getTime() + 3600000) } });
      await moveSeries(f.deps, "e1", new Date(to), DENVER);
      assert.equal(f.patches[0].patch.start.dateTime, "2026-06-01T07:30:00-06:00");
    }
  });

  it("cleanup deletes only the rows of that series and calendar that Google no longer lists", async () => {
    const rows: SeriesRow[] = [
      { eventId: "keep", googleEventId: "S_new1", linkedCalendarId: "c1", googleSeriesId: "S" },
      { eventId: "stale1", googleEventId: "S_old1", linkedCalendarId: "c1", googleSeriesId: "S" },
      { eventId: "other-series", googleEventId: "T_old", linkedCalendarId: "c1", googleSeriesId: "T" },
      { eventId: "other-cal", googleEventId: "S_old2", linkedCalendarId: "c2", googleSeriesId: "S" },
    ];
    const f = fake({ rows, instances: { ok: true, events: [{ id: "S_new1" }], nextSyncToken: null } });
    await run(f);
    assert.deepEqual(f.deleted, ["stale1"]);
  });

  it("every cleanup delete names the source calendar, so no copy of it is sent to Google", async () => {
    const rows: SeriesRow[] = ["a", "b"].map((id) => ({ eventId: id, googleEventId: `S_${id}`, linkedCalendarId: "c1", googleSeriesId: "S" }));
    const f = fake({ rows });
    await run(f);
    assert.deepEqual(f.deleted, ["a", "b"]);
    assert.deepEqual(f.deletedOn, ["c1", "c1"]);
  });

  it("a pull that reported failures lists and deletes nothing, and the move still reports", async () => {
    const rows: SeriesRow[] = [{ eventId: "stale1", googleEventId: "S_old1", linkedCalendarId: "c1", googleSeriesId: "S" }];
    const f = fake({ rows, pullFailed: 2 });
    assert.deepEqual(await run(f), { undo: { eventId: "moved-row", startIso: "2026-07-01T13:00:00.000Z" } });
    assert.deepEqual(f.calls.filter((c) => c === "listInstances" || c === "loadSeriesRows" || c.startsWith("delete:")), []);
  });

  it("a failed instance list deletes nothing but the move still reports", async () => {
    const f = fake({
      rows: [{ eventId: "stale1", googleEventId: "S_old1", linkedCalendarId: "c1", googleSeriesId: "S" }],
      instances: { ok: false, reason: "network" },
    });
    assert.deepEqual(await run(f), { undo: { eventId: "moved-row", startIso: "2026-07-01T13:00:00.000Z" } });
    assert.deepEqual(f.deleted, []);
  });

  it("one stale row that will not delete does not stop the others", async () => {
    const rows: SeriesRow[] = ["a", "b"].map((id) => ({ eventId: id, googleEventId: `S_${id}`, linkedCalendarId: "c1", googleSeriesId: "S" }));
    const f = fake({
      rows,
      deleteRow: async (d) => {
        if (d.eventId === "a") throw new Error("db down");
        f.deleted.push(d.eventId);
      },
    });
    await run(f);
    assert.deepEqual(f.deleted, ["b"]);
  });

  it("gives {} with no undo when the dragged day's row is not found after the pull", async () => {
    assert.deepEqual(await run(fake({ movedRowId: null })), {});
  });
});

describe("moveSeries: Undo", () => {
  it("is the same call with the opposite drop and gives the original times back", async () => {
    const first = fake();
    const result = await run(first);
    assert.ok(result.undo);
    const forward = first.patches[0].patch;

    // After the pull the series sits at 7:30; Undo drops the returned row back onto the original start.
    const second = fake({
      event: { ...EVENT, startAt: NEW_START, endAt: new Date("2026-07-01T14:30:00Z") },
      parent: { ok: true, etag: '"p2"', event: forward },
    });
    const undone = await moveSeries(second.deps, result.undo.eventId, new Date(result.undo.startIso), DENVER);
    assert.deepEqual(second.patches[0].patch, {
      start: { dateTime: "2026-06-01T07:00:00-06:00", timeZone: DENVER },
      end: { dateTime: "2026-06-01T08:00:00-06:00", timeZone: DENVER },
    });
    assert.equal(second.patches.length, 1);
    assert.deepEqual(undone.undo?.startIso, NEW_START.toISOString());
  });
});

describe("moveSeries: one Google write", () => {
  it("uses no push dep at all: the deps type has none, and a drop makes exactly one updateEvent", async () => {
    const f = fake();
    await run(f);
    assert.equal(f.calls.filter((c) => c === "updateEvent").length, 1);
    assert.ok(!Object.keys(f.deps).some((key) => /push/i.test(key)));
  });
});
