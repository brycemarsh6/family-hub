"use client";

import { useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Menu } from "lucide-react";
import { RadioSheet } from "@/components/RadioSheet";
import { saveNavMode } from "@/app/actions/preferences";
import { NAV_MODES, NAV_MODE_HELP, NAV_MODE_LABELS, type NavMode } from "@/lib/navMode";

/**
 * The "Menu style" row on /settings and the sheet it opens. Picking an option
 * shows at once and saves in the background; a failed save puts the old choice
 * back and says so under the row (same shape as DashboardWidgetList). The help
 * line sits under the row because RadioSheet has no slot for it.
 */
export function NavModeSetting({ navMode }: { navMode: NavMode }) {
  const [optimisticMode, setOptimisticMode] = useOptimistic(navMode);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(next: NavMode) {
    setError(null);
    startTransition(async () => {
      setOptimisticMode(next);
      try {
        const result = await saveNavMode(next);
        setError(result.error ?? null);
      } catch {
        setError("Couldn't save your menu style. Check your connection and try again.");
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
          <Menu aria-hidden="true" size={22} className="shrink-0 text-muted" />
          <span className="flex flex-col">
            Menu style
            <span className="text-sm font-normal text-muted">{NAV_MODE_LABELS[optimisticMode]}</span>
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
      </button>
      <p className="mt-2 text-sm text-muted">{NAV_MODE_HELP}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {/* Portaled to the body: Settings' column container would otherwise trap the fixed sheet (STRUCTURE.md Wide pages rule 1). */}
      {open &&
        createPortal(
        <RadioSheet
          title="Menu style"
          options={NAV_MODES.map((mode) => ({ value: mode, label: NAV_MODE_LABELS[mode] }))}
          selected={optimisticMode}
          onSelect={choose}
          onClose={() => setOpen(false)}
        />,
          document.body,
        )}
    </div>
  );
}
