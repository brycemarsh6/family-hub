// The Calendar search's rules (mission-75/C2), pure: no `db`, no
// `server-only`, "now" and the zone arrive as parameters. The action in
// actions/calendarSearch.ts reads the slim rows, calls `arrangeSearch`, then
// loads full views for the chosen ids.
//
// Matching: every typed word must be the START of some word in the item's
// text fields ("pia" finds "Piano"). The matcher is lenient on purpose (more
// results are visible, a miss is not): each side is tried as written and in
// singular form, so "movie" finds "Movies" and "cookies" finds "Cookie". The
// page's highlight uses the same rule (`matchedPrefixLength`), so what is
// marked is what matched. Fewer than two letters in all returns nothing.
//
// Days are `YYYY-MM-DD` strings, never Dates, so they mean the same thing on
// the server and in any browser. A timed event's day is its start day in the
// household zone; an all-day event's and a task's are their UTC-midnight
// instant's own date (calendarDates.ts's all-day convention).
// householdDate.ts keeps every answer the same whatever the process's TZ is.

import { rawTokens, tokens } from "./match";
import { calendarDateInZone, type CalendarDate } from "./householdDate";
import { compareEvents } from "./scheduleWindow";
import type { CalendarEventView, CalendarTaskView } from "./types";

export const DEFAULT_SEARCH_LIMIT = 25;
export const MAX_SEARCH_LIMIT = 500;
export const MAX_SEARCH_TEXT_LENGTH = 200;

export type SearchEventRow = {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  seriesId: string | null;
};

export type SearchTaskRow = {
  id: string;
  title: string;
  details: string | null;
  dueDate: Date;
};

export type SearchDayIds = { day: string; eventIds: string[]; taskIds: string[] };

export type SearchArrangement = {
  upcoming: SearchDayIds[];
  past: SearchDayIds[];
  /** Ids of events that stand for a repeating series. */
  repeatingEventIds: string[];
  hasMoreUpcoming: boolean;
  hasMorePast: boolean;
};

/** One day of results, as the search action hands it to the page. */
export type SearchResultDay = { day: string; events: CalendarEventView[]; tasks: CalendarTaskView[] };

/** What `searchCalendar` returns on success (null means refused). */
export type CalendarSearchResult = {
  upcoming: SearchResultDay[];
  past: SearchResultDay[];
  repeatingEventIds: string[];
  hasMoreUpcoming: boolean;
  hasMorePast: boolean;
};

// Accents come off ("Café" gives "Cafe", "Zoë" gives "Zoe") so "cafe" finds "Café".
// A precomposed letter keeps its length, so the highlight still lines up.
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

/** The query's words as written (lowercased), or null when it holds fewer than two letters or digits in all. */
export function searchWords(text: string): string[] | null {
  const words = rawTokens(fold(text));
  const total = words.reduce((sum, word) => sum + word.length, 0);
  return total >= 2 ? words : null;
}

// A word as written, in singular form, and without a bare trailing "s" ("cookies" gives "cookie").
function forms(word: string): string[] {
  const singular = tokens(word)[0] ?? word;
  const unplural = word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
  return [...new Set([word, singular, unplural])];
}

function commonPrefixLength(a: string, b: string): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) length += 1;
  return length;
}

/**
 * How many leading characters of `word` (a word of the item's text, as
 * written) one of the typed `words` marks; 0 when none of them is the start of
 * it. Both sides are compared as written and in singular form. The length
 * counts the letters the typed word and the written word share ("berry"
 * against "Berries" marks "Berr").
 */
export function matchedPrefixLength(word: string, typedWords: string[]): number {
  const written = rawTokens(fold(word))[0] ?? "";
  if (written === "") return 0;
  let best = 0;
  for (const typed of typedWords) {
    for (const typedForm of forms(typed)) {
      for (const writtenForm of forms(written)) {
        if (!writtenForm.startsWith(typedForm)) continue;
        best = Math.max(best, commonPrefixLength(typedForm, written), 1);
      }
    }
  }
  return Math.min(best, word.length);
}

/** Every query word is the start of some word in the fields. */
export function matchesSearch(words: string[], fields: (string | null)[]): boolean {
  const haystack = rawTokens(fold(fields.filter((field): field is string => field !== null).join(" ")));
  return words.every((word) => haystack.some((candidate) => matchedPrefixLength(candidate, [word]) > 0));
}

/** A caller's limit made safe: a whole number from 1 to 500. */
export function clampLimit(value: number): number {
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(value)));
}

function dayKey(date: CalendarDate): string {
  const pad = (n: number, width: number) => String(n).padStart(width, "0");
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

function utcDayKey(instant: Date): string {
  return dayKey({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  });
}

function eventDayKey(event: SearchEventRow, zone: string): string {
  return event.allDay ? utcDayKey(event.startAt) : dayKey(calendarDateInZone(event.startAt, zone));
}

/** In progress or ahead. An all-day event's end is an exclusive UTC-midnight date, so it is compared by day. */
function eventIsUpcoming(event: SearchEventRow, now: Date, todayKey: string): boolean {
  if (event.allDay) return utcDayKey(event.endAt) > todayKey;
  return event.endAt.getTime() > now.getTime();
}

/** One row per series: the earliest upcoming, else the latest past. */
function collapseSeries(
  events: SearchEventRow[],
  isUpcoming: (event: SearchEventRow) => boolean,
): { events: SearchEventRow[]; repeatingIds: string[] } {
  const bySeries = new Map<string, SearchEventRow[]>();
  const kept: SearchEventRow[] = [];
  const repeatingIds: string[] = [];
  for (const event of events) {
    if (event.seriesId === null) {
      kept.push(event);
      continue;
    }
    const group = bySeries.get(event.seriesId);
    if (group) group.push(event);
    else bySeries.set(event.seriesId, [event]);
  }
  for (const group of bySeries.values()) {
    const sorted = [...group].sort(compareEvents);
    const upcoming = sorted.filter(isUpcoming);
    const chosen = upcoming.length > 0 ? upcoming[0] : sorted[sorted.length - 1];
    kept.push(chosen);
    repeatingIds.push(chosen.id);
  }
  return { events: kept, repeatingIds };
}

type Entry =
  | { kind: "event"; day: string; event: SearchEventRow }
  | { kind: "task"; day: string; task: SearchTaskRow };

// Within a day: events in Schedule's order (compareEvents), then tasks by id.
function compareWithinDay(a: Entry, b: Entry): number {
  if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;
  if (a.kind === "event" && b.kind === "event") return compareEvents(a.event, b.event);
  if (a.kind === "task" && b.kind === "task") return a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0;
  return 0;
}

function groupByDay(entries: Entry[]): SearchDayIds[] {
  const days: SearchDayIds[] = [];
  for (const entry of entries) {
    let last = days[days.length - 1];
    if (!last || last.day !== entry.day) {
      last = { day: entry.day, eventIds: [], taskIds: [] };
      days.push(last);
    }
    if (entry.kind === "event") last.eventIds.push(entry.event.id);
    else last.taskIds.push(entry.task.id);
  }
  return days;
}

/**
 * Matches, collapses repeats, splits upcoming from past, orders (upcoming
 * nearest day first, past newest day first), caps each side by item count
 * and groups by day. Returns ids only; the caller loads the full views.
 * Non-array or odd input is the caller's job to refuse.
 */
export function arrangeSearch(input: {
  text: string;
  events: SearchEventRow[];
  tasks: SearchTaskRow[];
  now: Date;
  zone: string;
  upcomingLimit?: number;
  pastLimit?: number;
}): SearchArrangement {
  const empty: SearchArrangement = {
    upcoming: [],
    past: [],
    repeatingEventIds: [],
    hasMoreUpcoming: false,
    hasMorePast: false,
  };
  const words = searchWords(input.text);
  if (words === null) return empty;

  const upcomingLimit = clampLimit(input.upcomingLimit ?? DEFAULT_SEARCH_LIMIT);
  const pastLimit = clampLimit(input.pastLimit ?? DEFAULT_SEARCH_LIMIT);
  const todayKey = dayKey(calendarDateInZone(input.now, input.zone));

  const matchedEvents = input.events.filter((event) =>
    matchesSearch(words, [event.title, event.location, event.notes]),
  );
  const matchedTasks = input.tasks.filter((task) => matchesSearch(words, [task.title, task.details]));

  const collapsed = collapseSeries(matchedEvents, (event) => eventIsUpcoming(event, input.now, todayKey));

  const upcoming: Entry[] = [];
  const past: Entry[] = [];
  for (const event of collapsed.events) {
    const entry: Entry = { kind: "event", day: eventDayKey(event, input.zone), event };
    (eventIsUpcoming(event, input.now, todayKey) ? upcoming : past).push(entry);
  }
  for (const task of matchedTasks) {
    const entry: Entry = { kind: "task", day: utcDayKey(task.dueDate), task };
    (entry.day >= todayKey ? upcoming : past).push(entry);
  }

  upcoming.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : compareWithinDay(a, b)));
  past.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : compareWithinDay(a, b)));

  const shownUpcoming = upcoming.slice(0, upcomingLimit);
  const shownPast = past.slice(0, pastLimit);
  const shownEventIds = new Set(
    [...shownUpcoming, ...shownPast].flatMap((entry) => (entry.kind === "event" ? [entry.event.id] : [])),
  );

  return {
    upcoming: groupByDay(shownUpcoming),
    past: groupByDay(shownPast),
    repeatingEventIds: collapsed.repeatingIds.filter((id) => shownEventIds.has(id)),
    hasMoreUpcoming: upcoming.length > upcomingLimit,
    hasMorePast: past.length > pastLimit,
  };
}
