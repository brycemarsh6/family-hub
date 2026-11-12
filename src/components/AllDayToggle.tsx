"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { ALL_DAY_COLLAPSE_LABEL, ALL_DAY_EXPAND_LABEL } from "@/lib/calendarViewVocabulary";

// The chevron that opens and closes every lane of the all-day row (mission
// 73). A plain onClick button: nothing here competes with the calendar's
// gesture machine. 44px square, the floor for a compact secondary control
// (DESIGN.md). The caller decides when to render it (only while something is
// hidden, or while open).
export function AllDayToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? ALL_DAY_COLLAPSE_LABEL : ALL_DAY_EXPAND_LABEL}
      className="flex h-11 w-[min(2.75rem,48px)] shrink-0 items-center justify-center rounded-full text-fg"
    >
      <Icon aria-hidden="true" size={20} />
    </button>
  );
}
