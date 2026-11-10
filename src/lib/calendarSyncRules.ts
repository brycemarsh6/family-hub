import { isReadOnlyRole, type SyncDirection, type SyncRowStatus } from "@/lib/calendarSyncVocabulary";

// The pure rules for copying a Marshee event to Google (mission 56, design
// decisions 3 to 8): which calendars take a copy, the busy column, ticks, and
// the fixed fail words. No database, no network, no `server-only` import. The
// push steps that use them are in calendarSyncPlan.ts (split out in mission 57
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
  return {
    create: [...desired].filter((id) => !existing.has(id)),
    update: [...desired].filter((id) => existing.has(id)),
    remove: input.rows
      .map((r) => r.linkedCalendarId)
      .filter((id) => pushable.has(id) && !desired.has(id)),
  };
}
