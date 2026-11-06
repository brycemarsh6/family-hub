import { addHoursMinutes, type HoursRowView } from "./habitsHours";

// How a Today row looks the instant it is tapped, before the server has
// caught up. One reducer for the Today list, the same idea as
// `planItemChanges.ts`. Pure: no db, no React.

/** One person's state on a habit today (an Each habit shows every participant). */
export type HabitMemberState = { userId: string; done: boolean; skipped: boolean };

/** The parts of a Today row a tap can change. `doneToday` / `skippedToday` are the viewer's. */
export type HabitRowState = {
  id: string;
  /** "together" (one tap writes everyone) or "each" (one tap writes one person). */
  sharing: string;
  viewerId: string;
  doneToday: boolean;
  skippedToday: boolean;
  /** The missed day a carried row stands for, else null. Only its presence matters here. */
  carriedFrom: unknown | null;
  /** "required", "open" or "none" today: a "none" row is on Today only because it is carried or finished. */
  dueState: string;
  participants: HabitMemberState[];
  /** An hours habit's week; a log of time redraws it (`addTime`). Left off or null for a checks habit. */
  hours?: HoursRowView | null;
};

export type HabitChange = {
  /** "skipCarried" skips the missed day a carried row stands for (decision 89), not today. */
  type: "check" | "uncheck" | "skip" | "unskip" | "skipCarried" | "addTime";
  /** `addTime` only: the minutes just logged toward this week (none for another week). */
  minutes?: number;
  habitId: string;
  /** Whose row, for an Each habit; defaults to the viewer. Ignored for Together. */
  userId?: string;
};

type Flags = { done: boolean; skipped: boolean };

/** A day that already has a check or a skip is left alone, as on the server: undo first. */
function applyToFlags(flags: Flags, type: HabitChange["type"]): Flags {
  switch (type) {
    case "check":
      return flags.done || flags.skipped ? flags : { done: true, skipped: false };
    case "skip":
      return flags.done || flags.skipped ? flags : { done: false, skipped: true };
    case "uncheck":
      return flags.done ? { done: false, skipped: flags.skipped } : flags;
    case "unskip":
      return flags.skipped ? { done: flags.done, skipped: false } : flags;
    case "skipCarried":
    case "addTime":
      return flags;
  }
}

function changeRow<T extends HabitRowState>(row: T, change: HabitChange): T | null {
  // Time logged on this week's hours habit redraws the bar; only the viewer's own row has one.
  if (change.type === "addTime") {
    if (!row.hours || (change.userId ?? row.viewerId) !== row.viewerId) return row;
    const hours = addHoursMinutes(row.hours, change.minutes ?? 0);
    const participants = row.participants.map((member) => (member.userId === row.viewerId ? { ...member, done: hours.met } : member));
    return { ...row, hours, doneToday: hours.met, participants };
  }
  // Skipping the missed day ends the carry. A row only on Today because of it (not due today) leaves; a row due today stays, unchecked.
  if (change.type === "skipCarried") {
    if (row.carriedFrom === null) return row;
    return row.dueState === "none" ? null : { ...row, carriedFrom: null };
  }
  const together = row.sharing === "together";
  const target = together ? null : (change.userId ?? row.viewerId);
  const participants = row.participants.map((member) => {
    if (target !== null && member.userId !== target) return member;
    const next = applyToFlags({ done: member.done, skipped: member.skipped }, change.type);
    return next.done === member.done && next.skipped === member.skipped
      ? member
      : { ...member, done: next.done, skipped: next.skipped };
  });
  // The row's own flags are the viewer's: a Together tap is everyone's, an Each tap only counts for the viewer's own row.
  if (!together && target !== row.viewerId) return { ...row, participants };
  const next = applyToFlags({ done: row.doneToday, skipped: row.skippedToday }, change.type);
  return { ...row, participants, doneToday: next.done, skippedToday: next.skipped };
}

/** The rows with `change` applied to the one it names; everything else is returned as is. */
export function applyHabitChange<T extends HabitRowState>(rows: T[], change: HabitChange): T[] {
  return rows.flatMap((row) => (row.id === change.habitId ? (changeRow(row, change) ?? []) : [row]));
}
