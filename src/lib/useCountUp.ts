"use client";

import { useEffect, useState } from "react";
import { COUNT_MS, countUpValue } from "./rewards/starMotion";

// The star bank's number climbing once the stars land (mission 80). `target`
// is always the real number (the `stars` prop, from `shownBanks`); this only
// decides what to show on the way there. `startAt` is a `performance.now()`
// time: when the stars land, or null when nothing is flying.
//
// With no landing pending the target comes back in the same render, so the
// bank behaves exactly as in R1 (no frame of an old number): under Reduce
// Motion or with the switch off no landing is ever set. An increase with a
// landing holds the old number until `startAt`, then steps up over `COUNT_MS`.
// A decrease, or an increase with no landing, shows at once and stops any count.

type Count = { from: number; to: number; startAt: number };

export function useCountUp(target: number, startAt: number | null): number {
  const [prevTarget, setPrevTarget] = useState(target);
  const [count, setCount] = useState<Count | null>(null);
  const [shown, setShown] = useState(target);

  // Worked out while rendering, in the same pass as the new target, so the new number never shows early.
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target > prevTarget && startAt !== null) {
      const from = count ? shown : prevTarget;
      setShown(from);
      setCount({ from, to: target, startAt });
    } else {
      setCount(null);
    }
  }

  useEffect(() => {
    if (!count) return;
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - count.startAt;
      setShown(countUpValue(count.from, count.to, elapsed, COUNT_MS));
      if (elapsed >= COUNT_MS) setCount(null);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count]);

  return count ? shown : target;
}
