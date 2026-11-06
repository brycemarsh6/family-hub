"use client";

import { useEffect } from "react";
import { getConfettiDay, setConfettiDay } from "@/lib/confettiSeen";

/**
 * The one celebration (decisions 76 and 99): a burst of confetti, no words and
 * no sound, the first time today this device sees everything required done or
 * skipped. `fire` is the server's flag on load, or the same rule worked out
 * from the tapped rows; `today` is "YYYY-MM-DD" and keys the once-a-day
 * marker. Under reduced motion it never fires. The library is loaded only
 * when it is needed, in the browser only.
 */
export function HabitConfetti({ fire, today }: { fire: boolean; today: string }) {
  useEffect(() => {
    if (!fire || getConfettiDay() === today) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setConfettiDay(today);
    import("canvas-confetti")
      .then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, disableForReducedMotion: true });
      })
      .catch(() => {
        // The celebration is a bonus: a failed download is not worth a message.
      });
  }, [fire, today]);

  return null;
}
