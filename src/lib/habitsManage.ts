import { canOpenManageOf } from "./habits/access";
import type { HabitActor } from "./habits/types";
import { personChipsFor, type ChartChip, type ChartPerson } from "./choreChart";

// Manage's person, chips and the habit page addresses (mission 86), with no
// database: whose list Manage opens on, the `?person=` that carries that
// person through Manage, the edit page, New and the chore chart, and the chips
// that switch between people. Pure; the pages and the client components
// (`HabitsDayView`, `HabitManager`, `ChoreChart`, `ChoreChartSheet`) call it.

/**
 * The person whose Manage list opens: the one asked for when they are a
 * household person the viewer may open (`canOpenManageOf`), else the viewer.
 */
export function resolveManagePerson(viewer: HabitActor, requested: string | undefined, people: readonly { id: string }[]): string {
  if (requested && people.some((person) => person.id === requested) && canOpenManageOf(viewer, requested)) return requested;
  return viewer.userId;
}

/** The `?person=` value for a list: null for yourself (the plain address), else the person's id. */
export function personParam(personId: string, viewerId: string): string | null {
  return personId === viewerId ? null : personId;
}

function withPerson(path: string, personId: string | null): string {
  return personId ? `${path}?person=${encodeURIComponent(personId)}` : path;
}

export const manageHref = (personId: string | null): string => withPerson("/habits/manage", personId);
export const newHabitHref = (personId: string | null): string => withPerson("/habits/new", personId);
export const editHabitHref = (habitId: string, personId: string | null): string => withPerson(`/habits/${habitId}/edit`, personId);
/** The chart's address; `view` (the Default week or This week tab) rides after `?person=`. */
export function choreChartHref(personId: string | null, view?: "default" | "week"): string {
  const path = withPerson("/habits/chart", personId);
  if (!view) return path;
  return `${path}${personId ? "&" : "?"}view=${view}`;
}

/**
 * Manage's person chips: the people the viewer may open (`canOpenManageOf`),
 * the viewer first, then the given (household) order, first names. Null when
 * fewer than two, so a kid and a household of one get none.
 */
export function managePersonChips(viewer: HabitActor, people: readonly ChartPerson[], personId: string): ChartChip[] | null {
  const shown = people.filter((person) => canOpenManageOf(viewer, person.id));
  return shown.length < 2 ? null : personChipsFor(viewer, shown, personId);
}
