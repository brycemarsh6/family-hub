import "server-only";
import { db } from "@/lib/db";
import { decryptSecret, isTokenKeyConfigured } from "@/lib/tokenCrypto";
import { isGoogleConfigured } from "@/lib/google/oauth";
import type { PullCalendarRow } from "@/lib/calendarPullRun";
import { isPushable, startsTicked, type PlanCalendar } from "@/lib/calendarSyncRules";
import type { CalendarFilterAccountView } from "@/lib/types";
import { toAccountStatus, toSyncDirection, type AccountStatus, type SyncDirection } from "@/lib/calendarSyncVocabulary";

// Reads for linked Google accounts (mission 55). The page reader uses an
// explicit select that leaves out encryptedRefreshToken, so the stored token
// can never reach a client component by accident.

export type SyncedCalendarRow = {
  id: string;
  name: string;
  colorHex: string | null;
  isPrimary: boolean;
  direction: SyncDirection;
  /** Google's role for the linked person; null for rows linked before mission 56. */
  accessRole: string | null;
  /** When a pull of this calendar last worked; null if none has. (The pull's lease stamp is not shown.) */
  lastPulledOkAt: Date | null;
  /** The other link's account email when this one is off and another link of the same Google calendar is on; else null. */
  syncedThrough: string | null;
};

export type SyncedAccountRow = {
  id: string;
  userId: string;
  linkerName: string;
  email: string;
  label: string | null;
  status: AccountStatus;
  calendars: SyncedCalendarRow[];
};

export async function loadSyncedCalendarsPage(): Promise<SyncedAccountRow[]> {
  const accounts = await db.linkedAccount.findMany({
    orderBy: { linkedAt: "asc" },
    select: {
      id: true,
      userId: true,
      email: true,
      label: true,
      status: true,
      user: { select: { displayName: true } },
      calendars: {
        select: {
          id: true,
          name: true,
          colorHex: true,
          isPrimary: true,
          googleCalendarId: true,
          direction: true,
          accessRole: true,
          lastPulledOkAt: true,
        },
      },
    },
  });
  // Which Google calendars have a link that is on, and through whose email.
  const onThrough = new Map<string, string>();
  for (const account of accounts) {
    for (const calendar of account.calendars) {
      if (toSyncDirection(calendar.direction) !== "off") onThrough.set(calendar.googleCalendarId, account.email);
    }
  }
  return accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    linkerName: account.user.displayName,
    email: account.email,
    label: account.label,
    status: toAccountStatus(account.status),
    calendars: account.calendars
      .map(({ googleCalendarId, ...calendar }) => {
        const direction = toSyncDirection(calendar.direction);
        const through = onThrough.get(googleCalendarId);
        return { ...calendar, direction, syncedThrough: direction === "off" && through !== undefined ? through : null };
      })
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name)),
  }));
}

/**
 * The calendars the Calendar's Filter sheet lists (mission 78): every linked
 * calendar that is on, any direction, grouped under its account (oldest link
 * first), primary first then by name. Names and Marshee row ids only: no
 * Google ids, tokens or etags, and no emails except to tell an owner's second
 * unlabelled account from the first.
 */
export async function loadFilterCalendars(): Promise<CalendarFilterAccountView[]> {
  const calendars = await db.linkedCalendar.findMany({
    where: { direction: { not: "off" } },
    select: {
      id: true,
      name: true,
      isPrimary: true,
      account: { select: { id: true, label: true, email: true, linkedAt: true, userId: true, user: { select: { displayName: true } } } },
    },
  });
  const accounts = new Map<
    string,
    { linkedAt: Date; userId: string; label: string | null; email: string; owner: string; view: CalendarFilterAccountView; primary: Set<string> }
  >();
  for (const calendar of calendars) {
    const { account } = calendar;
    let entry = accounts.get(account.id);
    if (!entry) {
      entry = {
        linkedAt: account.linkedAt,
        userId: account.userId,
        label: account.label,
        email: account.email,
        owner: account.user.displayName,
        view: { accountId: account.id, label: "", calendars: [] },
        primary: new Set(),
      };
      accounts.set(account.id, entry);
    }
    entry.view.calendars.push({ id: calendar.id, name: calendar.name });
    if (calendar.isPrimary) entry.primary.add(calendar.id);
  }
  // Heading: the account's label, else "<owner>'s Google"; an owner's second
  // and later unlabelled accounts add the email, so two never read the same.
  // Emails otherwise stay off the Calendar page.
  const unlabelledSeen = new Map<string, number>();
  return [...accounts.values()]
    .sort((a, b) => a.linkedAt.getTime() - b.linkedAt.getTime())
    .map(({ view, primary, label, email, owner, userId }) => {
      let heading = label;
      if (heading === null) {
        const seen = unlabelledSeen.get(userId) ?? 0;
        unlabelledSeen.set(userId, seen + 1);
        heading = seen === 0 ? `${owner}'s Google` : `${owner}'s Google (${email})`;
      }
      return {
        ...view,
        label: heading,
        calendars: view.calendars.sort(
          (a, b) => Number(primary.has(b.id)) - Number(primary.has(a.id)) || a.name.localeCompare(b.name),
        ),
      };
    });
}

/** Who linked this account, for the actions' fresh ownership check. */
export async function loadAccountOwner(accountId: string): Promise<{ userId: string; name: string } | null> {
  const account = await db.linkedAccount.findUnique({
    where: { id: accountId },
    select: { userId: true, user: { select: { displayName: true } } },
  });
  return account ? { userId: account.userId, name: account.user.displayName } : null;
}

/** Who linked the account this calendar belongs to. */
export async function loadCalendarOwner(calendarId: string): Promise<{ userId: string; name: string } | null> {
  const calendar = await db.linkedCalendar.findUnique({
    where: { id: calendarId },
    select: { account: { select: { userId: true, user: { select: { displayName: true } } } } },
  });
  return calendar ? { userId: calendar.account.userId, name: calendar.account.user.displayName } : null;
}

/**
 * The other links of this calendar's Google calendar, for the one-link rule
 * (canTurnOn in calendarSyncRules.ts), the handover and the race check. Empty
 * when the calendar is not found.
 */
export async function loadSiblingCalendars(
  calendarId: string,
): Promise<{ id: string; direction: SyncDirection; email: string; turnedOnAt: Date | null }[]> {
  const calendar = await db.linkedCalendar.findUnique({ where: { id: calendarId }, select: { googleCalendarId: true } });
  if (!calendar) return [];
  const others = await db.linkedCalendar.findMany({
    where: { googleCalendarId: calendar.googleCalendarId, id: { not: calendarId } },
    select: { id: true, direction: true, turnedOnAt: true, account: { select: { email: true } } },
  });
  return others.map((other) => ({
    id: other.id,
    direction: toSyncDirection(other.direction),
    email: other.account.email,
    turnedOnAt: other.turnedOnAt,
  }));
}

/** The decrypted refresh token, for revoking it at Google on unlink and for the push's access token. */
export async function loadRefreshToken(accountId: string): Promise<string | null> {
  const account = await db.linkedAccount.findUnique({
    where: { id: accountId },
    select: { encryptedRefreshToken: true },
  });
  return account ? decryptSecret(account.encryptedRefreshToken) : null;
}

/** One linked calendar and its account's status, for "All of them" (the series move checks both before it touches Google). */
export async function loadSeriesCalendar(
  calendarId: string,
): Promise<{ id: string; googleCalendarId: string; accountId: string; direction: string; accountStatus: string } | null> {
  const calendar = await db.linkedCalendar.findUnique({
    where: { id: calendarId },
    select: { id: true, googleCalendarId: true, accountId: true, direction: true, account: { select: { status: true } } },
  });
  if (!calendar) return null;
  const { account, ...rest } = calendar;
  return { ...rest, accountStatus: account.status };
}

/** Every linked calendar as the push needs it (not filtered: the plan decides what is pushable). */
export async function loadPushCalendars(): Promise<PlanCalendar[]> {
  const calendars = await db.linkedCalendar.findMany({
    select: { id: true, googleCalendarId: true, accountId: true, direction: true, accessRole: true },
  });
  return calendars.map((calendar) => ({ ...calendar, direction: toSyncDirection(calendar.direction) }));
}

/** The "Both ways" calendars the pull reads: accounts that still work only. */
export async function loadPullCalendars(): Promise<PullCalendarRow[]> {
  const calendars = await db.linkedCalendar.findMany({
    where: { direction: "twoWay", account: { status: "ok" } },
    select: {
      id: true,
      googleCalendarId: true,
      accountId: true,
      syncToken: true,
      createdAt: true,
      account: { select: { userId: true } },
    },
  });
  return calendars.map(({ account, ...calendar }) => ({ ...calendar, linkerId: account.userId }));
}

/**
 * The ids of an account's linked calendars: all of them (an unlink), or only
 * those whose Google id is not in `keepGoogleCalendarIds` (calendars Google no
 * longer lists). Their pulled events are removed before the calendars go.
 * The same filter as replaceCalendars's deleteMany (linkedCalendarWrites.ts): keep them in step.
 */
export async function loadAccountCalendarIds(accountId: string, keepGoogleCalendarIds?: string[]): Promise<string[]> {
  const calendars = await db.linkedCalendar.findMany({
    where: { accountId, ...(keepGoogleCalendarIds ? { googleCalendarId: { notIn: keepGoogleCalendarIds } } : {}) },
    select: { id: true },
  });
  return calendars.map((calendar) => calendar.id);
}

/**
 * What the Calendar page needs for the pull (mission 60): the emails of the
 * viewer's own accounts Google has locked out (`needs-relink`), for the banner.
 */
export async function loadCalendarPullState(viewerId: string): Promise<{ relinkEmails: string[] }> {
  const relink = await db.linkedAccount.findMany({
    where: { userId: viewerId, status: "needs-relink" },
    orderBy: { linkedAt: "asc" },
    select: { email: true },
  });
  return { relinkEmails: relink.map((account) => account.email) };
}

/** True when another person has already linked this Google account (its `sub`). */
export async function isGoogleAccountLinkedByAnother(sub: string, userId: string): Promise<boolean> {
  const other = await db.linkedAccount.findFirst({
    where: { googleSubject: sub, userId: { not: userId } },
    select: { id: true },
  });
  return other !== null;
}

/** Copying events to Google needs both the Google settings and the token key. */
export function isCalendarPushConfigured(): boolean {
  return isGoogleConfigured() && isTokenKeyConfigured();
}

export type SyncTarget = {
  /** The LinkedCalendar row id, which is what the event actions take. */
  calendarId: string;
  name: string;
  ownerName: string;
  isMine: boolean;
  /** Starts ticked on a new event: the viewer's own "Both ways" calendars. */
  startsTicked: boolean;
};

/**
 * The calendars an event form may list under "Sync to": set to sync, and
 * writable by Marshee. Nothing when Google or the key is not configured. The
 * viewer's own calendars come first.
 */
export async function loadSyncTargets(viewerId: string): Promise<SyncTarget[]> {
  if (!isCalendarPushConfigured()) return [];
  const calendars = await db.linkedCalendar.findMany({
    where: { direction: { not: "off" } },
    select: {
      id: true,
      name: true,
      isPrimary: true,
      direction: true,
      accessRole: true,
      account: { select: { userId: true, user: { select: { displayName: true } } } },
    },
  });
  return calendars
    .map((calendar) => {
      const direction = toSyncDirection(calendar.direction);
      return { calendar, direction, isMine: calendar.account.userId === viewerId };
    })
    .filter(({ calendar, direction }) => isPushable({ direction, accessRole: calendar.accessRole }))
    .sort(
      (a, b) =>
        Number(b.isMine) - Number(a.isMine) ||
        a.calendar.account.user.displayName.localeCompare(b.calendar.account.user.displayName) ||
        Number(b.calendar.isPrimary) - Number(a.calendar.isPrimary) ||
        a.calendar.name.localeCompare(b.calendar.name),
    )
    .map(({ calendar, direction, isMine }) => ({
      calendarId: calendar.id,
      name: calendar.name,
      ownerName: calendar.account.user.displayName,
      isMine,
      startsTicked: startsTicked({ direction, isMine }),
    }));
}
