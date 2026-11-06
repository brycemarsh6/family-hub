import Link from "next/link";
import { HabitIcon } from "./HabitIcon";
import type { ReportItem } from "@/lib/habitsReportScope";

/**
 * An item's line on a Report card: icon box, the title and the muted count.
 * The title is a link to the stats page only when the viewer may open it
 * (decision 114), else plain text. `stacked` puts the count under the title
 * (the Month cards are narrow); otherwise it sits at the right (Week).
 */
export function ReportItemHead({ item, count, stacked = false }: { item: ReportItem; count: string; stacked?: boolean }) {
  const title = item.canOpenStats ? (
    <Link href={`/habits/${item.id}`} className="flex min-h-11 min-w-0 items-center font-semibold">
      <span className="truncate">{item.title}</span>
    </Link>
  ) : (
    <span className="block truncate font-semibold">{item.title}</span>
  );
  return (
    <div className={`flex min-h-11 items-center gap-2 ${stacked ? "" : "px-1"}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <HabitIcon name={item.icon} kind={item.kind} size={18} />
      </div>
      {stacked ? (
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          {title}
          <span className="text-xs text-muted">{count}</span>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">{title}</div>
          <span className="shrink-0 text-sm text-muted">{count}</span>
        </>
      )}
    </div>
  );
}
