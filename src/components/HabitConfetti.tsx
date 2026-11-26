"use client";

import { useEffect, useState } from "react";
import { getConfettiDay, setConfettiDay } from "@/lib/confettiSeen";
import { ALL_DONE_LINE } from "@/lib/habitVocabulary";
import { ALL_DONE_WORDS_MS, CONFETTI_Z_INDEX } from "@/lib/rewards/starMotion";
import { useCelebrations } from "./StarFlightLayer";

/**
 * The one celebration (decisions 76 and 99, the words added in mission 80): a
 * burst of confetti and a centred pill saying `ALL_DONE_LINE`, no sound, the
 * first time today this device sees everything required done or skipped.
 * `fire` is the server's flag on load, or the same rule worked out from the
 * tapped rows; `today` is "YYYY-MM-DD" and keys the once-a-day marker. With the
 * Celebrations switch off nothing happens and no marker is set. Under reduced
 * motion there is no confetti, but the words still show (they do not move) and
 * the marker is set. The pill goes after 3 seconds and never takes taps. The
 * library is loaded only when it is needed, in the browser only.
 */
export function HabitConfetti({ fire, today }: { fire: boolean; today: string }) {
  const celebrate = useCelebrations();
  const [showWords, setShowWords] = useState(false);

  useEffect(() => {
    if (!celebrate || !fire || getConfettiDay() === today) return;
    setConfettiDay(today);
    // A tick later, not in the effect itself: the pill appears as a result of the browser-only marker check.
    // Not cleared on cleanup: the marker is already set, so a re-run (Strict Mode's second pass) would not show it again.
    window.setTimeout(() => setShowWords(true), 0);
    // Read here, not from the hook: the hook's first value on a fresh load is the server's guess (false).
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      import("canvas-confetti")
        .then(({ default: confetti }) => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, zIndex: CONFETTI_Z_INDEX, disableForReducedMotion: true });
        })
        .catch(() => {
          // The celebration is a bonus: a failed download is not worth a message.
        });
    }
  }, [celebrate, fire, today]);

  useEffect(() => {
    if (!showWords) return;
    const hide = window.setTimeout(() => setShowWords(false), ALL_DONE_WORDS_MS);
    return () => window.clearTimeout(hide);
  }, [showWords]);

  if (!showWords) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
      <p role="status" className="rounded-full bg-fg px-6 py-3 text-center text-xl font-bold text-bg">
        {ALL_DONE_LINE}
      </p>
    </div>
  );
}
