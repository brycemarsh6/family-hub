"use client";

import { useEffect, useState, useTransition } from "react";
import { StarRain } from "./StarRain";
import { redeemReward, undoRedeem } from "@/app/actions/rewards";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { celebrationLines, redeemConfirmLines } from "@/lib/rewards/rewardRules";
import type { RewardView } from "@/lib/rewardsRead";
import { REWARD_CANCEL_LABEL, REWARD_DONE_LABEL, REWARD_NEEDS_COST_REFUSAL, REWARD_UNDO_LABEL, redeemButtonText } from "@/lib/rewardVocabulary";

type Redemption = { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: string };

/**
 * Spending a reward, in two steps on one sheet. Step 1 asks ("Redeem Cupcake
 * for Ellie?"); a refusal shows under the button and stays here. Step 2
 * celebrates with falling stars, and offers Done or Undo redeem. The celebration
 * keeps the redemption it was given, so it stays up even when the page behind
 * refreshes and the reward changes or disappears. Only for a reward with a cost.
 */
export function RedeemSheet({ reward, ownerName, bank, onClose }: { reward: RewardView; ownerName: string; bank: number; onClose: () => void }) {
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleRedeem() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await redeemReward(reward.id);
      if ("error" in result) return setError(result.error);
      setRedemption(result.redemption);
    });
  }

  function handleUndo() {
    if (!redemption) return;
    setError(null);
    setUndoing(true);
    startTransition(async () => {
      const result = await undoRedeem(redemption.id);
      if (result.error) {
        setUndoing(false);
        return setError(result.error);
      }
      onClose();
    });
  }

  const heading = redemption ? "Reward redeemed" : "Redeem reward";
  const shownEmoji = redemption ? redemption.emoji : reward.emoji;
  const lines = reward.cost === null ? null : redeemConfirmLines({ title: reward.title, cost: reward.cost }, ownerName, bank);
  const done = redemption ? celebrationLines({ ...redemption, redeemedAt: new Date(redemption.redeemedAt) }, HOUSEHOLD_TIME_ZONE) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <StarRain run={redemption !== null} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col items-center overflow-y-auto rounded-t-2xl bg-surface p-4 text-center shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {shownEmoji && <div className="mt-2 text-[3.5rem] leading-none">{shownEmoji}</div>}

        {done ? (
          <>
            <h2 className="mt-3 text-xl font-semibold">{done.heading}</h2>
            <p className="mt-1 text-base font-semibold">{done.title}</p>
            <p className="mt-1 text-sm text-muted">{done.by}</p>
          </>
        ) : (
          lines ? (
            <>
              <h2 className="mt-3 text-lg font-semibold">{lines.question}</h2>
              <p className="mt-1 text-sm text-muted">{lines.spend}</p>
            </>
          ) : (
            <h2 className="mt-3 text-lg font-semibold">{REWARD_NEEDS_COST_REFUSAL}</h2>
          )
        )}

        <div className="mt-5 flex w-full flex-col gap-2">
          {done ? (
            <>
              <button type="button" onClick={onClose} disabled={pending} className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50">
                {REWARD_DONE_LABEL}
              </button>
              <button type="button" onClick={handleUndo} disabled={pending} className="min-h-12 w-full rounded-xl text-base font-semibold text-muted transition-colors active:bg-surface-2 disabled:opacity-50">
                {undoing ? "Undoing…" : REWARD_UNDO_LABEL}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRedeem}
                disabled={pending || reward.cost === null}
                className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
              >
                {pending ? "Redeeming…" : reward.cost === null ? "Redeem" : redeemButtonText(reward.cost)}
              </button>
              <button type="button" onClick={onClose} disabled={pending} className="min-h-12 w-full rounded-xl text-base font-semibold text-muted transition-colors active:bg-surface-2 disabled:opacity-50">
                {REWARD_CANCEL_LABEL}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
