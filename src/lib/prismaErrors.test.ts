import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@/generated/prisma/client";
import { isMissingRowError, isTransactionStartTimeout, isWriteConflictError } from "./prismaErrors";

// Tests for src/lib/prismaErrors.ts (the Prisma error classifiers).
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
