"use client";

import { useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Type } from "lucide-react";
import { RadioSheet } from "@/components/RadioSheet";
import { saveTextSize } from "@/app/actions/preferences";
import { TEXT_SIZES, TEXT_SIZE_HELP, TEXT_SIZE_LABELS, type TextSize } from "@/lib/textSize";

/**
 * The "Text size" row on /settings and the sheet it opens. Same shape as
 * NavModeSetting: picking a size shows at once and saves in the background; a
 * failed save puts the old choice back and says so under the row. The help
 * line sits under the row because RadioSheet has no slot for it.
 */
export function TextSizeSetting({ textSize }: { textSize: TextSize }) {
  const [optimisticSize, setOptimisticSize] = useOptimistic(textSize);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(next: TextSize) {
    setError(null);
    startTransition(async () => {
      setOptimisticSize(next);
      try {
        const result = await saveTextSize(next);
        setError(result.error ?? null);
      } catch {
        setError("Couldn't save your text size. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left text-base font-medium transition-colors active:bg-surface-2"
      >
        <span className="flex items-center gap-3">
          <Type aria-hidden="true" size={22} className="shrink-0 text-muted" />
          <span className="flex flex-col">
            Text size
            <span className="text-sm font-normal text-muted">{TEXT_SIZE_LABELS[optimisticSize]}</span>
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
      </button>
      <p className="mt-2 text-sm text-muted">{TEXT_SIZE_HELP}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {/* Portaled to the body: Settings' column container would otherwise trap the fixed sheet (STRUCTURE.md Wide pages rule 1). */}
      {open &&
        createPortal(
          <RadioSheet
            title="Text size"
            options={TEXT_SIZES.map((size) => ({ value: size, label: TEXT_SIZE_LABELS[size] }))}
            selected={optimisticSize}
            onSelect={choose}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}
