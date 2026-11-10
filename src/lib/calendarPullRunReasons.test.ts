import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPull, type PullAccessResult, type PullCalendarRow, type PullRunDeps } from "./calendarPullRun";
import type { ListEventsResult } from "./google/types";

// The reason words a failed pull hands to the server log: fixed words, an
// HTTP status or a Prisma code, never a token or a message.

const CAL: PullCalendarRow = { id: "c1", googleCalendarId: "g-cal", accountId: "a1", linkerId: "u1", syncToken: null, createdAt: new Date("2026-11-01T00:00:00Z") };

function deps(over: Partial<PullRunDeps>, heard: string[]): PullRunDeps {
  return {
    isConfigured: () => true,
    loadCalendars: async () => [CAL],
    claim: async () => true,
    getAccessToken: async (): Promise<PullAccessResult> => ({ ok: true, accessToken: "SECRET-ACCESS" }),
    markNeedsRelink: async () => {},
    list: async (): Promise<ListEventsResult> => ({ ok: true, events: [], nextSyncToken: "SECRET-SYNC" }),
    saveSyncToken: async () => {},
    loadKnown: async () => ({ byGoogleId: new Map(), byMarsheeId: new Map() }),
    writeInsert: async () => {},
    writeUpdate: async () => {},
    writeDelete: async () => {},
    pushBack: async () => {},
    now: () => new Date("2026-11-09T18:00:00Z"),
    noteFailure: (reason) => heard.push(reason),
    ...over,
  };
}

describe("runPull: failure reasons for the log", () => {
  it("names a list failure with Google's status", async () => {
    const heard: string[] = [];
    const r = await runPull(deps({ list: async () => ({ ok: false, reason: "network", status: 503 }) }, heard), { force: true });
    assert.equal(r.failed, 1);
    assert.deepEqual(heard, ["list:network:503"]);
  });

  it("names a token failure and a too-many list without a status", async () => {
    const heard: string[] = [];
    await runPull(deps({ getAccessToken: async () => ({ ok: false, reason: "network" }) }, heard), { force: true });
    await runPull(deps({ list: async () => ({ ok: false, reason: "too-many" }) }, heard), { force: true });
    assert.deepEqual(heard, ["token:network", "list:too-many"]);
  });

  it("gives a write failure's Prisma code and never its message", async () => {
    const heard: string[] = [];
    const prismaError = Object.assign(new Error("SECRET title from Google"), { code: "P2002" });
    const list = async (): Promise<ListEventsResult> => ({
      ok: true,
      events: [{ id: "g1", status: "confirmed", summary: "x", start: { dateTime: "2026-11-10T17:00:00Z" }, end: { dateTime: "2026-11-10T18:00:00Z" } }],
      nextSyncToken: "SECRET-SYNC",
    });
    await runPull(deps({ list, writeInsert: async () => { throw prismaError; } }, heard), { force: true });
    await runPull(deps({ list, writeInsert: async () => { throw new Error("SECRET"); } }, heard), { force: true });
    assert.deepEqual(heard, ["write:P2002", "write:error"]);
    assert.ok(!heard.join(" ").includes("SECRET"));
  });
});
