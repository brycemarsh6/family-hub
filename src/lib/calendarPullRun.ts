import type { GoogleEventIn, ListEventsMode, ListEventsResult } from "@/lib/google/types";
import {
  planPull,
  type PullDelete,
  type PullInsert,
  type PullKnown,
  type PullUpdate,
} from "@/lib/calendarSyncPull";

// The steps of a pull, in order, with every database and Google call
// injected (mission 58, C4b). Pure: tests run it with fakes. The real
// bindings are in calendarEventPull.ts. Nothing here touches, logs or
// returns an access token or a sync token beyond handing them to the deps.

/** How far back the first pull reaches (Bryce, 2026-11-09). */
export const PULL_WINDOW_DAYS = 30;
/** A calendar is pulled at most this often on page open... */
export const PULL_LEASE_MS = 5 * 60 * 1000;
/** ...and this often when a parent taps Refresh. */
export const PULL_FORCE_LEASE_MS = 30 * 1000;

export type PullCalendarRow = {
  id: string;
  googleCalendarId: string;
  accountId: string;
  /** The account's linker: the creator and one person of every event pulled in. */
  linkerId: string;
  syncToken: string | null;
};

export type PullAccessResult = { ok: true; accessToken: string } | { ok: false; reason: "revoked" | "network" };

export type PullRunDeps = {
  isConfigured: () => boolean;
  /** Only "Both ways" calendars of accounts whose status is "ok". */
  loadCalendars: () => Promise<PullCalendarRow[]>;
  /** One conditional update: true only for the caller that got the lease. */
  claim: (calendarId: string, staleBefore: Date, now: Date) => Promise<boolean>;
  getAccessToken: (accountId: string) => Promise<PullAccessResult>;
  markNeedsRelink: (accountId: string) => Promise<void>;
  list: (accessToken: string, googleCalendarId: string, mode: ListEventsMode) => Promise<ListEventsResult>;
  /** Saves the calendar's sync token; null clears it. */
  saveSyncToken: (calendarId: string, token: string | null) => Promise<void>;
  loadKnown: (calendarId: string, events: GoogleEventIn[]) => Promise<PullKnown>;
  /** Each write is one transaction (event, person, sync row). */
  writeInsert: (insert: PullInsert) => Promise<void>;
  writeUpdate: (calendarId: string, update: PullUpdate) => Promise<void>;
  /** Takes the event's copies off other calendars, then deletes the event. */
  writeDelete: (del: PullDelete) => Promise<void>;
  pushBack: (eventId: string) => Promise<void>;
  now: () => Date;
};

export type PullRunResult = { changed: boolean; failed: number };

async function pullOne(
  deps: PullRunDeps,
  calendar: PullCalendarRow,
  accessToken: string,
  now: Date,
): Promise<PullRunResult> {
  const windowStart = new Date(now.getTime() - PULL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let listed: ListEventsResult | null = null;
  if (calendar.syncToken) {
    listed = await deps.list(accessToken, calendar.googleCalendarId, { syncToken: calendar.syncToken });
    if (!listed.ok && listed.reason === "restart") {
      // The token is no good: drop it and pull in full, in this same run.
      await deps.saveSyncToken(calendar.id, null);
      listed = null;
    }
  }
  if (!listed) {
    listed = await deps.list(accessToken, calendar.googleCalendarId, { timeMin: windowStart.toISOString() });
  }
  if (!listed.ok) return { changed: false, failed: 1 };

  const known = await deps.loadKnown(calendar.id, listed.events);
  const plan = planPull({
    calendar: { id: calendar.id },
    linkerId: calendar.linkerId,
    windowStart,
    googleEvents: listed.events,
    known,
    now,
  });

  let changed = false;
  let failed = 0;
  // One event failing must not stop the others; any failure keeps the token unsaved.
  const attempt = async (write: () => Promise<void>, counts: boolean) => {
    try {
      await write();
      if (counts) changed = true;
    } catch {
      // Deliberately drops the error: it could quote a value from Google.
      failed += 1;
    }
  };
  for (const insert of plan.inserts) await attempt(() => deps.writeInsert(insert), true);
  for (const update of plan.updates) await attempt(() => deps.writeUpdate(calendar.id, update), update.changed);
  for (const del of plan.deletes) await attempt(() => deps.writeDelete(del), true);
  for (const eventId of plan.pushBacks) await attempt(() => deps.pushBack(eventId), false);

  // The bookmark moves only when every event of the run is written, and never to nothing.
  if (failed === 0 && listed.nextSyncToken !== null) {
    try {
      await deps.saveSyncToken(calendar.id, listed.nextSyncToken);
    } catch {
      failed += 1;
    }
  }
  return { changed, failed };
}

/** Pulls every "Both ways" calendar that is due. Never throws; touches nothing when Google is not set up. */
export async function runPull(deps: PullRunDeps, opts: { force: boolean }): Promise<PullRunResult> {
  const total: PullRunResult = { changed: false, failed: 0 };
  if (!deps.isConfigured()) return total;
  try {
    const now = deps.now();
    const staleBefore = new Date(now.getTime() - (opts.force ? PULL_FORCE_LEASE_MS : PULL_LEASE_MS));
    const calendars = await deps.loadCalendars();
    // One access token per account per run, even when it fails.
    const access = new Map<string, PullAccessResult>();
    for (const calendar of calendars) {
      try {
        if (!(await deps.claim(calendar.id, staleBefore, now))) continue;
        let token = access.get(calendar.accountId);
        if (!token) {
          token = await deps.getAccessToken(calendar.accountId);
          access.set(calendar.accountId, token);
          if (!token.ok && token.reason === "revoked") await deps.markNeedsRelink(calendar.accountId);
        }
        if (!token.ok) {
          total.failed += 1;
          continue;
        }
        const result = await pullOne(deps, calendar, token.accessToken, now);
        total.changed = total.changed || result.changed;
        total.failed += result.failed;
      } catch {
        total.failed += 1;
      }
    }
  } catch {
    total.failed += 1;
  }
  return total;
}
