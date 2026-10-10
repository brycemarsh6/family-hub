import { Prisma } from "@/generated/prisma/client";

/**
 * True when an update or delete failed because the row it targeted isn't
 * there any more (Prisma's P2025).
 *
 * This is a real case in this app, not a theoretical one: two phones are
 * signed into the same household account, so a recipe or tag can genuinely
 * be deleted on one while the other still has it on screen. Catching the
 * code lets the action return the house's usual `{ error }` shape instead
 * of throwing an unhandled Server Action error.
 *
 * Deliberately a catch rather than a findUnique-then-update: reading first
 * costs a second round trip (which the performance notes in CLAUDE.md care
 * about) *and* still leaves a window where the row disappears between the
 * two queries. Letting the write fail and reading the code is both cheaper
 * and actually race-free.
 */
export function isMissingRowError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  );
}

/**
 * A transaction Postgres aborted because it collided with another one: a
 * deadlock (40P01) or serialization failure (40001). Nothing it did was kept,
 * so telling the caller to retry is safe.
 *
 * "Retrying is safe" holds only while every handler is one statement or one
 * `$transaction`: a handler that did several separate writes could have
 * applied some of them before the collision.
 *
 * Two shapes, both looked up in node_modules/@prisma/client/runtime/client.js
 * and the first seen live (the dev DB, driver adapter pg, two bulk-adjusts
 * naming the same rows in opposite order):
 *  - P2039, the generic driver-adapter error: this is what a deadlock arrives
 *    as under `@prisma/adapter-pg`, with the Postgres SQLSTATE in
 *    `meta.driverAdapterError.cause.originalCode`.
 *  - P2034, Prisma's own TransactionWriteConflict ("write conflict or a
 *    deadlock. Please retry your transaction"), for any path that maps it.
 */
export function isWriteConflictError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2039") return false;
  const cause = (error.meta as { driverAdapterError?: { cause?: { originalCode?: unknown } } } | undefined)
    ?.driverAdapterError?.cause;
  return cause?.originalCode === "40P01" || cause?.originalCode === "40001";
}

/**
 * P2028, "Transaction API error": Prisma could not start (or find) a
 * transaction, most often because no connection became free within `maxWait`;
 * it also covers a transaction already closed or timed out. Either way the
 * transaction rolled back, so a 503 "try again" stays safe.
 * Looked up in node_modules/@prisma/client/runtime/client.js (line 11, the
 * minified bundle): `TransactionManagerError` is constructed with the code
 * "P2028" and message prefix "Transaction API error: ". Under a burst this
 * is the pool being busy, not a bug, and nothing in the transaction ran.
 */
export function isTransactionStartTimeout(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028";
}
