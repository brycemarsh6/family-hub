import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteEvent, getEvent, insertEvent, listEvents, MAX_LIST_PAGES, updateEvent, type FetchLike } from "./calendarEventCalls";
import { toGoogleEvent } from "./eventPayload";

// Every test passes a fake fetch. Nothing here reaches Google.

const TOKEN = "ya29.SECRET-ACCESS-TOKEN";
const payload = toGoogleEvent({
  marsheeEventId: "cmabc",
  title: "Dentist",
  notes: null,
  location: null,
  startAt: new Date("2026-03-07T19:00:00Z"),
  endAt: new Date("2026-03-07T20:00:00Z"),
  allDay: false,
  showBusyOnGoogle: false,
  forNames: [],
});

type Seen = { url: string; init: RequestInit };

function fake(status: number, body: unknown): { fetchFn: FetchLike; seen: Seen[] } {
  const seen: Seen[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    seen.push({ url, init });
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  };
  return { fetchFn, seen };
}

const calls = {
  insert: (f: FetchLike) => insertEvent(f, TOKEN, "a@b.com", "abc123", payload),
  update: (f: FetchLike) => updateEvent(f, TOKEN, "a@b.com", "abc123", payload, '"etag1"'),
  delete: (f: FetchLike) => deleteEvent(f, TOKEN, "a@b.com", "abc123"),
  get: (f: FetchLike) => getEvent(f, TOKEN, "a@b.com", "abc123"),
};

describe("event calls: requests", () => {
  it("insert POSTs to the encoded calendar with sendUpdates=none and the chosen id", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e1"' });
    const r = await calls.insert(fetchFn);
    assert.deepEqual(r, { ok: true, etag: '"e1"' });
    assert.equal(seen[0].url, "https://www.googleapis.com/calendar/v3/calendars/a%40b.com/events?sendUpdates=none");
    assert.equal(seen[0].init.method, "POST");
    assert.equal(JSON.parse(seen[0].init.body as string).id, "abc123");
    assert.equal((seen[0].init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`);
    assert.ok(seen[0].init.signal);
  });

  it("update PATCHes the event with If-Match when given", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e2"' });
    const r = await calls.update(fetchFn);
    assert.deepEqual(r, { ok: true, etag: '"e2"' });
    assert.equal(
      seen[0].url,
      "https://www.googleapis.com/calendar/v3/calendars/a%40b.com/events/abc123?sendUpdates=none",
    );
    assert.equal(seen[0].init.method, "PATCH");
    assert.equal((seen[0].init.headers as Record<string, string>)["If-Match"], '"etag1"');
  });

  it("update is a PATCH, never a PUT, and a body without transparency stays without it", async () => {
    const { fetchFn, seen } = fake(200, {});
    const partial = { ...payload };
    delete partial.transparency;
    await updateEvent(fetchFn, TOKEN, "a@b.com", "abc123", partial);
    assert.equal(seen[0].init.method, "PATCH");
    assert.equal("transparency" in JSON.parse(seen[0].init.body as string), false);
  });

  it("update still reports 409 as conflict and 412 as changed through PATCH", async () => {
    assert.deepEqual(await updateEvent(fake(409, {}).fetchFn, TOKEN, "a@b.com", "abc123", payload), { ok: false, reason: "conflict" });
    assert.deepEqual(await updateEvent(fake(412, {}).fetchFn, TOKEN, "a@b.com", "abc123", payload, '"x"'), { ok: false, reason: "changed" });
  });

  it("update sends no If-Match when none is given", async () => {
    const { fetchFn, seen } = fake(200, {});
    await updateEvent(fetchFn, TOKEN, "a@b.com", "abc123", payload);
    assert.equal("If-Match" in (seen[0].init.headers as Record<string, string>), false);
  });

  it("delete sends DELETE with no If-Match and no body", async () => {
    const { fetchFn, seen } = fake(204, null);
    const r = await calls.delete(fetchFn);
    assert.deepEqual(r, { ok: true, etag: null });
    assert.equal(seen[0].init.method, "DELETE");
    assert.equal("If-Match" in (seen[0].init.headers as Record<string, string>), false);
    assert.equal(seen[0].init.body, undefined);
  });

  it("get returns the event and its etag", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e3"', summary: "Dentist" });
    const r = await calls.get(fetchFn);
    assert.equal(seen[0].init.method, "GET");
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.etag, '"e3"');
      assert.equal(r.event.summary, "Dentist");
    }
  });

  it("succeeds with a null etag when Google's reply has none", async () => {
    const { fetchFn } = fake(200, {});
    assert.deepEqual(await calls.insert(fetchFn), { ok: true, etag: null });
  });
});

describe("event calls: status codes", () => {
  const expected: Array<[number, string]> = [
    [409, "conflict"],
    [412, "changed"],
    [404, "gone"],
    [410, "gone"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [500, "network"],
    [503, "network"],
    [429, "network"],
    [400, "network"],
  ];
  for (const [name, call] of Object.entries(calls)) {
    for (const [status, reason] of expected) {
      it(`${name} maps ${status} to ${reason}`, async () => {
        const { fetchFn } = fake(status, { error: { message: `leak ${TOKEN}` } });
        assert.deepEqual(await call(fetchFn), { ok: false, reason });
      });
    }
  }

  it("maps a thrown fetch to network and drops the error", async () => {
    const boom: FetchLike = async () => {
      throw new Error(`failed with Authorization: Bearer ${TOKEN}`);
    };
    for (const call of Object.values(calls)) {
      const r = await call(boom);
      assert.deepEqual(r, { ok: false, reason: "network" });
      assert.equal(JSON.stringify(r).includes(TOKEN), false);
    }
  });

  it("get maps an unreadable body to network", async () => {
    const bad: FetchLike = async () => new Response("not json", { status: 200 });
    assert.deepEqual(await calls.get(bad), { ok: false, reason: "network" });
  });
});

const LIST_BASE = "https://www.googleapis.com/calendar/v3/calendars/a%40b.com/events?";

describe("listEvents", () => {
  it("a full pull sends timeMin, singleEvents, showDeleted and maxResults, never syncToken", async () => {
    const { fetchFn, seen } = fake(200, { items: [{ id: "e1" }], nextSyncToken: "SYNC-1" });
    const r = await listEvents(fetchFn, TOKEN, "a@b.com", { timeMin: "2026-10-01T00:00:00.000Z" });
    assert.deepEqual(r, { ok: true, events: [{ id: "e1" }], nextSyncToken: "SYNC-1" });
    assert.equal(seen[0].init.method, "GET");
    assert.equal(
      seen[0].url,
      `${LIST_BASE}timeMin=2026-10-01T00%3A00%3A00.000Z&singleEvents=true&showDeleted=true&maxResults=250`,
    );
    assert.equal((seen[0].init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`);
    assert.ok(seen[0].init.signal);
  });

  it("a token pull sends syncToken, singleEvents, showDeleted and maxResults, never timeMin", async () => {
    const { fetchFn, seen } = fake(200, { items: [], nextSyncToken: "SYNC-2" });
    await listEvents(fetchFn, TOKEN, "a@b.com", { syncToken: "SYNC-1" });
    assert.equal(seen[0].url, `${LIST_BASE}syncToken=SYNC-1&singleEvents=true&showDeleted=true&maxResults=250`);
  });

  it("no request URL ever holds both syncToken and timeMin, across pages and modes", async () => {
    const urls: string[] = [];
    let n = 0;
    const fetchFn: FetchLike = async (url) => {
      urls.push(url);
      n += 1;
      return new Response(JSON.stringify(n % 3 === 0 ? { items: [] } : { items: [], nextPageToken: `P${n}` }), { status: 200 });
    };
    await listEvents(fetchFn, TOKEN, "a@b.com", { syncToken: "S" });
    await listEvents(fetchFn, TOKEN, "a@b.com", { timeMin: "2026-10-01T00:00:00.000Z" });
    assert.ok(urls.length >= 4);
    for (const url of urls) assert.ok(!(url.includes("syncToken") && url.includes("timeMin")), url);
  });

  it("follows pageToken and joins the pages, keeping only the last page's sync token", async () => {
    const seen: string[] = [];
    const fetchFn: FetchLike = async (url) => {
      seen.push(url);
      const first = !url.includes("pageToken");
      return new Response(
        JSON.stringify(first ? { items: [{ id: "a" }], nextPageToken: "NEXT" } : { items: [{ id: "b" }, "junk", { nope: 1 }], nextSyncToken: "END" }),
        { status: 200 },
      );
    };
    const r = await listEvents(fetchFn, TOKEN, "a@b.com", { syncToken: "S" });
    assert.deepEqual(r, { ok: true, events: [{ id: "a" }, { id: "b" }], nextSyncToken: "END" });
    assert.ok(seen[1].includes("pageToken=NEXT"));
  });

  it("stops at 20 pages with too-many", async () => {
    let calls = 0;
    const fetchFn: FetchLike = async () => {
      calls += 1;
      return new Response(JSON.stringify({ items: [], nextPageToken: `P${calls}` }), { status: 200 });
    };
    assert.deepEqual(await listEvents(fetchFn, TOKEN, "a@b.com", { syncToken: "S" }), { ok: false, reason: "too-many" });
    assert.equal(calls, MAX_LIST_PAGES);
    assert.equal(MAX_LIST_PAGES, 20);
  });

  it("a pull that ends on page 20 is fine", async () => {
    let calls = 0;
    const fetchFn: FetchLike = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls < 20 ? { items: [], nextPageToken: "P" } : { items: [], nextSyncToken: "T" }), { status: 200 });
    };
    assert.deepEqual(await listEvents(fetchFn, TOKEN, "a@b.com", { syncToken: "S" }), { ok: true, events: [], nextSyncToken: "T" });
  });

  it("maps 410 and 400 to restart, 401 and 403 to unauthorized, the rest to network, with the status", async () => {
    const mode = { syncToken: "S" };
    for (const [status, reason] of [[410, "restart"], [400, "restart"], [401, "unauthorized"], [403, "unauthorized"], [500, "network"], [404, "network"]] as const) {
      assert.deepEqual(await listEvents(fake(status, {}).fetchFn, TOKEN, "a@b.com", mode), { ok: false, reason, status });
    }
  });

  it("maps a throw or an unreadable body to network, and never carries the token or a body", async () => {
    const boom: FetchLike = async () => {
      throw new Error(`failed with ${TOKEN}`);
    };
    const bad: FetchLike = async () => new Response("not json", { status: 200 });
    const secret = fake(500, { error: { message: "SYNC-SECRET body" } }).fetchFn;
    for (const [f, status] of [[boom, undefined], [bad, undefined], [secret, 500]] as const) {
      const r = await listEvents(f, TOKEN, "a@b.com", { syncToken: "S" });
      assert.deepEqual(r, status === undefined ? { ok: false, reason: "network" } : { ok: false, reason: "network", status });
      assert.ok(!JSON.stringify(r).includes("SECRET"));
    }
  });

  it("a last page without a sync token gives null", async () => {
    const r = await listEvents(fake(200, { items: [] }).fetchFn, TOKEN, "a@b.com", { timeMin: "2026-10-01T00:00:00.000Z" });
    assert.deepEqual(r, { ok: true, events: [], nextSyncToken: null });
  });
});
