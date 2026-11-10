import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPull } from "./calendarPullRun";
import type { ListEventsResult } from "./google/types";
import { fake, gEvent } from "./testing/calendarPullRunHarness";

// The reason words a failed pull hands to the server log: fixed words, an
// HTTP status or a Prisma code, never a token or a message.

describe("runPull: failure reasons for the log", () => {
  it("names a list failure with Google's status", async () => {
    const heard: string[] = [];
    const noteFailure = (reason: string) => void heard.push(reason);
    const f = fake({ noteFailure, list: async () => ({ ok: false, reason: "network", status: 503 }) });
    const r = await runPull(f.deps, { force: true });
    assert.equal(r.failed, 1);
    assert.deepEqual(heard, ["list:network:503"]);
  });

  it("names a token failure and a too-many list without a status", async () => {
    const heard: string[] = [];
    const noteFailure = (reason: string) => void heard.push(reason);
    await runPull(fake({ noteFailure, getAccessToken: async () => ({ ok: false, reason: "network" }) }).deps, { force: true });
    await runPull(fake({ noteFailure, list: async () => ({ ok: false, reason: "too-many" }) }).deps, { force: true });
    assert.deepEqual(heard, ["token:network", "list:too-many"]);
  });

  it("gives a write failure's Prisma code and never its message", async () => {
    const heard: string[] = [];
    const noteFailure = (reason: string) => void heard.push(reason);
    const prismaError = Object.assign(new Error("SECRET title from Google"), { code: "P2002" });
    const list = async (): Promise<ListEventsResult> => ({
      ok: true,
      events: [gEvent({ id: "g1", summary: "x", start: { dateTime: "2026-11-10T17:00:00Z" }, end: { dateTime: "2026-11-10T18:00:00Z" } })],
      nextSyncToken: "SECRET-SYNC",
    });
    await runPull(fake({ noteFailure, list, writeInsert: async () => { throw prismaError; } }).deps, { force: true });
    await runPull(fake({ noteFailure, list, writeInsert: async () => { throw new Error("SECRET"); } }).deps, { force: true });
    assert.deepEqual(heard, ["write:P2002", "write:error"]);
    assert.ok(!heard.join(" ").includes("SECRET"));
  });
});
