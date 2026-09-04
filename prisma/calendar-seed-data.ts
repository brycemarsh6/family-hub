// The calendar test data shared by seed-calendar.ts and clean-calendar.ts —
// same split as prisma/recipe-seed-data.ts, so the cleanup script can know
// exactly which rows are test data without importing (and thereby running)
// the seeder.
//
// Every event title carries a "ZZZ Test" prefix; both scripts match on that
// exact string rather than touching the CalendarEvent table broadly, since
// a future session's real events live in this same table.
//
// This file used to also define three throwaway "ZZZ Test" User rows for
// the seeder to create and delete — removed per mission-8's Captain B1
// finding: a committed script may never create or delete `User` rows (see
// AGENTS.md's danger register). `displayName` carries no `@unique`
// constraint, so a name-matched delete can catch a row the seeder never
// created, including a same-named row that later gained a real login. The
// seeder now ATTACHES to whichever real people already exist in the
// database instead (see seed-calendar.ts) — this file only describes which
// of those found people (by index) each event is for.
//
// Dates are described here as offsets from "the seeder's own reference
// dates" (see seed-calendar.ts) rather than concrete Date objects, so this
// file stays pure data with no Date-construction opinions of its own.

export type SeedEventKind =
  | "singlePersonTimed"
  | "multiPerson"
  | "allDay"
  | "multiDay"
  | "dstWeek";

export type SeedEventTemplate = {
  kind: SeedEventKind;
  title: string;
  notes?: string;
  location?: string;
  allDay: boolean;
  /** Which day, relative to the template's own reference Sunday, this event
   * starts on (0 = that Sunday). */
  startDayOffset: number;
  /** How many calendar days this event spans, inclusive of the start day —
   * 1 for a same-day event, 3 for "starts Tuesday, ends Thursday". */
  spanDays: number;
  /** Local hour/minute for a timed event's start and end. Ignored for
   * all-day events, which the seeder builds as UTC-midnight instants of
   * the intended calendar date over `spanDays` (via calendarDates.ts's
   * localDayToAllDayInstant) — mission-13/CT1's fixed all-day convention,
   * the same one CalendarEvent.startAt/endAt's own schema comment now
   * describes. */
  startTime?: { hour: number; minute: number };
  endTime?: { hour: number; minute: number };
  /** Indices into whichever real, non-deactivated `User` rows
   * seed-calendar.ts found (0, 1, 2 — up to the first three, ordered by
   * `createdAt`). Not into a fixture this file owns — see this file's own
   * header for why it no longer defines any test people of its own. */
  people: number[];
};

export const CALENDAR_SEED_EVENTS: SeedEventTemplate[] = [
  {
    kind: "singlePersonTimed",
    title: "ZZZ Test Dentist Appointment",
    location: "Dr. Fields' office",
    allDay: false,
    startDayOffset: 2, // this week's Tuesday
    spanDays: 1,
    startTime: { hour: 9, minute: 0 },
    endTime: { hour: 10, minute: 0 },
    people: [0],
  },
  {
    kind: "multiPerson",
    title: "ZZZ Test Family Movie Night",
    notes: "Pick the movie by Wednesday.",
    allDay: false,
    startDayOffset: 5, // this week's Friday
    spanDays: 1,
    startTime: { hour: 19, minute: 0 },
    endTime: { hour: 21, minute: 30 },
    people: [0, 1, 2],
  },
  {
    kind: "allDay",
    title: "ZZZ Test School Picture Day",
    allDay: true,
    startDayOffset: 3, // this week's Wednesday
    spanDays: 1,
    people: [1],
  },
  {
    kind: "multiDay",
    title: "ZZZ Test Grandma's Visit",
    allDay: true,
    startDayOffset: 4, // this week's Thursday
    spanDays: 3, // Thu-Sat
    people: [0, 2],
  },
  {
    kind: "dstWeek",
    title: "ZZZ Test Daylight Saving Checkup",
    notes: "Seeded on the real 2026 US fall-back Sunday to prove the range query holds across it.",
    allDay: false,
    // The dstWeek reference date IS the Sunday itself (Nov 1, 2026), so 0
    // means "on that Sunday".
    startDayOffset: 0,
    spanDays: 1,
    startTime: { hour: 9, minute: 0 },
    endTime: { hour: 9, minute: 30 },
    people: [1],
  },
];
