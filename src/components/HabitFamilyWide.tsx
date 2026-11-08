"use client";

import { useEffect, useRef, useState } from "react";
import { HabitFamilyWideColumn } from "./HabitFamilyWideColumn";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";
import { fitsEveryone } from "@/lib/habitsFamilyColumns";

/**
 * The iPad layout of Whole family (from 45rem of room): when every person fits
 * at 220px or more (`fitsEveryone`, measured here) the columns share the width
 * equally; otherwise a strip of 330px person columns that swipes sideways. The page's bar (mission 53) holds the Filter
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
  const root = useRef<HTMLDivElement>(null);
  // Until measured (and while hidden, width 0) the 330px swipe strip shows.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // The strip's gap-3 below is FIT_COLUMN_GAP (12px): the fit rule counts on it, so change them together.
  const fits = fitsEveryone(width, page.columns.length);

  return (
    <div ref={root} data-fills-width className="hidden min-h-0 flex-1 flex-col @min-[45rem]:flex">
      {page.columns.length === 0 ? (
        <p className="text-sm text-muted">No one to show yet.</p>
      ) : (
        <div className={`flex min-h-0 flex-1 gap-3 pb-2 ${fits ? "" : "snap-x snap-mandatory overflow-x-auto"}`}>
          {page.columns.map((column) => (
            <HabitFamilyWideColumn key={column.id} column={column} together={page.together} showStreaks={showStreaks} fits={fits} keep={keep} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
