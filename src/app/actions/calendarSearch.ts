"use server";

// The Calendar search (mission-75/C2). Read-only, so like `fetchCalendarEvents`
// it answers a refusal with `null` (a thrown redirect() would bounce the
// browser mid-typing). Everyone who can see the Calendar may search, so the
// gate is a signed-in session, not a role. The rules are pure, in
// lib/calendarSearch.ts; this file reads the slim rows, arranges, then loads
// full views for the chosen ids through the two query modules' one select each.

import { getVerifiedUser } from "@/lib/dal";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { getCalendarEventsByIds, getEventSearchRows } from "@/lib/calendarEventQuery";
import { getTaskSearchRows, getTasksByIds } from "@/lib/calendarTaskQuery";
import {
  arrangeSearch,
  MAX_SEARCH_TEXT_LENGTH,
  type CalendarSearchResult,
  type SearchDayIds,
  type SearchResultDay,
} from "@/lib/calendarSearch";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

function fillDays(
  days: SearchDayIds[],
  events: Map<string, CalendarEventView>,
  tasks: Map<string, CalendarTaskView>,
): SearchResultDay[] {
  return days.map((entry) => ({
    day: entry.day,
    events: entry.eventIds.flatMap((id) => events.get(id) ?? []),
    tasks: entry.taskIds.flatMap((id) => tasks.get(id) ?? []),
  }));
}

/**
 * Events (title, location, notes) and tasks (title, details) matching `text`,
 * upcoming nearest first then past newest first, grouped by day (`YYYY-MM-DD`,
 * household zone for timed events). `null` means refused: signed out, or the
 * input is not a string up to 200 characters with whole-number limits. Fewer
 * than 2 letters is a real empty answer. No filter beyond the Calendar's own.
 */
export async function searchCalendar(input: {
  text: string;
  upcomingLimit: number;
  pastLimit: number;
}): Promise<CalendarSearchResult | null> {
  const user = await getVerifiedUser();
  if (!user) return null;

  // A public POST endpoint: the types above are a claim to verify.
  if (typeof input !== "object" || input === null) return null;
  const { text, upcomingLimit, pastLimit } = input;
  if (typeof text !== "string" || text.length > MAX_SEARCH_TEXT_LENGTH) return null;
  if (!Number.isInteger(upcomingLimit) || !Number.isInteger(pastLimit)) return null;

  const [eventRows, taskRows] = await Promise.all([getEventSearchRows(), getTaskSearchRows()]);
  const arranged = arrangeSearch({
    text,
    events: eventRows,
    tasks: taskRows,
    now: new Date(),
    zone: HOUSEHOLD_TIME_ZONE,
    upcomingLimit,
    pastLimit,
  });

  const sides = [...arranged.upcoming, ...arranged.past];
  const [eventViews, taskViews] = await Promise.all([
    getCalendarEventsByIds(
      sides.flatMap((day) => day.eventIds),
      user.userId,
    ),
    getTasksByIds(
      sides.flatMap((day) => day.taskIds),
      user.userId,
    ),
  ]);
  const events = new Map(eventViews.map((event) => [event.id, event]));
  const tasks = new Map(taskViews.map((task) => [task.id, task]));

  return {
    upcoming: fillDays(arranged.upcoming, events, tasks),
    past: fillDays(arranged.past, events, tasks),
    repeatingEventIds: arranged.repeatingEventIds,
    hasMoreUpcoming: arranged.hasMoreUpcoming,
    hasMorePast: arranged.hasMorePast,
  };
}
