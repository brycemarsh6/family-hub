import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ApiError, errorResponse, fromZodError, unauthorisedResponse } from "./errors";

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
