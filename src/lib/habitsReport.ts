import { addCalendarDays, formatCalendarDate, formatWeekTitle, startOfMonth, type CalendarDate } from "./householdDate";
import { compareDays, isOpenKind, periodTarget } from "./habits/schedule";
import type { HabitLogDay, Vacation, WeekOverride } from "./habits/types";
import { monthCalendar, statsMonthTitle, type CellReason, type MonthCellState, type StatsInput } from "./habitsStats";
import { monthParam, weekParam, type ReportFilterOption, type ReportItem, type ReportScope, type ReportView, type ScopedItem } from "./habitsReportScope";
import { firstNameOf, type ChartChip } from "./choreChart";
import { FULL_MONTH_NAMES } from "./mealPlanDates";
import { REPORT_LABELS, reportCountOf, reportCountThis, reportYearTotals, type HabitKind } from "./habitVocabulary";

// The Report's rules (decisions 163 to 171), with no database:
// `habitsStatsRead.ts` (`loadHabitReport`) fetches the shown person's habits
// and, for the range shown only, their checks, vacations and this-week
// changes; `habitsReportScope.ts` decides which items show and the range, and
// this file the pager, the cells and counts. Every cell comes from `monthCalendar`, so the Report and
// the stats page draw a day the same way. Callers pass `today`.

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
      title: formatWeekTitle(period, today.year),
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
