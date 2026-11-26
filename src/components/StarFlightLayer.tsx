"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { FLIGHT_EASING, FLIGHT_MS, RING_RADIUS_REM, RING_STARS, STAGGER_MS, flightKeyframes, landingClearsAfterMs, landsAfterMs, ringOffsets, type Point } from "@/lib/rewards/starMotion";

// The star flight (mission 80): the only place stars are animated. A paying
// check calls `fly(button, payments)` before it saves; a ring of gold stars
// pops out round the button and flies into that person's star bank (found by
// `data-star-bank`), or pops in place when no bank is on screen. The layer
// never takes taps (pointer-events-none), so a second tap mid-flight works.
// Rules: docs/structure/rewards.md, "The star flight".

/** `payments` is per person: positive pays (flies), negative takes back (cancels what is in the air). */
export type StarFlight = (from: HTMLElement | null, payments: Record<string, number>) => void;

const CelebrationsContext = createContext(true);
const FlightContext = createContext<StarFlight>(() => {});
const LandingContext = createContext<Record<string, number>>({});

/** The per-login Celebrations switch (Reduce Motion is read separately, and always wins). */
export function useCelebrations(): boolean {
  return useContext(CelebrationsContext);
}

export function useStarFlight(): StarFlight {
  return useContext(FlightContext);
}

/** When this person's count-up starts (a `performance.now()` time), or null when no stars are flying to them. */
export function useStarLanding(userId: string): number | null {
  return useContext(LandingContext)[userId] ?? null;
}

type FlightStar = { key: number; userId: string; from: Point; to: Point | null; offset: Point; index: number };

/** The centre of this person's star bank when one is on screen with a box (the hidden family layout has none), else null. */
function bankPoint(userId: string): Point | null {
  for (const el of document.querySelectorAll<HTMLElement>("[data-star-bank]")) {
    if (el.dataset.starBank !== userId) continue;
    const rect = el.getBoundingClientRect();
    const onScreen = rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    if (onScreen) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return null;
}

function FlightStarView({ star, onDone }: { star: FlightStar; onDone: (key: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animation = el.animate(flightKeyframes(star.from, star.to, star.offset), { duration: FLIGHT_MS, delay: star.index * STAGGER_MS, fill: "both", easing: FLIGHT_EASING });
    animation.onfinish = () => onDone(star.key);
    return () => animation.cancel();
  }, [star, onDone]);
  return (
    <span ref={ref} style={{ left: star.from.x, top: star.from.y, opacity: 0 }} className="absolute -ml-2.5 -mt-2.5 block h-5 w-5">
      <Star aria-hidden="true" fill="currentColor" className="h-5 w-5 text-star" />
    </span>
  );
}

export function StarFlightLayer({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [stars, setStars] = useState<FlightStar[]>([]);
  const [landings, setLandings] = useState<Record<string, number>>({});
  const nextKey = useRef(0);
  const expiry = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = expiry.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const clearLanding = useCallback((userId: string) => {
    const timer = expiry.current.get(userId);
    if (timer !== undefined) window.clearTimeout(timer);
    expiry.current.delete(userId);
    setLandings((prev) => {
      if (!(userId in prev)) return prev;
      const rest = { ...prev };
      delete rest[userId];
      return rest;
    });
  }, []);

  const done = useCallback((key: number) => setStars((prev) => prev.filter((star) => star.key !== key)), []);

  const fly = useCallback<StarFlight>(
    (from, payments) => {
      // A take-back cancels what is still in the air for that person, so a ring never lands on a bank that went down.
      const cancelled = Object.entries(payments).filter(([, amount]) => amount < 0).map(([userId]) => userId);
      if (cancelled.length > 0) {
        setStars((prev) => (prev.some((star) => cancelled.includes(star.userId)) ? prev.filter((star) => !cancelled.includes(star.userId)) : prev));
        cancelled.forEach(clearLanding);
      }
      if (!enabled || reduced || !from || typeof from.animate !== "function") return;
      const paid = Object.entries(payments).filter(([, amount]) => amount > 0);
      if (paid.length === 0) return;

      const box = from.getBoundingClientRect();
      const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const offsets = ringOffsets(RING_STARS, RING_RADIUS_REM * rootPx);
      const added: FlightStar[] = [];
      let poppedInPlace = false;
      for (const [userId] of paid) {
        const to = bankPoint(userId);
        if (!to) {
          // No bank on screen (a dashboard tile): one ring pops where the tap was, however many people were paid.
          if (poppedInPlace) continue;
          poppedInPlace = true;
        }
        offsets.forEach((offset, index) => added.push({ key: nextKey.current++, userId, from: start, to, offset, index }));
        if (to) {
          const startAt = performance.now() + landsAfterMs(0);
          const old = expiry.current.get(userId);
          if (old !== undefined) window.clearTimeout(old);
          expiry.current.set(
            userId,
            window.setTimeout(() => clearLanding(userId), landingClearsAfterMs()),
          );
          setLandings((prev) => ({ ...prev, [userId]: startAt }));
        }
      }
      setStars((prev) => [...prev, ...added]);
    },
    [enabled, reduced, clearLanding],
  );

  return (
    <CelebrationsContext.Provider value={enabled}>
      <FlightContext.Provider value={fly}>
        <LandingContext.Provider value={landings}>
          {children}
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
            {stars.map((star) => (
              <FlightStarView key={star.key} star={star} onDone={done} />
            ))}
          </div>
        </LandingContext.Provider>
      </FlightContext.Provider>
    </CelebrationsContext.Provider>
  );
}
