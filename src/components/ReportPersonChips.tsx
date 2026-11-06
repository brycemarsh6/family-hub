import Link from "next/link";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

/** Whose Report (decision 165): the chore chart's person chips, as links. Parents and admins only. */
export function ReportPersonChips({ chips }: { chips: { id: string; name: string; selected: boolean; href: string }[] }) {
  return (
    <nav aria-label={REPORT_LABELS.personAria} className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
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
