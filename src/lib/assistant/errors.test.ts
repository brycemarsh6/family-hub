import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ApiError, aiUnavailable, errorResponse, fromZodError, notFound, toWriteFailure, unauthorisedResponse } from "./errors";

test("errorResponse uses the envelope and status", async () => {
  const res = errorResponse(new ApiError(404, "not_found", "Nope.", { id: "x" }));
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), {
    error: { code: "not_found", message: "Nope.", details: { id: "x" } },
  });
});

test("errorResponse omits details when there are none", async () => {
  const body = await errorResponse(new ApiError(500, "internal", "Oops.")).json();
  assert.deepEqual(body, { error: { code: "internal", message: "Oops." } });
});

test("errorResponse passes headers through", () => {
  const res = errorResponse(new ApiError(429, "rate_limited", "Slow."), { "retry-after": "7" });
  assert.equal(res.headers.get("retry-after"), "7");
});

test("the 401 body is exactly { error: 'unauthorised' }", async () => {
  const res = unauthorisedResponse();
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "unauthorised" });
});

test("fromZodError is a 400 validation error with path details", () => {
  const parsed = z.object({ a: z.object({ b: z.number() }) }).safeParse({ a: { b: "x" } });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  const err = fromZodError(parsed.error);
  assert.equal(err.status, 400);
  assert.equal(err.code, "validation");
  const details = err.details as { path: string; message: string }[];
  assert.equal(details.length, 1);
  assert.equal(details[0].path, "a.b");
  assert.ok(details[0].message.length > 0);
});

test("notFound is a 404 not_found ApiError", () => {
  const err = notFound();
  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 404);
  assert.equal(err.code, "not_found");
});

test("aiUnavailable is a 503 that carries retry-after: 5", async () => {
  const res = errorResponse(aiUnavailable());
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("retry-after"), "5");
  assert.equal((await res.json()).error.code, "ai_unavailable");
});

test("toWriteFailure: code missing is 404, invalid is 400", () => {
  const missing = toWriteFailure({ error: "That tag no longer exists.", code: "missing" });
  assert.equal(missing.status, 404);
  assert.equal(missing.code, "not_found");
  assert.equal(missing.message, "That tag no longer exists.");
  const invalid = toWriteFailure({ error: "Ratings run 1 to 5.", code: "invalid" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.code, "validation");
  // The code decides, never the wording.
  assert.equal(toWriteFailure({ error: "No longer exists.", code: "invalid" }).status, 400);
});
