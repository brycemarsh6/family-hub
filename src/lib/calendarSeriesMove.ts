import { planSeriesCleanup, planSeriesShift, shiftParentTimes, type SeriesRow } from "@/lib/calendarSeriesRules";
import { PULL_HORIZON_DAYS, PULL_WINDOW_DAYS } from "@/lib/calendarPullRun";
import type { PullDelete } from "@/lib/calendarSyncPull";
import type { EventCallResult, GetEventResult, GoogleTimesPatch, ListEventsResult } from "@/lib/google/types";

// The steps of "All of them" (mission 71, C2), with every database and Google
// call injected so tests run it with fakes. The real bindings are in
// actions/calendarSeries.ts and calendarEventPull.ts. The one Google write is
// the PATCH of the series parent; Marshee then catches up by pulling, never by
// pushing (no afterEventSaved, no pushEventCopies), so a drop is one write.
// Nothing here logs, returns or stores a token.

export type SeriesMoveResult = { error?: string; undo?: { eventId: string; startIso: string } };

export type SeriesMoveEvent = {
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  /** The series parent's id from the event's sync row on its source calendar; null when it does not repeat. */
  googleSeriesId: string | null;
  sourceLinkedCalendarId: string | null;
};

export type SeriesMoveCalendar = {
  id: string;
  googleCalendarId: string;
  accountId: string;
  direction: string;
  accountStatus: string;
};

export type SeriesMoveDeps = {
  now: () => Date;
  loadEvent: (eventId: string) => Promise<SeriesMoveEvent | null>;
  loadCalendar: (calendarId: string) => Promise<SeriesMoveCalendar | null>;
  getAccessToken: (accountId: string) => Promise<{ ok: true; accessToken: string } | { ok: false }>;
  getEvent: (accessToken: string, googleCalendarId: string, googleEventId: string) => Promise<GetEventResult>;
  updateEvent: (
    accessToken: string,
    googleCalendarId: string,
    googleEventId: string,
    patch: GoogleTimesPatch,
    ifMatch?: string,
  ) => Promise<EventCallResult>;
  listInstances: (
    accessToken: string,
    googleCalendarId: string,
    googleEventId: string,
    timeMin: string,
    timeMax: string,
  ) => Promise<ListEventsResult>;
  /** Pull that one linked calendar now (force lease). Never throws; `failed` is the count the pull reported. */
  pullCalendar: (calendarId: string) => Promise<{ failed: number }>;
  /** Marshee rows of the series on the calendar whose start is in [from, to). */
  loadSeriesRows: (calendarId: string, googleSeriesId: string, from: Date, to: Date) => Promise<SeriesRow[]>;
  /** The pull's own delete, the source calendar excepted: Marshee's row and its other copies go, Google is sent nothing for this calendar. */
  deleteRow: (del: PullDelete, calendarId: string) => Promise<void>;
  /** The id of the series row on the calendar that starts exactly then, if any. */
  findRowAt: (calendarId: string, googleSeriesId: string, startAt: Date) => Promise<string | null>;
};

const GOOGLE_FAILED = "Couldn't change Google Calendar. Nothing moved.";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function moveSeries(
  deps: SeriesMoveDeps,
  eventId: string,
  newStart: Date,
  timeZone: string,
): Promise<SeriesMoveResult> {
  const stored = await deps.loadEvent(eventId);
  if (!stored) return { error: "That event no longer exists." };
  const seriesId = stored.googleSeriesId;
  if (seriesId === null || stored.sourceLinkedCalendarId === null) return { error: "That event doesn't repeat." };

  const calendar = await deps.loadCalendar(stored.sourceLinkedCalendarId);
  if (!calendar || calendar.direction !== "twoWay" || calendar.accountStatus !== "ok") {
    return { error: "That calendar isn't syncing both ways any more." };
  }

  const shift = planSeriesShift(stored, newStart, timeZone);
  if ("error" in shift) return { error: shift.error };

  const access = await deps.getAccessToken(calendar.accountId);
  if (!access.ok) return { error: GOOGLE_FAILED };
  const token = access.accessToken;

  const parent = await deps.getEvent(token, calendar.googleCalendarId, seriesId);
  if (!parent.ok) return { error: GOOGLE_FAILED };
  const shifted = shiftParentTimes(parent.event as Parameters<typeof shiftParentTimes>[0], shift.minutes, timeZone);
  if ("error" in shifted) return { error: shifted.error };

  // The one Google write. If-Match its etag: someone else changing it first is a refusal, not an overwrite.
  const written = await deps.updateEvent(token, calendar.googleCalendarId, seriesId, shifted.patch, parent.etag ?? undefined);
  if (!written.ok) return { error: GOOGLE_FAILED };

  // Google is changed for good now, so what follows only makes Marshee match it.
  const pulled = await deps.pullCalendar(calendar.id);

  const now = deps.now();
  const from = new Date(now.getTime() - PULL_WINDOW_DAYS * DAY_MS);
  const to = new Date(now.getTime() + PULL_HORIZON_DAYS * DAY_MS);
  // A pull that failed part-way never reached every row, so cleaning up beside it would judge by half a picture.
  const listed =
    pulled.failed === 0
      ? await deps.listInstances(token, calendar.googleCalendarId, seriesId, from.toISOString(), to.toISOString())
      : null;
  // A list that failed says nothing about what is missing, so nothing is removed on it.
  if (listed?.ok) {
    const rows = await deps.loadSeriesRows(calendar.id, seriesId, from, to);
    const stale = planSeriesCleanup(
      rows,
      { linkedCalendarId: calendar.id, googleSeriesId: seriesId },
      listed.events.map((event) => event.id),
    );
    for (const del of stale) {
      try {
        await deps.deleteRow(del, calendar.id);
      } catch {
        // One stale row that won't go must not hide the others; the next pull sees it again.
      }
    }
  }

  const movedId = await deps.findRowAt(calendar.id, seriesId, newStart);
  return movedId === null ? {} : { undo: { eventId: movedId, startIso: stored.startAt.toISOString() } };
}
