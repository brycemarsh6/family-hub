import "server-only";
import { db } from "@/lib/db";
import type { SyncDirection } from "@/lib/calendarSyncVocabulary";
import type { GoogleCalendarSummary } from "@/lib/google/types";

// Writes for linked Google accounts and their calendars (mission 55). No
// auth and no revalidatePath here. The Server Actions that call these check
// the session and the owner first, then revalidate; the Google callback route
// checks the session and the one-time state itself, and needs no revalidate
// because every settings page is dynamic.

/** Create or refresh the link for this person and Google account. */
export async function saveLinkedAccount(input: {
  userId: string;
  sub: string;
  email: string;
  scopes: string;
  encryptedRefreshToken: string;
}): Promise<{ id: string }> {
  return db.linkedAccount.upsert({
    where: { userId_googleSubject: { userId: input.userId, googleSubject: input.sub } },
    create: {
      userId: input.userId,
      googleSubject: input.sub,
      email: input.email,
      scopes: input.scopes,
      encryptedRefreshToken: input.encryptedRefreshToken,
    },
    update: {
      email: input.email,
      scopes: input.scopes,
      encryptedRefreshToken: input.encryptedRefreshToken,
      status: "ok",
    },
    select: { id: true },
  });
}

// A long calendar list can outlast Prisma's 5 second default.
const REPLACE_TIMEOUT_MS = 15_000;

/**
 * Make the stored calendars match Google's list, in one transaction. A
 * calendar that stays keeps its direction, syncToken and lastPulledAt; new
 * ones start "off"; ones Google no longer lists are removed.
 */
export async function replaceCalendars(accountId: string, calendars: GoogleCalendarSummary[]): Promise<void> {
  await db.$transaction(async (tx) => {
    const keepIds = calendars.map((calendar) => calendar.id);
    await tx.linkedCalendar.deleteMany({
      where: { accountId, googleCalendarId: { notIn: keepIds } },
    });
    for (const calendar of calendars) {
      await tx.linkedCalendar.upsert({
        where: { accountId_googleCalendarId: { accountId, googleCalendarId: calendar.id } },
        create: {
          accountId,
          googleCalendarId: calendar.id,
          name: calendar.summary,
          colorHex: calendar.backgroundColor,
          isPrimary: calendar.primary,
          accessRole: calendar.accessRole,
          direction: "off",
        },
        update: {
          name: calendar.summary,
          colorHex: calendar.backgroundColor,
          isPrimary: calendar.primary,
          accessRole: calendar.accessRole,
        },
      });
    }
  }, { timeout: REPLACE_TIMEOUT_MS });
}

export async function setCalendarDirection(calendarId: string, direction: SyncDirection): Promise<void> {
  await db.linkedCalendar.update({ where: { id: calendarId }, data: { direction } });
}

export async function renameLinkedAccount(accountId: string, label: string | null): Promise<void> {
  const trimmed = label?.trim() ?? "";
  await db.linkedAccount.update({
    where: { id: accountId },
    data: { label: trimmed === "" ? null : trimmed },
  });
}

/** Deletes the account row; the database cascade removes its calendars. */
export async function unlinkAccount(accountId: string): Promise<void> {
  await db.linkedAccount.delete({ where: { id: accountId } });
}

// The pull (mission 57): the only writes of a calendar's sync token and
// lastPulledAt, and of an account's needs-relink status.

/** Google no longer accepts this account's link; the person must connect it again. */
export async function markAccountNeedsRelink(accountId: string): Promise<void> {
  await db.linkedAccount.update({ where: { id: accountId }, data: { status: "needs-relink" } });
}

/**
 * Take the pull lease on a "Both ways" calendar: one conditional update that
 * stamps lastPulledAt only if it is empty or older than `staleBefore`.
 * Returns false for the caller that lost (or when the calendar was switched
 * off meanwhile), so two devices never pull the same calendar together.
 */
export async function claimCalendarForPull(calendarId: string, staleBefore: Date, now: Date): Promise<boolean> {
  const claimed = await db.linkedCalendar.updateMany({
    where: {
      id: calendarId,
      direction: "twoWay",
      OR: [{ lastPulledAt: null }, { lastPulledAt: { lt: staleBefore } }],
    },
    data: { lastPulledAt: now },
  });
  return claimed.count === 1;
}

/** Save Google's bookmark for "what changed since"; null clears it. */
export async function saveSyncToken(calendarId: string, token: string | null): Promise<void> {
  await db.linkedCalendar.update({ where: { id: calendarId }, data: { syncToken: token } });
}
