import { isReadOnlyRole, type SyncDirection, type SyncRowStatus } from "@/lib/calendarSyncVocabulary";

// The pure rules for copying a Marshee event to Google (mission 56, design
// decisions 3 to 8): which calendars take a copy, the busy column, ticks, and
// the fixed fail words. No database, no network, no `server-only` import. The
// push steps that use them are in calendarSyncPlan.ts (split out in mission 60
// so the pull has room).

/** A linked calendar as the plan needs it. */
export type PlanCalendar = {
  /** The LinkedCalendar row id, not Google's calendar id. */
  id: string;
  googleCalendarId: string;
  accountId: string;
  direction: SyncDirection;
  /** Google's role for this calendar; null means unknown (linked before PR 2). */
  accessRole: string | null;
};

/** An existing CalendarEventSync row. */
export type PlanRow = {
  linkedCalendarId: string;
  googleEventId: string;
  etag: string | null;
  /** "removing" is an untick whose Google delete failed. */
  status: SyncRowStatus;
};

/** Only a calendar set to sync that Google lets Marshee write to. Unknown (null) is allowed. */
export function isPushable(calendar: { direction: SyncDirection; accessRole: string | null }): boolean {
  return calendar.direction !== "off" && !isReadOnlyRole(calendar.accessRole);
}

/** Whether a calendar starts ticked on a new event: the viewer's own "Both ways" ones. */
export function startsTicked(calendar: { direction: SyncDirection; isMine: boolean }): boolean {
  return calendar.isMine && calendar.direction === "twoWay";
}

/** A client list of calendar ids, or undefined when it is absent or not a list of strings. */
export function cleanRequestedIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((id): id is string => typeof id === "string");
}

/**
 * The `showBusyOnGoogle` column to write: only an all-day event stores it
 * (a timed event is always busy, so it is reset to false); undefined on an
 * all-day event leaves the column alone.
 */
export function busyColumn(allDay: boolean, showBusy: boolean | undefined): { showBusyOnGoogle?: boolean } {
  if (!allDay) return { showBusyOnGoogle: false };
  return showBusy === undefined ? {} : { showBusyOnGoogle: showBusy === true };
}

/** Why a token refresh failed, as a sync fail word: a revoked grant needs a reconnect, anything else is the network. */
export function tokenFailReason(refreshReason: string): "reconnect" | "network" {
  return refreshReason === "revoked" ? "reconnect" : "network";
}

/** People's display names in a stable order (name, then id), for the "For:" line. */
export function sortedPersonNames(people: { id: string; displayName: string }[]): string[] {
  return [...people]
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
    .map((person) => person.displayName);
}

export type SyncPlan = { create: string[]; update: string[]; remove: string[] };

/**
 * What to do, as LinkedCalendar ids. `requestedIds` undefined means "leave the
 * calendars alone": existing copies are updated, none added or removed. Every
 * requested id is checked against `calendars` here, so a tampered id for an
 * unknown, "off" or read-only calendar is ignored. A copy on a calendar that
 * is no longer pushable is left alone (decision 8). The event's source
 * calendar (where a pulled event came from) is always desired while it is
 * pushable: it cannot be unticked, since that would delete the original.
 */
export function planSync(input: {
  rows: PlanRow[];
  calendars: PlanCalendar[];
  requestedIds?: string[];
  sourceLinkedCalendarId?: string | null;
  /** A calendar to leave alone entirely: no create, update or remove (a pull's push out skips the source). */
  exceptLinkedCalendarId?: string | null;
}): SyncPlan {
  const pushable = new Set(input.calendars.filter(isPushable).map((c) => c.id));
  const existing = new Set(input.rows.map((r) => r.linkedCalendarId));
  const desired = new Set<string>();
  if (input.requestedIds === undefined) {
    for (const row of input.rows) {
      if (row.status !== "removing" && pushable.has(row.linkedCalendarId)) desired.add(row.linkedCalendarId);
    }
  } else {
    for (const id of input.requestedIds) if (pushable.has(id)) desired.add(id);
  }
  const source = input.sourceLinkedCalendarId;
  if (source && pushable.has(source)) desired.add(source);
  const skip = input.exceptLinkedCalendarId;
  return {
    create: [...desired].filter((id) => !existing.has(id) && id !== skip),
    update: [...desired].filter((id) => existing.has(id) && id !== skip),
    remove: input.rows
      .map((r) => r.linkedCalendarId)
      .filter((id) => pushable.has(id) && !desired.has(id) && id !== skip),
  };
}

/**
 * Whether a calendar may be set to anything but "off" (Bryce, 2026-11-09, answer
 * 7): only when no other link of the same Google calendar is on. Two links to one
 * Google calendar would let Marshee delete or overwrite the real event.
 * `others` is the other links of this Google calendar, not this one.
 */
export function canTurnOn(others: { direction: SyncDirection }[]): boolean {
  return others.every((other) => other.direction === "off");
}

/** A sync row of the calendar being turned on, as the handover needs it. */
export type HandoverTargetRow = { id: string; eventId: string };

/**
 * A sync row of an off sibling link. `sourceIsSibling` is true when the
 * event's source calendar (`sourceLinkedCalendarId`) is one of the siblings,
 * so this row points at the original Google event.
 */
export type HandoverRow = { id: string; eventId: string; sourceIsSibling: boolean };

/**
 * A handover (Bryce, 2026-11-09, answer 9): a calendar is turned on while
 * another link of the same Google calendar, now off, holds its pulled state.
 * Says which sync rows move to the new calendar and which are dropped. Rows
 * are moved, never copied. An event with a row on both sides keeps the target
 * row, unless the event was pulled from a sibling: then the sibling row is the
 * original and the target row is a "Marshee to Google" twin, so the first such
 * sibling row moves and the target row is dropped. Of two sibling rows for one
 * event, the first moves. `drop` can hold target row ids as well as sibling
 * ones. All lists hold sync row ids and keep the input order.
 */
export function planHandover(
  targetRows: HandoverTargetRow[],
  siblingRows: HandoverRow[],
): { move: string[]; drop: string[] } {
  const targetEvents = new Set(targetRows.map((row) => row.eventId));
  // Events whose target row is a twin, with the sibling row that replaces it.
  const originals = new Map<string, string>();
  for (const row of siblingRows) {
    if (row.sourceIsSibling && targetEvents.has(row.eventId) && !originals.has(row.eventId)) {
      originals.set(row.eventId, row.id);
    }
  }
  const taken = new Set(targetEvents);
  const move: string[] = [];
  const drop: string[] = targetRows.filter((row) => originals.has(row.eventId)).map((row) => row.id);
  for (const row of siblingRows) {
    const original = originals.get(row.eventId);
    if (original !== undefined) {
      (original === row.id ? move : drop).push(row.id);
    } else if (taken.has(row.eventId)) {
      drop.push(row.id);
    } else {
      taken.add(row.eventId);
      move.push(row.id);
    }
  }
  return { move, drop };
}

/**
 * After a calendar was turned on, the other on link that got there first, if
 * any (the older `turnedOnAt`; the lower id breaks a tie). A null stamp counts
 * as earlier than any stamp: a link turned on before the column existed was on
 * first. Two people tapping at once can both pass `canTurnOn`; the one this
 * returns for keeps the calendar and the other turns itself back off.
 */
export function raceWinner<T extends { id: string; direction: SyncDirection; turnedOnAt: Date | null }>(
  mine: { id: string; turnedOnAt: Date | null },
  others: T[],
): T | null {
  const stamp = (at: Date | null) => (at === null ? Number.NEGATIVE_INFINITY : at.getTime());
  // Compared as a sign so two nulls (-Infinity minus -Infinity) are a tie, not NaN.
  const order = (a: Date | null, b: Date | null) => (stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0);
  const earlier = others
    .filter((other) => other.direction !== "off")
    .filter((other) => {
      const diff = order(other.turnedOnAt, mine.turnedOnAt);
      return diff < 0 || (diff === 0 && other.id.localeCompare(mine.id) < 0);
    })
    .sort((a, b) => order(a.turnedOnAt, b.turnedOnAt) || a.id.localeCompare(b.id));
  return earlier[0] ?? null;
}
