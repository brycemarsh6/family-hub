import {
  addCalendarDays,
  formatCalendarDate,
  parseDateParam,
  startOfMonth,
  startOfWeek,
  type CalendarDate,
} from "./householdDate";
import { canSeeHabitReport, canSeeHabitStats } from "./habits/access";
import { carrySince, habitStartDay } from "./habits/carryOver";
import { specFromRow } from "./habits/habitRows";
import { compareDays } from "./habits/schedule";
import type { HabitActor, ScheduleSpec } from "./habits/types";
import { lifeAreaInfo, toLifeArea } from "./goalVocabulary";
import { visibleInViewerOrder, type TodayHabitInput } from "./habitsToday";
import { firstNameOf, type ChartChip, type ChartPerson } from "./choreChart";
import { REPORT_LABELS, TIMES_OF_DAY, TIME_OF_DAY_LABELS, toHabitKind, toTimeOfDay, type HabitKind } from "./habitVocabulary";

// The Report's URL params and scope (decisions 164 to 169), with no database:
// which person and items show, the filter, the chosen Year item, and the
// period and range the loader must read. `habitsReport.ts` draws the cells
// from a scope (it imports this file, never the other way round).

export const REPORT_VIEWS = ["week", "month", "year"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

export const REPORT_FILTER_ALL = "all";

/** The page's URL params, read: `week` is a Sunday, `month` the 1st. Nothing here is checked against the items yet (`reportScope` clamps). */
export type ReportParams = {
  view: ReportView;
  week: CalendarDate;
  month: CalendarDate;
  year: number;
  /** The person asked for, or null for the viewer. */
  person: string | null;
  filter: string;
  /** The Year view's item, or null for the first shown. */
  item: string | null;
};

type RawValue = string | string[] | undefined;
export type RawReportParams = Partial<Record<"view" | "week" | "month" | "year" | "person" | "filter" | "item", RawValue>>;

const one = (value: RawValue): string => (Array.isArray(value) ? value[0] : value) ?? "";

/** `?view=month&month=2026-10&person=..&filter=..&item=..`: anything unreadable falls back to today's period and the default. */
export function parseReportParams(raw: RawReportParams, today: CalendarDate): ReportParams {
  const view = REPORT_VIEWS.find((entry) => entry === one(raw.view)) ?? "week";
  const week = parseDateParam(one(raw.week));
  const month = /^\d{4}-\d{2}$/.exec(one(raw.month)) ? parseDateParam(`${one(raw.month)}-01`) : null;
  const year = /^\d{4}$/.test(one(raw.year)) ? Number(one(raw.year)) : today.year;
  return {
    view,
    week: startOfWeek(week ?? today),
    month: startOfMonth(month ?? today),
    year,
    person: one(raw.person) || null,
    filter: one(raw.filter) || REPORT_FILTER_ALL,
    item: one(raw.item) || null,
  };
}

/** A Report page address: the default view and the All filter are left out, so the plain page is `/habits/report`. `week` is a `weekParam`, `month` a `monthParam`, `year` the year. */
export function reportHref(parts: { view: ReportView; week?: string; month?: string; year?: string; person?: string | null; filter?: string; item?: string | null }): string {
  const query = new URLSearchParams();
  if (parts.view !== "week") query.set("view", parts.view);
  for (const key of ["week", "month", "year"] as const) {
    if (parts[key]) query.set(key, parts[key]);
  }
  if (parts.person) query.set("person", parts.person);
  if (parts.filter && parts.filter !== REPORT_FILTER_ALL) query.set("filter", parts.filter);
  if (parts.item) query.set("item", parts.item);
  const text = query.toString();
  return text ? `/habits/report?${text}` : "/habits/report";
}

/** The URL value of each period: a Sunday "YYYY-MM-DD", "YYYY-MM", and the year. */
export const weekParam = (week: CalendarDate): string => formatCalendarDate(week);
export const monthParam = (month: CalendarDate): string => formatCalendarDate(month).slice(0, 7);

// ---- Items, person chips and the filter ----

/** One item the Report lists. `canOpenStats` decides whether the title is a link to `/habits/[id]` (decision 114). */
export type ReportItem = { id: string; title: string; icon: string | null; kind: HabitKind; canOpenStats: boolean };

export type ScopedItem = ReportItem & { spec: ScheduleSpec; since: CalendarDate; timeOfDay: string | null; lifeArea: string | null };

/**
 * The person's live items (decision 165): every habit and chore they are on,
 * Habits then Chores, each in their own Manage order. Another person's private
 * habits never appear, so a parent reading a kid's report sees only what the
 * Today list would show them. A schedule that cannot be read is left out.
 * `since` is the later of the habit's start and the day the person joined.
 */
function scopedItems(viewer: HabitActor, personId: string, habits: readonly TodayHabitInput[]): ScopedItem[] {
  const live = habits.filter((habit) => !habit.archivedAt && (personId === viewer.userId || !habit.isPrivate));
  const items = visibleInViewerOrder({ userId: personId, role: viewer.role }, live).flatMap((habit): ScopedItem[] => {
    const spec = specFromRow(habit);
    if (!spec) return [];
    const mine = habit.participants.find((p) => p.userId === personId);
    const access = { isPrivate: habit.isPrivate, participantIds: habit.participants.map((p) => p.userId) };
    return [
      {
        id: habit.id,
        title: habit.title,
        icon: habit.icon,
        kind: toHabitKind(habit.kind),
        canOpenStats: canSeeHabitStats(viewer, access),
        spec,
        since: carrySince(mine?.joinedAt, habitStartDay(habit.createdAt)),
        timeOfDay: habit.timeOfDay,
        lifeArea: habit.lifeArea,
      },
    ];
  });
  return [...items.filter((item) => item.kind === "habit"), ...items.filter((item) => item.kind === "chore")];
}

/** The chart's person chips (decision 119) for a parent or admin: first names, the viewer first, then family order, no Kids chip. Everyone else, and a household of one, gets none. */
function personChips(viewer: HabitActor, people: readonly ChartPerson[], personId: string): ChartChip[] | null {
  const shown = people.filter((p) => canSeeHabitReport(viewer, p.id));
  if (shown.length < 2) return null;
  const ordered = [...shown.filter((p) => p.id === viewer.userId), ...shown.filter((p) => p.id !== viewer.userId)];
  return ordered.map((p) => ({ id: p.id, name: firstNameOf(p.displayName), avatarColor: p.avatarColor, selected: p.id === personId }));
}

export type ReportFilterOption = { key: string; label: string };

/** All, then Habits and Chores (only when both are shown, and `kinds` is not false: Today and Whole family already split them), the times of day present, then the life areas present in the order Today meets them (decision 169). Icons are the page's, by key prefix: `kind:`, `time:`, `area:`. */
export function reportFilterOptions(items: readonly Pick<ScopedItem, "kind" | "timeOfDay" | "lifeArea">[], { kinds = true }: { kinds?: boolean } = {}): ReportFilterOption[] {
  const options: ReportFilterOption[] = [{ key: REPORT_FILTER_ALL, label: REPORT_LABELS.filterAll }];
  if (kinds && items.some((item) => item.kind === "habit") && items.some((item) => item.kind === "chore")) {
    options.push({ key: "kind:habit", label: REPORT_LABELS.filterHabits }, { key: "kind:chore", label: REPORT_LABELS.filterChores });
  }
  for (const time of TIMES_OF_DAY) {
    if (items.some((item) => toTimeOfDay(item.timeOfDay) === time)) options.push({ key: `time:${time}`, label: TIME_OF_DAY_LABELS[time] });
  }
  const areas = new Set<string>();
  for (const item of items) {
    const area = toLifeArea(item.lifeArea);
    if (area) areas.add(area);
  }
  for (const area of areas) options.push({ key: `area:${area}`, label: lifeAreaInfo(toLifeArea(area)!).short });
  return options;
}

/** If the chosen chip no longer matches anything (the server refreshed), show everything again. The one fallback for the Report, Today and Whole family. */
export function activeReportFilter(options: readonly ReportFilterOption[], key: string): string {
  return options.some((option) => option.key === key) ? key : REPORT_FILTER_ALL;
}

/** Whether an item shows under the filter key. */
export function matchesReportFilter(item: Pick<ScopedItem, "kind" | "timeOfDay" | "lifeArea">, key: string): boolean {
  if (key === REPORT_FILTER_ALL) return true;
  if (key.startsWith("kind:")) return item.kind === key.slice(5);
  if (key.startsWith("time:")) return toTimeOfDay(item.timeOfDay) === key.slice(5);
  return key.startsWith("area:") && toLifeArea(item.lifeArea) === key.slice(5);
}

// ---- Scope: what is shown, and the range the loader must read ----

/** What the loader reads for the range shown only: these items' checks from `from` to `to`, inclusive. */
export type ReportScope = {
  view: ReportView;
  personId: string;
  personName: string;
  /** The shown person is the viewer. */
  isSelf: boolean;
  chips: ChartChip[] | null;
  /** Whether the person has any item at all (before the filter): false is the empty state. */
  hasItems: boolean;
  filter: { options: ReportFilterOption[]; value: string };
  /** The items drawn: the filtered list (Year: the chosen one). */
  items: ScopedItem[];
  /** Year view only: every filtered item, for the "Which item?" chooser. */
  choices: ReportItem[];
  /** The period shown, after clamping: a Sunday, the 1st, or a January 1st. */
  period: CalendarDate;
  from: CalendarDate;
  to: CalendarDate;
  /** The earliest and latest period the pager reaches. */
  first: CalendarDate;
  last: CalendarDate;
};

const clampDay = (day: CalendarDate, low: CalendarDate, high: CalendarDate) => (compareDays(day, low) < 0 ? low : compareDays(day, high) > 0 ? high : day);

/** Whose Report is shown: the one asked for when the viewer may see it and is a household person, else the viewer. The one rule for the loader and `reportScope`. */
export function reportPersonId(viewer: HabitActor, askedId: string | null, people: readonly Pick<ChartPerson, "id">[]): string {
  const asked = people.find((p) => p.id === askedId);
  return asked && canSeeHabitReport(viewer, asked.id) ? asked.id : viewer.userId;
}

/**
 * Resolves the URL against the data: the person (only a parent or admin may ask
 * for someone else, and only a household person), the items under the filter
 * (it falls back to All when nothing matches it any more), the chosen item for
 * Year, and the period clamped between the earliest start among the items drawn
 * and today (decisions 164 to 169).
 */
export function reportScope(
  viewer: HabitActor,
  params: ReportParams,
  habits: readonly TodayHabitInput[],
  people: readonly ChartPerson[],
  today: CalendarDate,
): ReportScope {
  const personId = reportPersonId(viewer, params.person, people);
  const all = scopedItems(viewer, personId, habits);
  const options = reportFilterOptions(all);
  const value = activeReportFilter(options, params.filter);
  const filtered = all.filter((item) => matchesReportFilter(item, value));
  const chosen = params.view === "year" ? (filtered.find((item) => item.id === params.item) ?? filtered[0]) : undefined;
  const drawn = params.view === "year" ? (chosen ? [chosen] : []) : filtered;
  const earliest = drawn.reduce<CalendarDate>((best, item) => (compareDays(item.since, best) < 0 ? item.since : best), today);
  const lastYearDay = (year: number) => ({ year, month: 12, day: 31 });
  let period: CalendarDate;
  let first: CalendarDate;
  let last: CalendarDate;
  let to: CalendarDate;
  if (params.view === "week") {
    first = startOfWeek(earliest);
    last = startOfWeek(today);
    period = clampDay(params.week, first, last);
    to = addCalendarDays(period, 6);
  } else if (params.view === "month") {
    first = startOfMonth(earliest);
    last = startOfMonth(today);
    period = clampDay(params.month, first, last);
    to = addCalendarDays({ ...period, month: period.month + 1 }, -1);
  } else {
    first = { year: earliest.year, month: 1, day: 1 };
    last = { year: today.year, month: 1, day: 1 };
    period = { year: Math.min(Math.max(params.year, first.year), last.year), month: 1, day: 1 };
    to = lastYearDay(period.year);
  }
  return {
    view: params.view,
    personId,
    personName: people.find((p) => p.id === personId)?.displayName ?? "",
    isSelf: personId === viewer.userId,
    chips: personChips(viewer, people, personId),
    hasItems: all.length > 0,
    filter: { options, value },
    items: drawn,
    choices: filtered.map(({ id, title, icon, kind, canOpenStats }) => ({ id, title, icon, kind, canOpenStats })),
    period,
    from: period,
    to,
    first,
    last,
  };
}
