"use client";

import { useOptimistic, useState } from "react";
import { KeyRound, Star } from "lucide-react";
import { SetPinSheet } from "./SetPinSheet";
import { ToggleSwitch } from "./ToggleSwitch";
import { saveLateStars, saveRewardPinRequired } from "@/app/actions/rewardSettings";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import {
  LATE_STARS,
  LATE_STARS_HELP,
  LATE_STARS_LABELS,
  LATE_STARS_TITLE,
  PIN_CHANGE_LABEL,
  PIN_HELP,
  PIN_HELP_OFF,
  PIN_IS_SET,
  PIN_NOT_SET,
  PIN_SAVED,
  PIN_SET_LABEL,
  PIN_SWITCH_LABEL,
  PIN_TITLE,
  REWARDS_SETTINGS_TITLE,
  type LateStars,
} from "@/lib/rewardVocabulary";

/**
 * The "Rewards" section on /settings (parents and admins): the "Late checks"
 * card, three tiles for what a late check pays. A tap lights the tile at once
 * and saves in the background; a failed save puts the old one back and says
 * so under the tiles (same shape as TextSizeSetting). The "Parent PIN" card
 * below it holds the "Ask for the PIN" switch (same optimistic shape) and
 * opens SetPinSheet; the PIN itself never comes to this page, only whether
 * one is set.
 */
export function RewardsSettings({
  lateStars,
  pinStatus,
}: {
  lateStars: LateStars;
  pinStatus: { pinSet: boolean; pinRequired: boolean };
}) {
  const [optimisticChoice, setOptimisticChoice] = useOptimistic(lateStars);
  const { run, error } = useOptimisticRun<LateStars>(setOptimisticChoice);
  const [optimisticRequired, setOptimisticRequired] = useOptimistic(pinStatus.pinRequired);
  const { run: runRequired, error: requiredError } = useOptimisticRun<boolean>(setOptimisticRequired);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function choose(next: LateStars) {
    if (next === optimisticChoice) return;
    run(next, () => saveLateStars(next));
  }

  function toggleRequired(next: boolean) {
    setSaved(false);
    runRequired(next, () => saveRewardPinRequired(next));
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

      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3 text-base font-medium">
          <KeyRound aria-hidden="true" size={22} className="shrink-0 text-muted" />
          {PIN_TITLE}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-base">{PIN_SWITCH_LABEL}</span>
          <ToggleSwitch checked={optimisticRequired} onChange={toggleRequired} label={PIN_SWITCH_LABEL} />
        </div>
        <p className="text-sm text-muted">{optimisticRequired ? PIN_HELP : PIN_HELP_OFF}</p>
        {requiredError && (
          <p role="alert" className="mt-2 text-sm text-warn">
            {requiredError}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-base font-semibold">{pinStatus.pinSet ? PIN_IS_SET : PIN_NOT_SET}</span>
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setSheetOpen(true);
            }}
            className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
          >
            {pinStatus.pinSet ? PIN_CHANGE_LABEL : PIN_SET_LABEL}
          </button>
        </div>
        {saved && (
          <p role="status" className="mt-2 text-sm text-muted">
            {PIN_SAVED}
          </p>
        )}
      </div>

      {sheetOpen && (
        <SetPinSheet
          onClose={() => setSheetOpen(false)}
          onSaved={() => {
            setSheetOpen(false);
            setSaved(true);
          }}
        />
      )}
    </section>
  );
}
