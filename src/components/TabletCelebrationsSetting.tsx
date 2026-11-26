"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { saveTabletCelebrations } from "@/app/actions/preferences";
import { CELEBRATIONS_WORDS } from "@/lib/rewardVocabulary";

/**
 * The tablet's "Celebrations" switch, at the top of the Wall tablet page next
 * to its start page. It shows at once and saves in the background (written on
 * every device login); a failed save puts the old value back and says so
 * under the row (same shape as HabitsChoresSettings).
 */
export function TabletCelebrationsSetting({ celebrations }: { celebrations: boolean }) {
  const [optimisticOn, setOptimisticOn] = useOptimistic(celebrations);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimisticOn(next);
      try {
        const result = await saveTabletCelebrations(next);
        setError(result.error ?? null);
      } catch {
        setError(CELEBRATIONS_WORDS.saveError);
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium">
        <span className="flex items-center gap-3">
          <Sparkles aria-hidden="true" size={22} className="shrink-0 text-muted" />
          <span className="flex flex-col">
            {CELEBRATIONS_WORDS.title}
            <span className="text-sm font-normal text-muted">{CELEBRATIONS_WORDS.sub}</span>
          </span>
        </span>
        <ToggleSwitch checked={optimisticOn} onChange={toggle} label={CELEBRATIONS_WORDS.title} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
