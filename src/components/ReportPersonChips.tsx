import Link from "next/link";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

/** The person chips as links, for the Report (decision 165) and Manage (mission 86). They wrap to a second line so the selected chip never scrolls out of view. */
export function ReportPersonChips({ chips, ariaLabel = REPORT_LABELS.personAria }: { chips: { id: string; name: string; selected: boolean; href: string }[]; ariaLabel?: string }) {
  return (
    <nav aria-label={ariaLabel} className="mb-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={chip.href}
          aria-current={chip.selected ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
            chip.selected ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
          }`}
        >
          {chip.name}
        </Link>
      ))}
    </nav>
  );
}
