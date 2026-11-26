"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { PIN_LENGTH, pinMinutesFromMs } from "@/lib/rewards/pinPolicy";
import { PIN_DELETE_DIGIT_LABEL, PIN_LOCKED_TITLE, REWARD_CANCEL_LABEL, pinDigitsEnteredText, pinLockedText } from "@/lib/rewardVocabulary";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const KEY = "flex h-[3.75rem] w-[4.5rem] items-center justify-center rounded-2xl text-2xl font-semibold transition-colors disabled:opacity-35";

/**
 * The 4 digit PIN pad (mission 82). It only draws and collects digits: it
 * calls `onComplete(pin)` the moment the 4th is tapped and knows no action, so
 * Settings' SetPinSheet and the Rewards sheets (C3) all reuse it. The PIN is
 * held in memory only (never a text input, a URL or storage). The 4th dot
 * stays filled while a `busy` call runs; the dots clear when `error` or
 * `lockMs` changes or the call ends (a wrong PIN), and the caller may remount
 * it with a `key` for a fresh step. While `lockMs` runs the keys grey out and
 * the minutes count down; when it ends the keys come back, the timer stops and
 * a stale error line is hidden. `cancelLabel` is the button's words ("Close"
 * on a locked pad, "Cancel" otherwise).
 */
export function PinPad({
  heading,
  prompt,
  onComplete,
  onCancel,
  cancelLabel = REWARD_CANCEL_LABEL,
  error,
  lockMs,
  busy = false,
}: {
  heading: string;
  prompt?: string;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  error?: string | null;
  /** Milliseconds a lock has left, as the server just reported it. */
  lockMs?: number | null;
  busy?: boolean;
}) {
  const [digits, setDigits] = useState("");
  // The moment the lock ends, and a clock that ticks while it runs.
  const [lockEnd, setLockEnd] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // A new answer from the server (wrong PIN, a lock) or the call ending wipes the dots.
  const [seen, setSeen] = useState({ error, lockMs, busy });
  if (seen.error !== error || seen.lockMs !== lockMs || seen.busy !== busy) {
    setSeen({ error, lockMs, busy });
    // Starting a call keeps the dots (the 4th stays lit); a new answer or the call ending wipes them.
    if (seen.error !== error || seen.lockMs !== lockMs || (seen.busy && !busy)) setDigits("");
    // A new lock (or none) starts its own clock.
    if (seen.lockMs !== lockMs) setLockEnd(null);
  }

  useEffect(() => {
    if (!lockMs || lockMs <= 0) return;
    const end = Date.now() + lockMs;
    // Set from timer callbacks, never straight in the effect body.
    const tick = () => {
      setLockEnd(end);
      setNow(Date.now());
      if (Date.now() >= end) window.clearInterval(timer);
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [lockMs]);

  const locked = lockEnd !== null && now < lockEnd;
  // A lock this pad showed has run out: its "Too many wrong tries." must not stay under live keys.
  const lockRanOut = lockEnd !== null && !locked;
  const disabled = busy || locked;

  function tap(digit: string) {
    if (disabled || digits.length >= PIN_LENGTH) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  }

  function backspace() {
    if (disabled) return;
    setDigits((current) => current.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-center text-lg font-semibold">{heading}</h2>
      {prompt && <p className="mt-1 text-center text-sm text-muted">{prompt}</p>}

      <div role="img" aria-label={pinDigitsEnteredText(digits.length, PIN_LENGTH)} className="my-4 flex gap-3">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`h-4 w-4 rounded-full border-2 ${index < digits.length ? "border-accent bg-accent" : "border-muted bg-transparent"}`}
          />
        ))}
      </div>

      {locked && lockEnd !== null ? (
        <div role="alert" className="mb-2 rounded-xl bg-warn-soft px-3 py-2 text-center text-sm text-warn">
          <p className="font-semibold">{PIN_LOCKED_TITLE}</p>
          <p>{pinLockedText(pinMinutesFromMs(lockEnd - now))}</p>
        </div>
      ) : (
        error &&
        !lockRanOut && (
          <p role="alert" className="mb-2 text-center text-sm text-warn">
            {error}
          </p>
        )
      )}

      <div className="my-2 grid grid-cols-3 justify-center gap-2.5">
        {KEYS.map((digit) => (
          <button key={digit} type="button" disabled={disabled} onClick={() => tap(digit)} className={`${KEY} bg-surface-2 text-fg active:bg-line`}>
            {digit}
          </button>
        ))}
        <span aria-hidden="true" />
        <button type="button" disabled={disabled} onClick={() => tap("0")} className={`${KEY} bg-surface-2 text-fg active:bg-line`}>
          0
        </button>
        <button type="button" disabled={disabled || digits.length === 0} onClick={backspace} aria-label={PIN_DELETE_DIGIT_LABEL} className={`${KEY} text-muted active:bg-surface-2`}>
          <Delete aria-hidden="true" size={24} />
        </button>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="mt-2 flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-medium text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
}
