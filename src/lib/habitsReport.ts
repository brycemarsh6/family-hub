import { MANAGER_ROLES } from "./constants";
import {
  addCalendarDays,
  formatCalendarDate,
  parseDateParam,
  startOfMonth,
  startOfWeek,
  type CalendarDate,
} from "./householdDate";
import { canSeeHabitStats } from "./habits/access";
import { carrySince, habitStartDay } from "./habits/carryOver";
import { specFromRow } from "./habits/habitRows";
import { compareDays, isOpenKind, periodTarget } from "./habits/schedule";
import type { HabitActor, HabitLogDay, ScheduleSpec, Vacation, WeekOverride } from "./habits/types";
import { lifeAreaInfo, toLifeArea } from "./goalVocabulary";
import { monthCalendar, statsMonthTitle, type CellReason, type MonthCellState, type StatsInput } from "./habitsStats";
import { visibleInViewerOrder, type TodayHabitInput } from "./habitsToday";
import type { ChartChip, ChartPerson } from "./choreChart";
import { FULL_MONTH_NAMES, formatWeekTitle } from "./mealPlanDates";
import {
  REPORT_LABELS,
  TIMES_OF_DAY,
  TIME_OF_DAY_LABELS,
  reportCountOf,
  reportCountThis,
  reportYearTotals,
  toHabitKind,
  toTimeOfDay,
  type HabitKind,
} from "./habitVocabulary";

// The Report's rules (decisions 163 to 171), with no database:
// `habitsStatsRead.ts` (`loadHabitReport`) fetches the shown person's habits
// and, for the range shown only, their checks, vacations and this-week
// changes; this file decides which items show, the filter, the pager and the
// cells and counts. Every cell comes from `monthCalendar`, so the Report and
// the stats page draw a day the same way. Callers pass `today`.

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

/** The URL value of each period: a Sunday "YYYY-MM-DD", "YYYY-MM", and the year. */
export const weekParam = (week: CalendarDate): string => formatCalendarDate(week);
export const monthParam = (month: CalendarDate): string => formatCalendarDate(month).slice(0, 7);

// ---- Items, person chips and the filter ----

/** One item the Report lists. `canOpenStats` decides whether the title is a link to `/habits/[id]` (decision 114). */
export type ReportItem = { id: string; title: string; icon: string | null; kind: HabitKind; canOpenStats: boolean };

type ScopedItem = ReportItem & { spec: ScheduleSpec; since: CalendarDate; timeOfDay: string | null; lifeArea: string | null };

const firstNameOf = (displayName: string) => displayName.trim().split(/\s+/)[0] || displayName;

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
  if (!MANAGER_ROLES.includes(viewer.role) || people.length < 2) return null;
  const ordered = [...people.filter((p) => p.id === viewer.userId), ...people.filter((p) => p.id !== viewer.userId)];
  return ordered.map((p) => ({ id: p.id, name: firstNameOf(p.displayName), avatarColor: p.avatarColor, selected: p.id === personId }));
}

export type ReportFilterOption = { key: string; label: string };

/** All, then Habits and Chores (only when both are shown), the times of day present, then the life areas present in the order Today meets them (decision 169). Icons are the page's, by key prefix: `kind:`, `time:`, `area:`. */
export function reportFilterOptions(items: readonly Pick<ScopedItem, "kind" | "timeOfDay" | "lifeArea">[]): ReportFilterOption[] {
  const options: ReportFilterOption[] = [{ key: REPORT_FILTER_ALL, label: REPORT_LABELS.filterAll }];
  if (items.some((item) => item.kind === "habit") && items.some((item) => item.kind === "chore")) {
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
  const asked = people.find((p) => p.id === params.person);
  const personId = asked && MANAGER_ROLES.includes(viewer.role) ? asked.id : viewer.userId;
  const all = scopedItems(viewer, personId, habits);
  const options = reportFilterOptions(all);
  const value = options.some((option) => option.key === params.filter) ? params.filter : REPORT_FILTER_ALL;
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

// ---- The data the page draws ----

/** One day, as the shared cell draws it (`HabitDayCell`); read-only, so never tappable. */
export type ReportCell = { day: string; state: MonthCellState; reason: CellReason | null; tappable: false };

export type ReportWeekRow = ReportItem & { count: string; cells: ReportCell[] };
export type ReportMonthCard = ReportItem & { count: string; leading: number; cells: ReportCell[] };
export type ReportSection<Row> = { kind: HabitKind; title: string; rows: Row[] };
export type ReportYearMonth = { month: number; name: string; leading: number; cells: ReportCell[] };

/** The pager: `current`, `prev` and `next` are URL values (`weekParam`, `monthParam`, the year); null is a disabled arrow. `pill` is the "This week" pill on a past period, null otherwise. */
export type ReportPager = { title: string; current: string; prev: string | null; next: string | null; pill: string | null };

export type HabitReport = {
  today: string;
  view: ReportView;
  personId: string;
  personName: string;
  isSelf: boolean;
  /** Parents and admins only (decision 165). */
  chips: ChartChip[] | null;
  /** Set when the person has no items at all (decision 171). */
  empty: { emoji: string; title: string; hint: string } | null;
  filter: { options: ReportFilterOption[]; value: string };
  pager: ReportPager;
  /** Week and Month: Habits then Chores; empty sections are left out. */
  sections: ReportSection<ReportWeekRow | ReportMonthCard>[];
  /** Year only, else null. `chosenId` is the item drawn; `months` are its twelve grids. */
  year: { chosenId: string | null; choices: ReportItem[]; months: ReportYearMonth[]; totals: string | null } | null;
};

/** What the loader fetched for the range: the person's checks and this-week changes per habit, and their vacations. */
export type ReportData = {
  logsByHabit: ReadonlyMap<string, readonly HabitLogDay[]>;
  overridesByHabit: ReadonlyMap<string, readonly WeekOverride[]>;
  vacations: readonly Vacation[];
};

function statsInputFor(scope: ReportScope, item: ScopedItem, data: ReportData, today: CalendarDate): StatsInput {
  return {
    spec: item.spec,
    people: [{ userId: scope.personId, displayName: scope.personName, avatarColor: "", since: item.since, deactivated: false, cache: { current: 0, best: 0, asOf: null } }],
    logs: (data.logsByHabit.get(item.id) ?? []).map((log) => ({ ...log, userId: scope.personId })),
    vacationsByUser: new Map([[scope.personId, data.vacations]]),
    overrides: data.overridesByHabit.get(item.id) ?? [],
    today,
  };
}

function toCell(cell: { day: CalendarDate; state: MonthCellState; reason: CellReason | null }): ReportCell {
  return { day: formatCalendarDate(cell.day), state: cell.state, reason: cell.reason, tappable: false };
}

const isChecked = (cell: ReportCell) => cell.state === "done" || cell.state === "late";

/** The count text for the cells shown (decisions 166, 167): "5 of 6" for scheduled items (done of due so far, like the stats page), done of the target for the open kind that has a target in the period, otherwise "N this week" or "N this month". */
function countText(item: ScopedItem, cells: readonly ReportCell[], period: "week" | "month", periodStart: CalendarDate): string {
  const done = cells.filter(isChecked).length;
  if (!isOpenKind(item.spec)) return reportCountOf(done, done + cells.filter((cell) => cell.state === "missed").length);
  const targeted = item.spec.schedule === "monthly" ? period === "month" : period === "week";
  if (!targeted) return reportCountThis(done, period);
  return reportCountOf(Math.min(done, periodTarget(item.spec, periodStart)), periodTarget(item.spec, periodStart));
}

function sectionsOf<Row extends ReportItem>(rows: Row[]): ReportSection<Row>[] {
  return [
    { kind: "habit" as const, title: REPORT_LABELS.filterHabits, rows: rows.filter((row) => row.kind === "habit") },
    { kind: "chore" as const, title: REPORT_LABELS.filterChores, rows: rows.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);
}

function pagerFor(scope: ReportScope, today: CalendarDate): ReportPager {
  const { view, period, first, last } = scope;
  const atFirst = compareDays(period, first) <= 0;
  const atLast = compareDays(period, last) >= 0;
  if (view === "week") {
    const step = (n: number) => weekParam(addCalendarDays(period, 7 * n));
    return {
      title: formatWeekTitle(new Date(period.year, period.month - 1, period.day), today.year),
      current: weekParam(period),
      prev: atFirst ? null : step(-1),
      next: atLast ? null : step(1),
      pill: atLast ? null : REPORT_LABELS.thisWeek,
    };
  }
  if (view === "month") {
    const step = (n: number) => monthParam(addCalendarDays({ ...period, month: period.month + n }, 0));
    return {
      title: statsMonthTitle(period.year, period.month, today.year),
      current: monthParam(period),
      prev: atFirst ? null : step(-1),
      next: atLast ? null : step(1),
      pill: atLast ? null : REPORT_LABELS.thisMonth,
    };
  }
  return { title: String(period.year), current: String(period.year), prev: atFirst ? null : String(period.year - 1), next: atLast ? null : String(period.year + 1), pill: null };
}

/** The day cells of `from` to `to`, read from the month calendars they fall in. */
function cellsInRange(input: StatsInput, userId: string, from: CalendarDate, to: CalendarDate): ReportCell[] {
  const cells: ReportCell[] = [];
  for (let month = startOfMonth(from); compareDays(month, to) <= 0; month = addCalendarDays({ ...month, month: month.month + 1 }, 0)) {
    for (const cell of monthCalendar(input, userId, month)!.cells) {
      if (compareDays(cell.day, from) >= 0 && compareDays(cell.day, to) <= 0) cells.push(toCell(cell));
    }
  }
  return cells;
}

/** The whole Report as plain data (days as "YYYY-MM-DD"), from a scope and what was fetched for its range. */
export function buildHabitReport(scope: ReportScope, data: ReportData, today: CalendarDate): HabitReport {
  const base = {
    today: formatCalendarDate(today),
    view: scope.view,
    personId: scope.personId,
    personName: scope.personName,
    isSelf: scope.isSelf,
    chips: scope.chips,
    empty: scope.hasItems
      ? null
      : {
          emoji: REPORT_LABELS.emptyEmoji,
          title: REPORT_LABELS.emptyTitle,
          hint: scope.isSelf ? REPORT_LABELS.emptyHint : REPORT_LABELS.emptyHintFor(firstNameOf(scope.personName)),
        },
    filter: scope.filter,
    pager: pagerFor(scope, today),
  };
  if (scope.view === "week") {
    const rows = scope.items.map((item): ReportWeekRow => {
      const cells = cellsInRange(statsInputFor(scope, item, data, today), scope.personId, scope.from, scope.to);
      const { id, title, icon, kind, canOpenStats } = item;
      return { id, title, icon, kind, canOpenStats, count: countText(item, cells, "week", scope.period), cells };
    });
    return { ...base, sections: sectionsOf(rows), year: null };
  }
  if (scope.view === "month") {
    const rows = scope.items.map((item): ReportMonthCard => {
      const calendar = monthCalendar(statsInputFor(scope, item, data, today), scope.personId, scope.period)!;
      const cells = calendar.cells.map(toCell);
      const { id, title, icon, kind, canOpenStats } = item;
      return { id, title, icon, kind, canOpenStats, count: countText(item, cells, "month", scope.period), leading: calendar.leading, cells };
    });
    return { ...base, sections: sectionsOf(rows), year: null };
  }
  const item = scope.items[0];
  const months = item
    ? Array.from({ length: 12 }, (_, index): ReportYearMonth => {
        const calendar = monthCalendar(statsInputFor(scope, item, data, today), scope.personId, { year: scope.period.year, month: index + 1, day: 1 })!;
        return { month: index + 1, name: FULL_MONTH_NAMES[index], leading: calendar.leading, cells: calendar.cells.map(toCell) };
      })
    : [];
  const all = months.flatMap((month) => month.cells);
  const totals = item
    ? reportYearTotals({ done: all.filter(isChecked).length, missed: all.filter((cell) => cell.state === "missed").length, skipped: all.filter((cell) => cell.state === "skipped").length })
    : null;
  return { ...base, sections: [], year: { chosenId: item?.id ?? null, choices: scope.choices, months, totals } };
}
