// The calendar test data shared by seed-calendar.ts and clean-calendar.ts —
// same split as prisma/recipe-seed-data.ts, so the cleanup script can know
// exactly which rows are test data without importing (and thereby running)
// the seeder.
//
// Every event title AND every seeded person's displayName carries a
// "ZZZ Test" prefix. Both scripts match on these exact strings rather than
// touching the CalendarEvent or User tables broadly — CalendarEvent because
// a future session's real events will live in this same table, and User
// because it holds the household's actual accounts and must never have a
// blanket clean/reset script (see AGENTS.md's danger register).
//
// Dates are described here as offsets from "the seeder's own reference
// dates" (see seed-calendar.ts) rather than concrete Date objects, so this
// file stays pure data with no Date-construction opinions of its own.

import type { AvatarColor } from "../src/lib/constants";

export type SeedPerson = {
  displayName: string;
  avatarColor: AvatarColor;
};

// Three passwordless test profiles — enough to prove the "3+ people on one
// event" split-color case without touching any real household member.
export const CALENDAR_SEED_PEOPLE: SeedPerson[] = [
  { displayName: "ZZZ Test Alice", avatarColor: "blue" },
  { displayName: "ZZZ Test Ben", avatarColor: "green" },
  { displayName: "ZZZ Test Cleo", avatarColor: "amber" },
];

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
   * all-day events, which the seeder builds as local midnight-to-midnight
   * over `spanDays`, the same all-day convention CalendarEvent's own doc
   * comment describes. */
  startTime?: { hour: number; minute: number };
  endTime?: { hour: number; minute: number };
  /** Indices into CALENDAR_SEED_PEOPLE. */
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
