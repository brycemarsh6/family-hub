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
