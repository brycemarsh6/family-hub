import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { isMissingRowError, isTransactionStartTimeout, isWriteConflictError } from "@/lib/prismaErrors";
import { ApiError, errorResponse, fromZodError, notFound, unauthorisedResponse } from "./errors";

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

// Constructed errors only: prismaErrors.ts imports the generated Prisma
// namespace, never a client, so no database connection is made here.
function known(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: "test", meta });
}
const adapterError = (originalCode: string) => known("P2039", { driverAdapterError: { cause: { originalCode } } });

test("isWriteConflictError: P2034 and P2039 with a deadlock/serialization SQLSTATE", () => {
  assert.equal(isWriteConflictError(known("P2034")), true);
  assert.equal(isWriteConflictError(adapterError("40P01")), true);
  assert.equal(isWriteConflictError(adapterError("40001")), true);
});

test("isWriteConflictError: other P2039s, other codes and non-Prisma errors are not conflicts", () => {
  assert.equal(isWriteConflictError(adapterError("23505")), false);
  assert.equal(isWriteConflictError(known("P2039")), false);
  assert.equal(isWriteConflictError(known("P2025")), false);
  assert.equal(isWriteConflictError(new Error("40P01")), false);
  assert.equal(isWriteConflictError(null), false);
});

test("isTransactionStartTimeout is exactly P2028", () => {
  assert.equal(isTransactionStartTimeout(known("P2028")), true);
  assert.equal(isTransactionStartTimeout(known("P2034")), false);
  assert.equal(isTransactionStartTimeout(new Error("P2028")), false);
  assert.equal(isMissingRowError(known("P2028")), false);
});
