"use client";

import { useEffect, useState, useTransition } from "react";
import { PinPad } from "./PinPad";
import { StarRain } from "./StarRain";
import { redeemReward, undoRedeem } from "@/app/actions/rewards";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { calendarDateInZone, formatLongCalendarDate } from "@/lib/householdDate";
import type { Gate } from "@/lib/rewardGates";
import { celebrationLines, isWish, redeemConfirmLines } from "@/lib/rewards/rewardRules";
import type { RewardView } from "@/lib/rewardsRead";
import {
  PIN_NOT_SET_HINT,
  PIN_NOT_SET_TITLE,
  PIN_TITLE,
  REWARD_CANCEL_LABEL,
  REWARD_CLOSE_LABEL,
  REWARD_DONE_LABEL,
  REWARD_NEEDS_COST_REFUSAL,
  REWARD_REDEEMED_HEADING,
  REWARD_REDEEMING_LABEL,
  REWARD_REDEEM_HEADING,
  REWARD_REDEEM_LABEL,
  REWARD_UNDOING_LABEL,
  REWARD_UNDO_LABEL,
  pinRedeemText,
  redeemButtonText,
} from "@/lib/rewardVocabulary";

type Redemption = { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: string };

/**
 * Spending a reward, in two steps on one sheet. Step 1 asks ("Redeem Cupcake
 * for Ellie?"); a refusal shows under the button and stays here. The `gate`
 * (from rewardGates) says how: `open` is the confirm button, `pin` opens
 * straight on the PIN pad (the 4th digit redeems), `noPin` says a parent must
 * set a PIN first. Step 2 celebrates with falling stars, and offers Done or Undo redeem. The celebration
 * keeps the redemption it was given, so it stays up even when the page behind
 * refreshes and the reward changes or disappears. Only for a reward with a cost.
 */
export function RedeemSheet({ reward, ownerName, bank, gate, onClose }: { reward: RewardView; ownerName: string; bank: number; gate: Gate; onClose: () => void }) {
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [undoing, setUndoing] = useState(false);
  // The pad's answers: how long a lock has left, whether the server says no PIN is set, and whether it asked for one
  // (the gate may be a moment old: the switch can be turned on after the page loaded).
  const [lockMs, setLockMs] = useState<number | null>(null);
  const [notSet, setNotSet] = useState(false);
  const [pinAsked, setPinAsked] = useState(false);

  // A redeem in flight is not stopped by a stray tap or Escape; after it lands the celebration may close freely.
  const close = () => {
    if (pending && !redemption) return;
    onClose();
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handleRedeem(pin?: string) {
    if (pending) return;
    // On the pad the old answer stays until the new one lands, so the dots are not wiped mid-call.
    if (pin === undefined) setError(null);
    startTransition(async () => {
      const result = await redeemReward(reward.id, pin);
      if ("error" in result) {
        if (result.pin === "notSet") setNotSet(true);
        if (result.pin === "needed" || result.pin === "wrong" || result.pin === "locked") setPinAsked(true);
        setLockMs(result.pin === "locked" ? (result.lockMs ?? null) : null);
        // The pad speaks for a PIN that is needed or locked; only a wrong PIN or a plain refusal needs a line.
        return setError(result.pin === "needed" || result.pin === "locked" ? null : result.error);
      }
      // A wrong PIN's words must not follow the pad into the celebration.
      setError(null);
      setLockMs(null);
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

  const needsPin = !redemption && (gate === "pin" || pinAsked) && !notSet;
  const noPin = !redemption && (gate === "noPin" || notSet);
  const heading = redemption ? REWARD_REDEEMED_HEADING : needsPin || noPin ? PIN_TITLE : REWARD_REDEEM_HEADING;
  const shownEmoji = redemption ? redemption.emoji : reward.emoji;
  const lines = typeof reward.cost === "number" ? redeemConfirmLines({ title: reward.title, cost: reward.cost }, ownerName, bank) : null;
  const done = redemption ? celebrationLines(redemption, formatLongCalendarDate(calendarDateInZone(new Date(redemption.redeemedAt), HOUSEHOLD_TIME_ZONE))) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label={REWARD_CLOSE_LABEL} onClick={close} className="absolute inset-0 bg-black/40" />
      <StarRain run={redemption !== null} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col items-center overflow-y-auto rounded-t-2xl bg-surface p-4 text-center shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {shownEmoji && !needsPin && !noPin && <div className="mt-2 text-[3.5rem] leading-none">{shownEmoji}</div>}

        {needsPin ? (
          <PinPad
            heading={PIN_TITLE}
            prompt={pinRedeemText(reward.title, ownerName)}
            onComplete={handleRedeem}
            onCancel={onClose}
            error={error}
            lockMs={lockMs}
            busy={pending}
          />
        ) : noPin ? (
          <>
            <h2 className="mt-3 text-lg font-semibold">{PIN_NOT_SET_TITLE}</h2>
            <p className="mt-1 text-sm text-muted">{PIN_NOT_SET_HINT}</p>
            <div className="mt-5 flex w-full flex-col gap-2">
              <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80">
                {REWARD_CLOSE_LABEL}
              </button>
            </div>
          </>
        ) : (
          <>
            {done ? (
              <>
                <h2 className="mt-3 text-xl font-semibold">{done.heading}</h2>
                <p className="mt-1 text-base font-semibold">{done.title}</p>
                <p className="mt-1 text-sm text-muted">{done.by}</p>
              </>
            ) : lines ? (
              <>
                <h2 className="mt-3 text-lg font-semibold">{lines.question}</h2>
                <p className="mt-1 text-sm text-muted">{lines.spend}</p>
              </>
            ) : (
              <h2 className="mt-3 text-lg font-semibold">{REWARD_NEEDS_COST_REFUSAL}</h2>
            )}

            <div className="mt-5 flex w-full flex-col gap-2">
              {done ? (
                <>
                  <button type="button" onClick={onClose} disabled={pending} className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50">
                    {REWARD_DONE_LABEL}
                  </button>
                  <button type="button" onClick={handleUndo} disabled={pending} className="min-h-12 w-full rounded-xl text-base font-semibold text-muted transition-colors active:bg-surface-2 disabled:opacity-50">
                    {undoing ? REWARD_UNDOING_LABEL : REWARD_UNDO_LABEL}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleRedeem()}
                    disabled={pending || isWish(reward)}
                    className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
                  >
                    {pending ? REWARD_REDEEMING_LABEL : typeof reward.cost === "number" ? redeemButtonText(reward.cost) : REWARD_REDEEM_LABEL}
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
          </>
        )}
      </div>
    </div>
  );
}
