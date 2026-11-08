import { z } from "zod";
import { calendarDateString } from "@/lib/assistant/schemas";
import { GOAL_OWNERSHIPS, HABIT_PERIODS, LIFE_AREAS, PLAN_KINDS, VISION_HORIZONS } from "@/lib/goalVocabulary";
import { isOngoingGoal, type PlanItemView } from "@/lib/goals";
import { targetDateChips } from "@/lib/goalsProgress";
import { HABIT_TRACKS, PACE_DAYS } from "@/lib/habitHoursVocabulary";
import { calendarDateFromUtcMidnight, formatCalendarDate, type CalendarDate } from "@/lib/householdDate";

// Request shapes for the Assistant API's goal, plan item and vision routes, and
// the pure mappings from a body to the raw object the app's own validators
// (`validateGoalInput`, `validatePlanItemInput`, `validateVisionInput`) take.
// Pure (zod only), `.strict()` everywhere. Limits and sentences are NOT
// repeated here: the validators refuse in the app's own words. `visibility` is
// deliberately in no body: Winnie never changes who may see a goal (a goal she
// makes is shared, and she cannot make one private or public again).

const oneOf = (values: readonly string[]) => z.enum(values as [string, ...string[]]);
const areaKeys = LIFE_AREAS.map((area) => area.key);

const numberFields = {
  measureUnit: z.string().optional(),
  startValue: z.number().optional(),
  targetValue: z.number().optional(),
};

const hoursFields = {
  track: oneOf(HABIT_TRACKS).optional(),
  weeklyHours: z.number().optional(),
  paceDays: oneOf(PACE_DAYS).optional(),
};

// Hill's exact sentences (mission 50, H1, H2, H4, H5), the ones the app has no word for.
export const NUMBER_HAS_CHECK_INS = "This goal has check-ins, so its number can't be removed here. Ask Bryce to do it in Marshee.";
export const HABIT_TO_OTHER_KIND = "A habit can't be changed to a step or reminder here. Ask Bryce to do it in Marshee.";
export const CHECK_IN_NOT_HERS = "Winnie can only remove check-ins she added herself.";
export const VISION_EMPTY = "Write something for this vision. Winnie can't clear one.";
/** Not Hill's: a board that isn't Together's or the owner's is not hers to write. */
export const BOARD_NOT_HERS = "Winnie can only write the Together board and the owner's board.";
export const BOARD_NEEDS_OWNER = "Winnie can't tell which board is the owner's, so she can only write the Together board.";

const NO_BOTH_DATES = { message: "Send targetDate or ongoing: true, not both.", path: ["ongoing"] };

export const goalCreateBody = z
  .object({
    title: z.string(),
    area: oneOf(areaKeys),
    ownership: oneOf(GOAL_OWNERSHIPS),
    targetDate: calendarDateString.optional(),
    ongoing: z.literal(true).optional(),
    why: z.string().nullable().optional(),
    ...numberFields,
  })
  .strict()
  .refine((body) => body.targetDate === undefined || body.ongoing === undefined, NO_BOTH_DATES);

export const goalPatchBody = z
  .object({
    title: z.string().optional(),
    area: oneOf(areaKeys).optional(),
    targetDate: calendarDateString.optional(),
    ongoing: z.boolean().optional(),
    why: z.string().nullable().optional(),
    ...numberFields,
    removeNumber: z.literal(true).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change." })
  .refine((body) => body.targetDate === undefined || body.ongoing !== true, NO_BOTH_DATES)
  .refine(
    (body) => body.removeNumber === undefined || (body.measureUnit === undefined && body.startValue === undefined && body.targetValue === undefined),
    { message: "removeNumber can't be sent with the number's fields.", path: ["removeNumber"] },
  );

export const goalListQuery = z
  .object({ status: z.enum(["active", "done", "all"]).optional(), personId: z.string().min(1).optional() })
  .strict();

export const goalWeekQuery = z.object({ personId: z.string().min(1).optional() }).strict();

export const checkInBody = z.object({ value: z.number() }).strict();

export const planItemCreateBody = z
  .object({
    title: z.string(),
    kind: oneOf(PLAN_KINDS),
    timesPerPeriod: z.number().int().optional(),
    period: oneOf(HABIT_PERIODS).optional(),
    ...hoursFields,
  })
  .strict();

export const planItemPatchBody = z
  .object({
    title: z.string().optional(),
    kind: oneOf(PLAN_KINDS).optional(),
    timesPerPeriod: z.number().int().optional(),
    period: oneOf(HABIT_PERIODS).optional(),
    ...hoursFields,
    done: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change." });

/** `text` is any string here: empty is refused with Winnie's words, and the length with the app's. */
export const visionBody = z.object({ text: z.string() }).strict();

export const visionQuery = z
  .object({ board: z.string().min(1).optional(), horizon: oneOf(VISION_HORIZONS.map(String)).optional() })
  .strict();

export type GoalCreateBody = z.output<typeof goalCreateBody>;
export type GoalPatchBody = z.output<typeof goalPatchBody>;
export type PlanItemPatchBody = z.output<typeof planItemPatchBody>;

/** The number to track a body names, or null when it names none of its three fields. */
function measureOf(unit: unknown, start: unknown, target: unknown) {
  return unit === undefined && start === undefined && target === undefined ? null : { unit, start, target };
}

/**
 * The create body as the goal form would have sent it (mission 50, H3):
 * Ongoing when asked, else the date given, else the form's "End of this year".
 * `visibility` is set here, because the validator fails closed to private on
 * anything else. A "mine" goal's owner is the caller's business.
 */
export function newGoalRaw(body: GoalCreateBody, today: CalendarDate) {
  return {
    title: body.title,
    area: body.area,
    ownership: body.ownership,
    why: body.why ?? null,
    ongoing: body.ongoing === true,
    targetDate: body.ongoing === true ? null : (body.targetDate ?? formatCalendarDate(targetDateChips(today)[0].date)),
    measure: measureOf(body.measureUnit, body.startValue, body.targetValue),
    visibility: "shared",
  };
}

/** What `patchedGoalRaw` reads of the stored goal. */
export type StoredGoalFields = {
  title: string;
  area: string;
  why: string | null;
  targetDate: Date | null;
  visibility: string;
  measureUnit: string | null;
  startValue: number | null;
  targetValue: number | null;
};

/**
 * The edit body laid over the goal as it is now: any field left out keeps its
 * value. Ownership is not here (the stored row decides it) and neither is
 * visibility, which keeps its stored value.
 */
export function patchedGoalRaw(row: StoredGoalFields, body: GoalPatchBody) {
  const ongoing = body.ongoing === true || (body.targetDate === undefined && isOngoingGoal(row) && body.ongoing !== false);
  const stored = row.targetDate ? formatCalendarDate(calendarDateFromUtcMidnight(row.targetDate)) : null;
  const had = row.measureUnit !== null;
  const asked = measureOf(body.measureUnit, body.startValue, body.targetValue);
  const measure = body.removeNumber === true
    ? null
    : asked
      ? { unit: body.measureUnit ?? row.measureUnit ?? undefined, start: body.startValue ?? row.startValue ?? undefined, target: body.targetValue ?? row.targetValue ?? undefined }
      : had ? { unit: row.measureUnit, start: row.startValue, target: row.targetValue } : null;
  return {
    title: body.title ?? row.title,
    area: body.area ?? row.area,
    why: body.why === undefined ? row.why : body.why,
    ongoing,
    targetDate: ongoing ? null : (body.targetDate ?? stored),
    measure,
    visibility: row.visibility,
  };
}

/** Whether an edit body touches any of the goal's own fields (not just `completed`). */
export function editsGoalFields(body: GoalPatchBody): boolean {
  return Object.keys(body).some((key) => key !== "completed");
}

/**
 * The edit body laid over the item as it is now. A habit keeps its repeat
 * (`timesPerPeriod`, `period`) unless the body names them; any other kind
 * sends only what the body says, so a stray repeat is refused in the app's
 * words ("Only a habit repeats.").
 */
export function patchedPlanItemRaw(current: Pick<PlanItemView, "title" | "kind" | "timesPerPeriod" | "period">, body: PlanItemPatchBody) {
  const kind = body.kind ?? current.kind;
  const { done: _done, ...fields } = body;
  void _done;
  const same = kind === "habit" && current.kind === "habit";
  return {
    ...fields,
    title: body.title ?? current.title,
    kind,
    timesPerPeriod: body.timesPerPeriod ?? (same ? current.timesPerPeriod : undefined),
    period: body.period ?? (same ? current.period : undefined),
  };
}

/** Whether an edit body touches the item itself (not just `done`). */
export function editsPlanItemFields(body: PlanItemPatchBody): boolean {
  return Object.keys(body).some((key) => key !== "done");
}
