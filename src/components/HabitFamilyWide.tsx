"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, ListFilter } from "lucide-react";
import { ALL_FILTER, HabitFilterChips, activeFilter, buildFilterOptions, matchesFilter } from "./HabitFilterChips";
import { HabitFamilyWideColumn } from "./HabitFamilyWideColumn";
import { REPORT_LABELS } from "@/lib/habitVocabulary";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";

/**
 * The iPad layout of Whole family (768px and up): a toolbar (Filter, and Report
 * for someone who can manage), then a strip of 330px person columns that swipes
 * sideways. It fills the height left on the screen, so the page itself never
 * scrolls; each column scrolls on its own. `data-fills-width` tells the app
 * chrome to lift its 768px cap and bottom padding for this page.
 */
export function HabitFamilyWide({
  page,
  showStreaks,
  canManage,
  onToggle,
}: {
  page: FamilyPage;
  showStreaks: boolean;
  canManage: boolean;
  onToggle: (row: FamilyRow) => void;
}) {
  const [filtering, setFiltering] = useState(false);
  const [filter, setFilter] = useState(ALL_FILTER);
  // One chip for every column; its options come from every row on the page, Together included.
  const everyRow = [...page.columns.flatMap((column) => column.rows), ...page.together];
  const options = buildFilterOptions(everyRow);
  const active = activeFilter(options, filter);

  return (
    <div data-fills-width className="hidden min-h-0 flex-1 flex-col md:flex">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltering((on) => !on)}
          aria-pressed={filtering}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
            filtering ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface"
          }`}
        >
          <ListFilter aria-hidden="true" size={18} />
          Filter
        </button>
        {canManage && (
          <Link href="/habits/report" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold">
            <BarChart3 aria-hidden="true" size={18} />
            {REPORT_LABELS.title}
          </Link>
        )}
      </div>
      {filtering && options.length > 1 && <HabitFilterChips options={options} value={active} onChange={setFilter} className="mb-3 shrink-0" />}
      {page.columns.length === 0 ? (
        <p className="text-sm text-muted">No one to show yet.</p>
      ) : (
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2">
          {page.columns.map((column) => (
            <HabitFamilyWideColumn
              key={column.id}
              column={column}
              together={page.together}
              showStreaks={showStreaks}
              keep={(row) => matchesFilter(row, active)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
