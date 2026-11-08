"use client";

import { HabitFamilyWideColumn } from "./HabitFamilyWideColumn";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";

/**
 * The iPad layout of Whole family (768px and up): a strip of 330px person
 * columns that swipes sideways. The page's bar (mission 51) holds the Filter
 * and the Report; this is only the strip. It fills the height left on the
 * screen, so the page itself never scrolls; each column scrolls on its own.
 * `data-fills-width` tells the app chrome to lift its 768px cap and bottom
 * padding for this page.
 */
export function HabitFamilyWide({
  page,
  showStreaks,
  keep,
  onToggle,
}: {
  page: FamilyPage;
  showStreaks: boolean;
  /** The Filter sheet's test: whether a row shows. The count above each column is always the whole day. */
  keep: (row: FamilyRow) => boolean;
  onToggle: (row: FamilyRow) => void;
}) {
  return (
    <div data-fills-width className="hidden min-h-0 flex-1 flex-col md:flex">
      {page.columns.length === 0 ? (
        <p className="text-sm text-muted">No one to show yet.</p>
      ) : (
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2">
          {page.columns.map((column) => (
            <HabitFamilyWideColumn key={column.id} column={column} together={page.together} showStreaks={showStreaks} keep={keep} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
