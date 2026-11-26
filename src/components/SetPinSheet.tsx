"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { PinPad } from "./PinPad";
import { setRewardPin } from "@/app/actions/rewardSettings";
import { SAVE_FAILED } from "@/lib/useOptimisticRun";
import { PIN_CONFIRM_HEADING, PIN_MISMATCH, PIN_SHEET_HEADING, PIN_SHEET_HINT } from "@/lib/rewardVocabulary";

/**
 * "Set a new PIN" (parents and admins, from the Parent PIN card): pick 4
 * digits, then "Enter it again". A mismatch starts over; a match calls
 * `setRewardPin` and closes with `onSaved`. The first PIN is kept in memory
 * only until the second is typed. Backdrop and Escape do nothing while the
 * save is in flight.
 */
export function SetPinSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  // The sheet is portaled to document.body, which only exists in the browser (NavDrawer's pattern).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped to remount the pad for a fresh step.
  const [round, setRound] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  function handleComplete(pin: string) {
    if (first === null) {
      setFirst(pin);
      setError(null);
      setRound((current) => current + 1);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError(PIN_MISMATCH);
      setRound((current) => current + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await setRewardPin(pin);
        if (result.error) {
          setFirst(null);
          setError(result.error);
          setRound((current) => current + 1);
          return;
        }
        onSaved();
      } catch {
        setFirst(null);
        setError(SAVE_FAILED);
        setRound((current) => current + 1);
      }
    });
  }

  const sheet = (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" disabled={pending} onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={PIN_SHEET_HEADING}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <PinPad
          key={round}
          heading={first === null ? PIN_SHEET_HEADING : PIN_CONFIRM_HEADING}
          prompt={first === null ? PIN_SHEET_HINT : undefined}
          onComplete={handleComplete}
          onCancel={onClose}
          error={error}
          busy={pending}
        />
      </div>
    </div>
  );

  return mounted ? createPortal(sheet, document.body) : null;
}
