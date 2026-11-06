"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Flame, RefreshCw } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { saveShowStreaks } from "@/app/actions/preferences";
import { recomputeAllStreaks } from "@/app/actions/habits";

/**
 * The "Habits & Chores" section on /settings: a "Show streaks" switch for
 * every account, and an admin-only "Recompute streaks" button. The switch
 * shows at once and saves in the background; a failed save puts the old
 * value back and says so under the row (same shape as NavModeSetting).
 */
export function HabitsChoresSettings({
  showStreaks,
  isAdmin,
}: {
  showStreaks: boolean;
  isAdmin: boolean;
}) {
  const [optimisticShow, setOptimisticShow] = useOptimistic(showStreaks);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimisticShow(next);
      try {
        const result = await saveShowStreaks(next);
        setError(result.error ?? null);
      } catch {
        setError("Couldn't save your streak setting. Check your connection and try again.");
      }
    });
  }

  async function recompute() {
    setRecomputing(true);
    setRecomputeMessage(null);
    setRecomputeError(null);
    try {
      const result = await recomputeAllStreaks();
      if (result.error) setRecomputeError(result.error);
      else {
        const count = result.habits ?? 0;
        setRecomputeMessage(`Rechecked ${count} ${count === 1 ? "habit" : "habits"}`);
      }
    } catch {
      setRecomputeError("Couldn't recompute streaks. Check your connection and try again.");
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Habits &amp; Chores</h2>

      <div className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium">
        <span className="flex items-center gap-3">
          <Flame aria-hidden="true" size={22} className="shrink-0 text-muted" />
          Show streaks
        </span>
        <ToggleSwitch checked={optimisticShow} onChange={toggle} label="Show streaks" />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {isAdmin && (
        <>
          <button
            type="button"
            onClick={recompute}
            disabled={recomputing}
            className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-left text-base font-medium transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            <RefreshCw aria-hidden="true" size={22} className="shrink-0 text-muted" />
            Recompute streaks
          </button>
          {recomputeMessage && (
            <p role="status" className="mt-2 text-sm text-muted">
              {recomputeMessage}
            </p>
          )}
          {recomputeError && (
            <p role="alert" className="mt-2 text-sm text-warn">
              {recomputeError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
