import "server-only";
import { db } from "@/lib/db";
import type { SyncDirection } from "@/lib/calendarSyncVocabulary";
import type { GoogleCalendarSummary } from "@/lib/google/types";
import { planHandover } from "@/lib/calendarSyncRules";

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
 * ones start "off"; ones Google no longer lists are removed. The callback
 * route removes those calendars' pulled events first, choosing them with
 * loadAccountCalendarIds (linkedCalendarsRead.ts): keep the two filters in step.
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

/** Returns the row's new `updatedAt`, which the one-link race check compares. */
export async function setCalendarDirection(calendarId: string, direction: SyncDirection): Promise<Date> {
  const updated = await db.linkedCalendar.update({
    where: { id: calendarId },
    data: { direction },
    select: { updatedAt: true },
  });
  return updated.updatedAt;
}

/**
 * A handover (Bryce, 2026-11-09, answer 9): a calendar turned on to "Both ways"
 * takes over the pulled state of its off siblings (other links of the same
 * Google calendar), in one transaction, so the next pull does not import
 * those events a second time. Pulled events and sync rows are moved, never
 * copied; a sibling row for an event this calendar already has a row for is
 * deleted (planHandover decides). The calendar's sync token is cleared so its
 * next pull is a full one that settles anything the move left stale.
 */
export async function adoptSiblingPulls(calendarId: string, siblingIds: string[]): Promise<void> {
  await db.$transaction(async (tx) => {
    const target = await tx.calendarEventSync.findMany({
      where: { linkedCalendarId: calendarId },
      select: { eventId: true },
    });
    const siblingRows = siblingIds.length
      ? await tx.calendarEventSync.findMany({
          where: { linkedCalendarId: { in: siblingIds } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, eventId: true },
        })
      : [];
    const { move, drop } = planHandover(target.map((row) => row.eventId), siblingRows);
    if (siblingIds.length) {
      await tx.calendarEvent.updateMany({
        where: { sourceLinkedCalendarId: { in: siblingIds } },
        data: { sourceLinkedCalendarId: calendarId },
      });
    }
    // Deletes first: a moved row must not meet a row it duplicates.
    if (drop.length) await tx.calendarEventSync.deleteMany({ where: { id: { in: drop } } });
    if (move.length) {
      await tx.calendarEventSync.updateMany({ where: { id: { in: move } }, data: { linkedCalendarId: calendarId } });
    }
    await tx.linkedCalendar.update({ where: { id: calendarId }, data: { syncToken: null } });
  }, { timeout: REPLACE_TIMEOUT_MS });
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

// The pull (mission 58): the only writes of a calendar's sync token,
// lastPulledAt (the lease) and lastPulledOkAt, and of an account's
// needs-relink status.

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

/**
 * Save Google's bookmark for "what changed since"; null clears it. Saving a
 * real token is the pull's success mark (the run saves one only after every
 * event is written), so it also stamps `lastPulledOkAt`, which "Last checked"
 * reads. Clearing a token does not.
 */
export async function saveSyncToken(calendarId: string, token: string | null): Promise<void> {
  await db.linkedCalendar.update({
    where: { id: calendarId },
    data: token === null ? { syncToken: null } : { syncToken: token, lastPulledOkAt: new Date() },
  });
}
