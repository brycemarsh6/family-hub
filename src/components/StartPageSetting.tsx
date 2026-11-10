"use client";

import { useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, House } from "lucide-react";
import { RadioSheet } from "@/components/RadioSheet";
import { saveStartPage, saveTabletStartPage } from "@/app/actions/preferences";
import { START_PAGE_OPTIONS, START_PAGE_WORDS, startPageLabel } from "@/lib/startPage";

/**
 * The "Open Marshee on" row and the sheet it opens, on /settings (your own
 * start page) and at the top of the Wall tablet page (`forTablet`: the tablet's
 * start page, where a tap on the slideshow or the black screen goes). Picking a
 * page shows at once and saves in the background; a failed save puts the old
 * choice back and says so under the row (same shape as NavModeSetting). The
 * help line sits under the row because RadioSheet has no slot for it.
 */
export function StartPageSetting({ startPage, forTablet }: { startPage: string; forTablet: boolean }) {
  const [optimisticPage, setOptimisticPage] = useOptimistic(startPage);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(next: string) {
    setError(null);
    startTransition(async () => {
      setOptimisticPage(next);
      try {
        const result = await (forTablet ? saveTabletStartPage(next) : saveStartPage(next));
        setError(result.error ?? null);
      } catch {
        setError(START_PAGE_WORDS.saveError);
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
          <House aria-hidden="true" size={22} className="shrink-0 text-muted" />
          <span className="flex flex-col">
            {START_PAGE_WORDS.label}
            <span className="text-sm font-normal text-muted">{startPageLabel(optimisticPage)}</span>
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
      </button>
      <p className="mt-2 text-sm text-muted">{forTablet ? START_PAGE_WORDS.helpTablet : START_PAGE_WORDS.helpSelf}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {/* Portaled to the body: the page's column container would otherwise trap the fixed sheet (STRUCTURE.md Wide pages rule 1). */}
      {open &&
        createPortal(
          <RadioSheet
            title={START_PAGE_WORDS.label}
            options={START_PAGE_OPTIONS.map((option) => ({ value: option.href, label: option.label }))}
            selected={optimisticPage}
            onSelect={choose}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}
