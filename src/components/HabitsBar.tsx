import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, ListFilter, SlidersHorizontal } from "lucide-react";
import { PAST_DAY_VIEW_ONLY, REPORT_LABELS, filterButtonLabel } from "@/lib/habitVocabulary";

const ICON_BUTTON = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface";
const DISABLED = "pointer-events-none opacity-40";

/**
 * The bar at the top of Habits & Chores (mission 51): the day as the page's
 * title with a subtitle under it, then Filter, the day arrows with Today,
 * Manage and the Report. The controls wrap under the title on a phone. The
 * arrows and Today are links (the day is the URL); an arrow at the edge of the
 * 14-day window is dimmed and `aria-disabled`. A past day says it is view only.
 * Manage and the Report are left out for a login that cannot manage.
 */
export function HabitsBar({
  dateLabel,
  subtitle,
  isToday,
  filterCount,
  onFilter,
  prevHref,
  nextHref,
  todayHref,
  canManage,
}: {
  dateLabel: string;
  subtitle: ReactNode;
  isToday: boolean;
  /** How many Filter groups are narrowed. */
  filterCount: number;
  onFilter: () => void;
  /** Null at the edge of the window. */
  prevHref: string | null;
  nextHref: string | null;
  todayHref: string;
  canManage: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 basis-full md:basis-auto">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{dateLabel}</h1>
          <p className="flex flex-wrap items-center text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onFilter}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
              filterCount > 0 ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface"
            }`}
          >
            <ListFilter aria-hidden="true" size={18} />
            {filterButtonLabel(filterCount)}
          </button>
          <div className="flex items-center">
            <Link
              href={prevHref ?? todayHref}
              replace
              scroll={false}
              aria-label="Previous day"
              aria-disabled={prevHref ? undefined : true}
              tabIndex={prevHref ? undefined : -1}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${prevHref ? "" : DISABLED}`}
            >
              <ChevronLeft aria-hidden="true" size={22} />
            </Link>
            <Link
              href={todayHref}
              replace
              scroll={false}
              aria-disabled={isToday ? true : undefined}
              tabIndex={isToday ? -1 : undefined}
              className={`flex min-h-11 items-center rounded-full px-3 text-sm font-semibold ${isToday ? `${DISABLED} text-muted` : "text-accent"}`}
            >
              Today
            </Link>
            <Link
              href={nextHref ?? todayHref}
              replace
              scroll={false}
              aria-label="Next day"
              aria-disabled={nextHref ? undefined : true}
              tabIndex={nextHref ? undefined : -1}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${nextHref ? "" : DISABLED}`}
            >
              <ChevronRight aria-hidden="true" size={22} />
            </Link>
          </div>
          {canManage && (
            <>
              <Link href="/habits/manage" aria-label="Manage" className={ICON_BUTTON}>
                <SlidersHorizontal aria-hidden="true" size={20} />
              </Link>
              <Link href="/habits/report" aria-label={REPORT_LABELS.title} className={ICON_BUTTON}>
                <BarChart3 aria-hidden="true" size={20} />
              </Link>
            </>
          )}
        </div>
      </div>
      {!isToday && <p className="mt-2 text-sm text-muted">{PAST_DAY_VIEW_ONLY}</p>}
    </div>
  );
}
