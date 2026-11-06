import { REPORT_LABELS } from "@/lib/habitVocabulary";

/** The three marks in words, once under the pager on Month and Year (decision 167). Same marks as the stats calendar's legend. */
export function ReportLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
        {REPORT_LABELS.legend.done}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-dashed border-muted" />
        {REPORT_LABELS.legend.skipped}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-warn-soft ring-1 ring-warn" />
        {REPORT_LABELS.legend.missed}
      </span>
    </div>
  );
}
