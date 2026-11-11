"use server";

// "All of them" for a dragged repeating event (mission 71, C2). The one
// exception to the calendar's one write path (moveCalendarEvent plus
// afterEventSaved): this changes the Google series parent once and lets the
// pull bring Marshee in line, so it never calls afterEventSaved or
// pushEventCopies. The steps are in lib/calendarSeriesMove.ts; this file is
// the guard and the real database and Google bindings.
// Same guard form as moveCalendarEvent: null-returning, never requireRole().

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { HOUSEHOLD_TIME_ZONE, MANAGER_ROLES } from "@/lib/constants";
import { parseMoveStart } from "@/lib/calendarMoveRules";
import { moveSeries, type SeriesMoveDeps, type SeriesMoveResult } from "@/lib/calendarSeriesMove";
import { deletePulledEvent, getAccountAccessToken, pullCalendars } from "@/lib/calendarEventPull";
import { loadSeriesCalendar } from "@/lib/linkedCalendarsRead";
import { getGoogleEvent, listGoogleInstances, updateGoogleEvent } from "@/lib/google/calendarApi";

const realDeps: SeriesMoveDeps = {
  now: () => new Date(),
  async loadEvent(eventId) {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { startAt: true, endAt: true, allDay: true, sourceLinkedCalendarId: true },
    });
    if (!event) return null;
    const sync = event.sourceLinkedCalendarId
      ? await db.calendarEventSync.findUnique({
          where: { eventId_linkedCalendarId: { eventId, linkedCalendarId: event.sourceLinkedCalendarId } },
          select: { googleSeriesId: true },
        })
      : null;
    return { ...event, googleSeriesId: sync?.googleSeriesId ?? null };
  },
  loadCalendar: loadSeriesCalendar,
  getAccessToken: getAccountAccessToken,
  getEvent: getGoogleEvent,
  updateEvent: updateGoogleEvent,
  listInstances: listGoogleInstances,
  async pullCalendar(calendarId) {
    const { failed } = await pullCalendars({ force: true, onlyCalendarId: calendarId, ignoreLease: true });
    return { failed };
  },
  async loadSeriesRows(calendarId, googleSeriesId, from, to) {
    const rows = await db.calendarEventSync.findMany({
      where: { linkedCalendarId: calendarId, googleSeriesId, event: { startAt: { gte: from, lt: to } } },
      select: { eventId: true, googleEventId: true, linkedCalendarId: true, googleSeriesId: true },
    });
    return rows;
  },
  deleteRow: deletePulledEvent,
  async findRowAt(calendarId, googleSeriesId, startAt) {
    const row = await db.calendarEventSync.findFirst({
      where: { linkedCalendarId: calendarId, googleSeriesId, event: { startAt } },
      select: { eventId: true },
    });
    return row?.eventId ?? null;
  },
};

/**
 * Drag a repeating event's day and choose "All of them": every day of the
 * series moves by the same wall-clock minutes. Only the new start crosses the
 * wire; the server works out the minutes from the stored row. The answer's
 * `undo` names the dragged day's row after the pull (Google may have given it
 * a new id) and the original start; Undo is this same call with those.
 */
export async function moveCalendarSeries(eventId: string, newStartIso: string): Promise<SeriesMoveResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const newStart = parseMoveStart(newStartIso);
  if (typeof eventId !== "string" || !newStart) return { error: "That's not a valid time." };

  const result = await moveSeries(realDeps, eventId, newStart, HOUSEHOLD_TIME_ZONE);
  revalidatePath("/calendar");
  return result;
}
