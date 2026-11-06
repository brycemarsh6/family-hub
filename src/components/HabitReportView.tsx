import { PageTabs } from "./PageTabs";
import { HabitDayLegend } from "./HabitDayCell";
import { ReportFilter } from "./ReportFilter";
import { ReportMonth } from "./ReportMonth";
import { ReportPager } from "./ReportPager";
import { ReportPersonChips } from "./ReportPersonChips";
import { ReportWeek } from "./ReportWeek";
import { ReportYear } from "./ReportYear";
import { EmptyState } from "./EmptyState";
import type { HabitReport } from "@/lib/habitsReport";
import { REPORT_VIEWS, reportHref, type ReportView } from "@/lib/habitsReportScope";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

/**
 * The Report page's body (decisions 163 to 171), in the order of 164: tabs,
 * person chips, filter chips, pager, legend (Month and Year), then the view.
 * Every control is an address built here from the URL state, so the page is
 * plain server rendering: the view, person, filter and period all live in the
 * URL and the controls are links.
 */
export function HabitReportView({ report }: { report: HabitReport }) {
  const { view, pager } = report;
  // The state every control keeps: a person is named in the URL only when chips let a parent choose one.
  const keep = { person: report.chips ? report.personId : null, filter: report.filter.value, item: report.year?.chosenId ?? null };
  const periodKey = view;
  const at = (period: string | null) => (period === null ? null : reportHref({ view, ...keep, [periodKey]: period }));
  const empty = report.empty;

  return (
    <>
      <PageTabs
        label={REPORT_LABELS.viewsAria}
        tabs={REPORT_VIEWS.map((key: ReportView) => ({ key, label: REPORT_LABELS.tabs[key], href: reportHref({ view: key, ...keep }) }))}
        value={view}
      />
      {report.chips && (
        <ReportPersonChips
          chips={report.chips.map((chip) => ({
            id: chip.id,
            name: chip.name,
            selected: chip.selected,
            href: reportHref({ view, person: chip.id, filter: keep.filter }),
          }))}
        />
      )}
      {empty ? (
        <EmptyState emoji={empty.emoji} title={empty.title} hint={empty.hint} />
      ) : (
        <>
          <ReportFilter
            value={report.filter.value}
            options={report.filter.options.map((option) => ({ ...option, href: reportHref({ view, ...keep, filter: option.key, [periodKey]: pager.current }) }))}
          />
          <ReportPager
            view={view}
            title={pager.title}
            prevHref={at(pager.prev)}
            nextHref={at(pager.next)}
            pill={pager.pill ? { label: pager.pill, href: reportHref({ view, ...keep }) } : null}
          />
          {view !== "week" && <HabitDayLegend className="mb-3" />}
          {view === "week" && <ReportWeek sections={report.sections} today={report.today} />}
          {view === "month" && <ReportMonth sections={report.sections} today={report.today} />}
          {view === "year" && report.year && (
            <ReportYear
              year={report.year}
              today={report.today}
              choiceHrefs={Object.fromEntries(report.year.choices.map((choice) => [choice.id, reportHref({ view, ...keep, item: choice.id, year: pager.current })]))}
            />
          )}
        </>
      )}
    </>
  );
}
