// The task test data shared by seed-tasks.ts and clean-tasks.ts — same
// split as prisma/calendar-seed-data.ts, so the cleanup script can know
// exactly which rows are test data without importing (and thereby running)
// the seeder.
//
// Every title carries a "ZZZ Test" prefix, but title alone is NOT the
// discriminator the scripts match on — mission-13/C6 found that a real
// household task titled identically to a seed template (a household
// member typing "ZZZ Test Pack swim bag" as a joke, say — implausible, but
// not the point) would be silently deleted by a title-only match, and the
// original version of this file's own scripts did exactly that when
// tested: `db:clean-tasks` deleted a task created through the real
// `createTask` action once its title matched a template, even though the
// file's own comment claimed it "refuses" to. TASK_SEED_SENTINEL is the
// second, independent factor that makes the "refuses to delete a real
// task" claim actually true: seed-tasks.ts appends it to every task's
// `details` field (even templates with no other details text), and both
// scripts match on title AND a `details` field containing the sentinel.
// A real task can share a seed title; it cannot also happen to carry this
// exact marker string in its details.
//
// Due dates are described here as day offsets from "today" (the seeder's
// own reference date), rather than concrete Date objects, so this file
// stays pure data with no Date-construction opinions of its own. The
// seeder is responsible for turning an offset into a real due date via
// calendarDates.ts's localDayToAllDayInstant — mission-13/CT1's fixed
// all-day convention (UTC midnight, not local midnight) — never a bare
// `new Date(y, m, d)`.

/** Appended to every seeded task's `details` field (see this file's own
 * header) — the second factor, alongside an exact title match, that both
 * seed-tasks.ts and clean-tasks.ts require before touching a row. */
export const TASK_SEED_SENTINEL = "[mission-13/CT1 seed data — do not edit]";

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
