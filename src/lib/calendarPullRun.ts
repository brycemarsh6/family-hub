import type { GoogleEventIn, ListEventsMode, ListEventsResult } from "@/lib/google/types";
import {
  planPull,
  type PullDelete,
  type PullInsert,
  type PullKnown,
  type PullUpdate,
} from "@/lib/calendarSyncPull";

// The steps of a pull, in order, with every database and Google call
// injected (mission 60, C4b). Pure: tests run it with fakes. The real
// bindings are in calendarEventPull.ts. Nothing here touches, logs or
// returns an access token or a sync token beyond handing them to the deps.

/** How far back the first pull reaches (Bryce, 2026-11-09). */
export const PULL_WINDOW_DAYS = 30;
/**
 * How far ahead a full pull reaches (Bryce, 2026-11-09). Without an end,
 * Google expands every forever-repeating event into instances and the list
 * overflows the page cap. The daily cron pulls in full again (`rewindow`),
 * so this horizon moves forward a day each day.
 */
export const PULL_HORIZON_DAYS = 365;
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
  /** Orders calendars that share a Google calendar: the oldest link is the one pulled. */
  createdAt: Date;
};

export type PullAccessResult = { ok: true; accessToken: string } | { ok: false; reason: "reconnect" | "network" };

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
  /** Stamps "Last checked" after a clean pull that returned no token; the saved token is left alone. */
  markPulledOk: (calendarId: string) => Promise<void>;
  loadKnown: (calendar: { id: string; googleCalendarId: string }, events: GoogleEventIn[]) => Promise<PullKnown>;
  /** Each write is one transaction (event, person, sync row). */
  writeInsert: (insert: PullInsert) => Promise<void>;
  writeUpdate: (calendarId: string, update: PullUpdate) => Promise<void>;
  /** Takes the event's copies off other calendars, then deletes the event. */
  writeDelete: (del: PullDelete) => Promise<void>;
  /** Push the event's Marshee version out; `exceptLinkedCalendarId` is a copy to leave alone. */
  pushBack: (eventId: string, exceptLinkedCalendarId?: string | null) => Promise<void>;
  now: () => Date;
  /**
   * Hears a short reason word for each failure (for the server log). Only
   * fixed words, an HTTP status or a Prisma error code: never a token, an
   * error message or anything from an event.
   */
  noteFailure?: (reason: string) => void;
};

/** A Prisma error code ("P2002") when the error carries one; never its message. */
function writeFailReason(error: unknown): string {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? `write:${code}` : "write:error";
}

/** `checked` counts the calendars this run claimed and tried (a failed one too); a skipped one is not counted. */
export type PullRunResult = { changed: boolean; failed: number; checked: number };

/** Writes one list's events into Marshee, then moves the bookmark if every write worked. */
async function applyListed(
  deps: PullRunDeps,
  calendar: PullCalendarRow,
  listed: Extract<ListEventsResult, { ok: true }>,
  now: Date,
  windowStart: Date,
): Promise<Omit<PullRunResult, "checked">> {
  const known = await deps.loadKnown(calendar, listed.events);
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
    } catch (error) {
      // Deliberately drops the message: it could quote a value from Google.
      deps.noteFailure?.(writeFailReason(error));
      failed += 1;
    }
  };
  const pushOuts: string[] = [];
  for (const insert of plan.inserts) await attempt(() => deps.writeInsert(insert), true);
  for (const update of plan.updates) {
    const before = failed;
    await attempt(() => deps.writeUpdate(calendar.id, update), update.changed);
    // Only a change that was saved goes out: a failed write would push the old version over Google's.
    if (update.pushOut && failed === before) pushOuts.push(update.eventId);
  }
  for (const del of plan.deletes) await attempt(() => deps.writeDelete(del), true);
  // A push back keeps the source (Marshee won). A push out carries Google's own version, so
  // the calendar it came from is left alone: its original is never patched with our fields.
  for (const eventId of plan.pushBacks) await attempt(() => deps.pushBack(eventId), false);
  for (const eventId of pushOuts) await attempt(() => deps.pushBack(eventId, calendar.id), false);

  // The bookmark moves only when every event of the run is written, and never to nothing.
  if (failed === 0) {
    try {
      if (listed.nextSyncToken !== null) await deps.saveSyncToken(calendar.id, listed.nextSyncToken);
      // No bookmark came back, but the pull worked: "Last checked" still moves, the token stays as it is.
      else await deps.markPulledOk(calendar.id);
    } catch (error) {
      deps.noteFailure?.(writeFailReason(error).replace("write", "save-token"));
      failed += 1;
    }
  }
  return { changed, failed };
}

async function pullOne(
  deps: PullRunDeps,
  calendar: PullCalendarRow,
  accessToken: string,
  now: Date,
  rewindow: boolean,
): Promise<Omit<PullRunResult, "checked">> {
  const windowStart = new Date(now.getTime() - PULL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + PULL_HORIZON_DAYS * 24 * 60 * 60 * 1000);

  // A calendar with a token is read by token first, even on a rewindow run: the token holds
  // the changes since last time, including events moved or cancelled outside the window,
  // which a window pull would never see. Dropping it unread would lose those for good.
  let tokenPass: Omit<PullRunResult, "checked"> | null = null;
  if (calendar.syncToken) {
    const listed = await deps.list(accessToken, calendar.googleCalendarId, { syncToken: calendar.syncToken });
    if (!listed.ok && listed.reason === "restart") {
      // The token is no good: drop it and pull in full, in this same run.
      await deps.saveSyncToken(calendar.id, null);
    } else if (!listed.ok) {
      deps.noteFailure?.(`list:${listed.reason}${listed.status ? `:${listed.status}` : ""}`);
      return { changed: false, failed: 1 };
    } else {
      tokenPass = await applyListed(deps, calendar, listed, now, windowStart);
      // Only a rewindow run goes on to a full pass, and only after a clean token pass.
      if (!rewindow || tokenPass.failed > 0) return tokenPass;
    }
  }

  const listed = await deps.list(accessToken, calendar.googleCalendarId, {
    timeMin: windowStart.toISOString(),
    timeMax: windowEnd.toISOString(),
  });
  if (!listed.ok) {
    deps.noteFailure?.(`list:${listed.reason}${listed.status ? `:${listed.status}` : ""}`);
    return { changed: tokenPass?.changed ?? false, failed: 1 };
  }
  const full = await applyListed(deps, calendar, listed, now, windowStart);
  return { changed: (tokenPass?.changed ?? false) || full.changed, failed: full.failed };
}

/** Pulls every "Both ways" calendar that is due. Never throws; touches nothing when Google is not set up. */
export async function runPull(deps: PullRunDeps, opts: { force: boolean; rewindow?: boolean }): Promise<PullRunResult> {
  const total: PullRunResult = { changed: false, failed: 0, checked: 0 };
  if (!deps.isConfigured()) return total;
  try {
    const now = deps.now();
    const staleBefore = new Date(now.getTime() - (opts.force ? PULL_FORCE_LEASE_MS : PULL_LEASE_MS));
    // One Google calendar linked twice is pulled once: the oldest link, then the lowest id.
    const byAge = [...(await deps.loadCalendars())].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
    );
    const seenGoogle = new Set<string>();
    const calendars = byAge.filter((c) => {
      if (seenGoogle.has(c.googleCalendarId)) return false;
      seenGoogle.add(c.googleCalendarId);
      return true;
    });
    // One access token per account per run, even when it fails.
    const access = new Map<string, PullAccessResult>();
    for (const calendar of calendars) {
      try {
        if (!(await deps.claim(calendar.id, staleBefore, now))) continue;
        total.checked += 1;
        let token = access.get(calendar.accountId);
        if (!token) {
          token = await deps.getAccessToken(calendar.accountId);
          access.set(calendar.accountId, token);
          if (!token.ok && token.reason === "reconnect") await deps.markNeedsRelink(calendar.accountId);
        }
        if (!token.ok) {
          deps.noteFailure?.(`token:${token.reason}`);
          total.failed += 1;
          continue;
        }
        const result = await pullOne(deps, calendar, token.accessToken, now, opts.rewindow === true);
        total.changed = total.changed || result.changed;
        total.failed += result.failed;
      } catch (error) {
        deps.noteFailure?.(writeFailReason(error).replace("write", "calendar"));
        total.failed += 1;
      }
    }
  } catch (error) {
    deps.noteFailure?.(writeFailReason(error).replace("write", "run"));
    total.failed += 1;
  }
  return total;
}
