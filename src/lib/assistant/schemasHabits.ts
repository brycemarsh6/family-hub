import { z } from "zod";
import { calendarDateString } from "@/lib/assistant/schemas";
import { LIFE_AREAS } from "@/lib/goalVocabulary";
import { HABIT_TRACKS, PACE_DAYS } from "@/lib/habitHoursVocabulary";
import {
  HABIT_ICONS,
  HABIT_KINDS,
  HABIT_MODES,
  HABIT_SCHEDULES,
  HABIT_SHARING,
  TIMES_OF_DAY,
} from "@/lib/habitVocabulary";
import type { HabitInput } from "@/lib/habitInput";
import { calendarDateFromUtcMidnight, formatCalendarDate } from "@/lib/householdDate";

// Request shapes for the Assistant API's habit routes, and the two pure
// mappings from a body to the habit form's `HabitInput` (create with the
// defaults, edit over the current row). Pure (zod only), `.strict()`
// everywhere. Words and limits are NOT repeated here: the vocabulary comes
// from the habit vocabulary files and `checkHabitInput` refuses with the
// app's own sentences. `isPrivate` is deliberately in no body: Winnie never
// changes who may see a habit (a one-person hours habit is private by rule).

const oneOf = (values: readonly string[]) => z.enum(values as [string, ...string[]]);

const optionalFields = {
  kind: oneOf(HABIT_KINDS).optional(),
  mode: oneOf(HABIT_MODES).optional(),
  icon: oneOf(HABIT_ICONS).nullable().optional(),
  lifeArea: oneOf(LIFE_AREAS.map((area) => area.key)).nullable().optional(),
  timeOfDay: oneOf(TIMES_OF_DAY).nullable().optional(),
  schedule: oneOf(HABIT_SCHEDULES).optional(),
  weekdays: z.string().regex(/^[01]{7}$/, { message: "Seven 0s and 1s, Sunday first, e.g. 0111110." }).nullable().optional(),
  times: z.number().int().nullable().optional(),
  anchorWeek: calendarDateString.nullable().optional(),
  carryOver: z.boolean().optional(),
  sharing: oneOf(HABIT_SHARING).optional(),
  track: oneOf(HABIT_TRACKS).optional(),
  weeklyHours: z.number().int().optional(),
  paceDays: oneOf(PACE_DAYS).optional(),
};

const personIds = z.array(z.string().min(1)).max(50);

export const habitCreateBody = z
  .object({
    title: z.string().max(500),
    ...optionalFields,
    participantIds: personIds.optional(),
    everyone: z.literal(true).optional(),
  })
  .strict()
  .refine((body) => (body.participantIds !== undefined) !== (body.everyone === true), {
    message: "Send participantIds or everyone: true (one of the two).",
    path: ["participantIds"],
  });

export const habitPatchBody = z
  .object({
    title: z.string().max(500).optional(),
    ...optionalFields,
    participantIds: personIds.optional(),
    everyone: z.literal(true).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change." })
  .refine((body) => body.participantIds === undefined || body.everyone === undefined, {
    message: "Send participantIds or everyone: true, not both.",
    path: ["participantIds"],
  });

export const habitListQuery = z
  .object({
    personId: z.string().min(1).optional(),
    includeArchived: z.enum(["true", "false"]).optional(),
  })
  .strict();

export const habitPersonQuery = z.object({ personId: z.string().min(1).optional() }).strict();

export const habitChartQuery = z.object({ personId: z.string().min(1) }).strict();

/** Check / skip: whose day, and which one (today when left out). */
export const habitTapBody = z
  .object({ personId: z.string().min(1), day: calendarDateString.optional() })
  .strict();

/** Undo a check / skip: the same two, as query parameters. */
export const habitTapQuery = z
  .object({ personId: z.string().min(1), day: calendarDateString.optional() })
  .strict();

/** `minutes` only has to be a whole number here; `checkEntryMinutes` gives the words. */
export const habitHoursBody = z
  .object({ personId: z.string().min(1), minutes: z.number().int(), day: calendarDateString.optional() })
  .strict();

export type HabitCreateBody = z.output<typeof habitCreateBody>;
export type HabitPatchBody = z.output<typeof habitPatchBody>;

const given = <T>(value: T | undefined, current: T): T => (value === undefined ? current : value);
const OPEN_SCHEDULES = ["weekly", "monthly"];

/**
 * The create body as the form would have sent it, with the defaults of
 * mission 47 (H3): a build habit that repeats daily (a chore: on certain
 * days), checked per person, no carry-over, once for weekly and monthly, hours
 * counted Monday to Saturday. `isPrivate` follows the app's rule for an hours
 * habit for one person, but only when that person is the owner (`ownerId`,
 * Bryce): she sees only his private habits, so a private habit for anyone else
 * would vanish from her, and the app refuses a create she could not edit
 * afterwards (H8). Nothing else is decided here: `checkHabitInput` refuses.
 */
export function newHabitInput(body: HabitCreateBody, household: readonly string[], ownerId: string): HabitInput {
  const kind = body.kind ?? "habit";
  const track = body.track ?? "checks";
  const hours = track === "hours";
  const schedule = body.schedule ?? (kind === "chore" ? "weekdays" : "daily");
  const everyone = body.everyone === true;
  const participantIds = everyone ? [...household] : body.participantIds ?? [];
  return {
    title: body.title,
    kind,
    mode: body.mode ?? "build",
    icon: body.icon ?? null,
    lifeArea: body.lifeArea ?? null,
    timeOfDay: body.timeOfDay ?? null,
    schedule,
    weekdays: body.weekdays ?? null,
    times: body.times ?? (OPEN_SCHEDULES.includes(schedule) ? 1 : null),
    anchorWeek: body.anchorWeek ?? null,
    carryOver: body.carryOver ?? false,
    sharing: body.sharing ?? "each",
    isPrivate: hours && ownerId !== "" && new Set(participantIds).size === 1 && participantIds[0] === ownerId,
    participantIds,
    everyone,
    track,
    weeklyHours: body.weeklyHours ?? null,
    paceDays: hours ? body.paceDays ?? "monsat" : null,
  };
}

/**
 * The edit body laid over the habit as it is now: any field left out keeps
 * its value, `isPrivate` never changes, and naming the people (or everyone)
 * replaces them. A schedule that becomes weekly or monthly takes `times` 1
 * when it has none, as a new habit does.
 */
export function patchedHabitInput(current: HabitInput, body: HabitPatchBody): HabitInput {
  const track = given(body.track, current.track);
  const schedule = given(body.schedule, current.schedule);
  const everyone = body.everyone === true ? true : body.participantIds ? false : current.everyone;
  return {
    title: given(body.title, current.title),
    kind: given(body.kind, current.kind),
    mode: given(body.mode, current.mode),
    icon: given(body.icon, current.icon),
    lifeArea: given(body.lifeArea, current.lifeArea),
    timeOfDay: given(body.timeOfDay, current.timeOfDay),
    schedule,
    weekdays: given(body.weekdays, current.weekdays),
    times: given(body.times, current.times) ?? (OPEN_SCHEDULES.includes(schedule) ? 1 : null),
    anchorWeek: given(body.anchorWeek, current.anchorWeek),
    carryOver: given(body.carryOver, current.carryOver),
    sharing: given(body.sharing, current.sharing),
    isPrivate: current.isPrivate,
    participantIds: body.participantIds ?? (body.everyone === true ? [] : current.participantIds),
    everyone,
    track,
    weeklyHours: given(body.weeklyHours, current.weeklyHours),
    paceDays: given(body.paceDays, current.paceDays) ?? (track === "hours" ? "monsat" : null),
  };
}

/** What `habitInputFromRow` reads of a stored habit. */
export type StoredHabitFields = {
  title: string;
  kind: string;
  mode: string;
  icon: string | null;
  lifeArea: string | null;
  timeOfDay: string | null;
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: Date | null;
  carryOver: boolean;
  sharing: string;
  isPrivate: boolean;
  everyone: boolean;
  track: string;
  weeklyMinutes: number | null;
  paceDays: string | null;
};

/** A stored habit as the form would send it back unchanged (the base of an edit). */
export function habitInputFromRow(row: StoredHabitFields, participantIds: readonly string[]): HabitInput {
  return {
    title: row.title,
    kind: row.kind,
    mode: row.mode,
    icon: row.icon,
    lifeArea: row.lifeArea,
    timeOfDay: row.timeOfDay,
    schedule: row.schedule,
    weekdays: row.weekdays,
    times: row.times,
    anchorWeek: row.anchorWeek ? formatCalendarDate(calendarDateFromUtcMidnight(row.anchorWeek)) : null,
    carryOver: row.carryOver,
    sharing: row.sharing,
    isPrivate: row.isPrivate,
    participantIds: [...participantIds],
    everyone: row.everyone,
    track: row.track,
    weeklyHours: row.weeklyMinutes === null ? null : row.weeklyMinutes / 60,
    paceDays: row.paceDays,
  };
}
