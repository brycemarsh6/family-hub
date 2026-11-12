"use client";

// The Calendar filter, remembered per login per device (mission 78): a UI
// convenience, not data about the family, so localStorage with no round trip.
// Same shape as lastCalendarView.ts (read its comments for the why): a
// useSyncExternalStore read, plus a same-tab signal because the browser's
// "storage" event fires only for OTHER tabs.

import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_CALENDAR_FILTER, parseStoredFilter, type CalendarFilter } from "./calendarFilter";

const FILTER_CHANGED = "marshee:calendar-filter-changed";

function storageKey(viewerId: string | null): string {
  return `marshee:calendar-filter:${viewerId ?? "device"}`;
}

// getSnapshot must return the SAME object while nothing changed, or React
// loops; parsing makes a new object each call, so cache by the raw string.
let cachedRaw: string | null = null;
let cachedFilter: CalendarFilter = EMPTY_CALENDAR_FILTER;

function readFilter(viewerId: string | null): CalendarFilter {
  if (typeof window === "undefined") return EMPTY_CALENDAR_FILTER;
  const raw = window.localStorage.getItem(storageKey(viewerId));
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedFilter = parseStoredFilter(raw);
  }
  return cachedFilter;
}

function writeFilter(viewerId: string | null, filter: CalendarFilter): void {
  if (typeof window === "undefined") return;
  const empty = filter.hiddenPeople.length === 0 && filter.hiddenCalendars.length === 0;
  if (empty) window.localStorage.removeItem(storageKey(viewerId));
  else window.localStorage.setItem(storageKey(viewerId), JSON.stringify(filter));
  window.dispatchEvent(new Event(FILTER_CHANGED));
}

function subscribe(callback: () => void) {
  window.addEventListener(FILTER_CHANGED, callback);
  return () => window.removeEventListener(FILTER_CHANGED, callback);
}

/** The filter for this login on this device, and its setter. The server render is the empty filter. */
export function useCalendarFilter(viewerId: string | null): [CalendarFilter, (next: CalendarFilter) => void] {
  const filter = useSyncExternalStore(
    subscribe,
    () => readFilter(viewerId),
    () => EMPTY_CALENDAR_FILTER,
  );
  const setFilter = useCallback((next: CalendarFilter) => writeFilter(viewerId, next), [viewerId]);
  return [filter, setFilter];
}
