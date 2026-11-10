"use client";

import { useEffect, useOptimistic, useRef } from "react";
import { Type } from "lucide-react";
import { saveTextSize } from "@/app/actions/preferences";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import {
  TEXT_SIZES,
  TEXT_SIZE_HELP,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_PREVIEW_REM,
  type TextSize,
} from "@/lib/textSize";

/** Resizes the page at once; the layout's server render says the same thing after the save. */
function showTextSize(size: TextSize) {
  document.documentElement.dataset.textSize = size;
}

/**
 * The "Text size" card on /settings: three "Aa" tiles in a row, each drawn at
 * the size it gives. A tap resizes the page at once (the data-text-size
 * attribute on <html>) and saves in the background; a failed save puts the old
 * size back and says so under the tiles.
 */
export function TextSizeSetting({ textSize }: { textSize: TextSize }) {
  const [optimisticSize, setOptimisticSize] = useOptimistic(textSize);
  const { run, error } = useOptimisticRun<TextSize>(setOptimisticSize);

  // The latest server-confirmed size, so a save that fails after an earlier
  // one succeeded rolls back to what is really saved, not to a stale render.
  const savedRef = useRef(textSize);
  useEffect(() => {
    savedRef.current = textSize;
  }, [textSize]);

  // Safety net: <html> always ends equal to the selected tile, including
  // after a failed save rolls the optimistic value back to the saved prop.
  useEffect(() => {
    showTextSize(optimisticSize);
  }, [optimisticSize]);

  function choose(next: TextSize) {
    if (next === optimisticSize) return;
    showTextSize(next);
    run(next, async () => {
      try {
        const result = await saveTextSize(next);
        if (result.error) showTextSize(savedRef.current);
        return result;
      } catch (err) {
        showTextSize(savedRef.current);
        throw err;
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3 text-base font-medium">
        <Type aria-hidden="true" size={22} className="shrink-0 text-muted" />
        Text size
      </div>
      <div role="radiogroup" aria-label="Text size" className="mt-3 grid grid-cols-3 gap-2">
        {TEXT_SIZES.map((size) => {
          const selected = size === optimisticSize;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(size)}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 transition-colors active:bg-surface-2 ${
                selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"
              }`}
            >
              <span aria-hidden="true" className="font-medium leading-none" style={{ fontSize: `${TEXT_SIZE_PREVIEW_REM[size]}rem` }}>
                Aa
              </span>
              <span className="text-sm font-normal text-muted-strong">{TEXT_SIZE_LABELS[size]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">{TEXT_SIZE_HELP}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
