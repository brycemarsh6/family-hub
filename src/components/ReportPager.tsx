import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

const ARROW = "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors";

/** One arrow: a link, or a dimmed span when the period stops there (the earliest start, or the current period). */
function Arrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} aria-label={label} className={`${ARROW} active:bg-surface-2`}>
      {children}
    </Link>
  ) : (
    <span aria-label={label} aria-disabled="true" className={`${ARROW} opacity-40`}>
      {children}
    </span>
  );
}

/**
 * The Report's pager (decisions 166 to 168), laid out like the Calendar's
 * header: 44px arrows around the title. A pill beside the title jumps back to
 * the current period when a past one is shown. Every address is built by the
 * page, so paging is plain navigation.
 */
export function ReportPager({
  view,
  title,
  prevHref,
  nextHref,
  pill,
}: {
  view: "week" | "month" | "year";
  title: string;
  prevHref: string | null;
  nextHref: string | null;
  pill: { label: string; href: string } | null;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <Arrow href={prevHref} label={REPORT_LABELS.previous[view]}>
        <ChevronLeft aria-hidden="true" size={22} />
      </Arrow>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {pill && (
          <Link href={pill.href} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted-strong">
            {pill.label}
          </Link>
        )}
      </div>
      <Arrow href={nextHref} label={REPORT_LABELS.next[view]}>
        <ChevronRight aria-hidden="true" size={22} />
      </Arrow>
    </div>
  );
}
