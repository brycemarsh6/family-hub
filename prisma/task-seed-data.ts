// The task test data shared by seed-tasks.ts and clean-tasks.ts — same
// split as prisma/calendar-seed-data.ts, so the cleanup script can know
// exactly which rows are test data without importing (and thereby running)
// the seeder.
//
// Every title carries a "ZZZ Test" prefix; both scripts match on that exact
// string rather than touching the Task table broadly, since a future
// session's real tasks live in this same table.
//
// Due dates are described here as day offsets from "today" (the seeder's
// own reference date), rather than concrete Date objects, so this file
// stays pure data with no Date-construction opinions of its own. The
// seeder is responsible for turning an offset into a real due date via
// calendarDates.ts's localDayToAllDayInstant — mission-13/CT1's fixed
// all-day convention (UTC midnight, not local midnight) — never a bare
// `new Date(y, m, d)`.

export type SeedTaskTemplate = {
  title: string;
  details?: string;
  /** Days from "today" (the seeder's reference date) this task is due —
   * negative for overdue, 0 for today, positive for upcoming. */
  dueDayOffset: number;
  /** Whether this task is already completed when seeded — exercises the
   * completed/struck-through state without needing a click through the UI. */
  completed: boolean;
  /** Indices into whichever real, non-deactivated `User` rows
   * seed-tasks.ts found (0, 1, 2 — up to the first three, ordered by
   * `createdAt`). Not into a fixture this file owns — see this file's own
   * header for why it never defines any test people of its own. */
  people: number[];
};

export const TASK_SEED_TEMPLATES: SeedTaskTemplate[] = [
  {
    title: "ZZZ Test Take out the trash",
    dueDayOffset: -2,
    completed: false,
    people: [0],
  },
  {
    title: "ZZZ Test Pack swim bag",
    details: "Towel, goggles, sunscreen.",
    dueDayOffset: 0,
    completed: false,
    people: [1, 2],
  },
  {
    title: "ZZZ Test Return library books",
    dueDayOffset: 3,
    completed: false,
    people: [0],
  },
  {
    title: "ZZZ Test Sign permission slip",
    dueDayOffset: 10,
    completed: false,
    people: [1],
  },
  {
    title: "ZZZ Test Water the plants",
    dueDayOffset: -1,
    completed: true,
    people: [0, 1],
  },
];
