"use client";

import { useOptimistic } from "react";
import { Star } from "lucide-react";
import { saveLateStars } from "@/app/actions/rewardSettings";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import {
  LATE_STARS,
  LATE_STARS_HELP,
  LATE_STARS_LABELS,
  LATE_STARS_TITLE,
  REWARDS_SETTINGS_TITLE,
  type LateStars,
} from "@/lib/rewardVocabulary";

/**
 * The "Rewards" section on /settings (parents and admins): the "Late checks"
 * card, three tiles for what a late check pays. A tap lights the tile at once
 * and saves in the background; a failed save puts the old one back and says
 * so under the tiles (same shape as TextSizeSetting).
 */
export function RewardsSettings({ lateStars }: { lateStars: LateStars }) {
  const [optimisticChoice, setOptimisticChoice] = useOptimistic(lateStars);
  const { run, error } = useOptimisticRun<LateStars>(setOptimisticChoice);

  function choose(next: LateStars) {
    if (next === optimisticChoice) return;
    run(next, () => saveLateStars(next));
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{REWARDS_SETTINGS_TITLE}</h2>

      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3 text-base font-medium">
          <Star aria-hidden="true" size={22} className="shrink-0 text-muted" />
          {LATE_STARS_TITLE}
        </div>
        <div role="radiogroup" aria-label={LATE_STARS_TITLE} className="mt-3 grid grid-cols-3 gap-2">
          {LATE_STARS.map((choice) => {
            const selected = choice === optimisticChoice;
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(choice)}
                className={`flex min-h-12 items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-medium transition-colors active:bg-surface-2 ${
                  selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"
                }`}
              >
                {LATE_STARS_LABELS[choice]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted">{LATE_STARS_HELP}</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-warn">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
