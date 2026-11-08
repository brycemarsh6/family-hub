import "server-only";
import { db } from "@/lib/db";
import type { SyncDirection } from "@/lib/calendarSyncVocabulary";
import type { GoogleCalendarSummary } from "@/lib/google/types";

// Writes for linked Google accounts and their calendars (mission 55). No
// auth and no revalidatePath here: the Server Action that calls these checks
// the session and the owner first, then revalidates.

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
          direction: "off",
        },
        update: {
          name: calendar.summary,
          colorHex: calendar.backgroundColor,
          isPrimary: calendar.primary,
        },
      });
    }
  });
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
