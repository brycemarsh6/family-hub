"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const RAIN_MS = 2000;

/**
 * About two seconds of gold stars falling from the top of the screen, for the
 * redeem celebration. It draws on its own canvas, so the sheet card can sit in
 * front of it, and it never takes taps. The colour is the `--star` variable at
 * the moment it runs, so it follows light and dark. Under reduced motion it
 * draws nothing. The library loads only when the rain runs, in the browser only.
 */
export function StarRain({ run }: { run: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!run || reduceMotion || !canvas) return;
    let frame = 0;
    let stopped = false;
    let reset: (() => void) | null = null;

    import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (stopped) return;
        const rain = confetti.create(canvas, { resize: true });
        reset = () => rain.reset();
        const star = getComputedStyle(document.documentElement).getPropertyValue("--star").trim();
        const colors = star ? [star] : undefined;
        const start = performance.now();
        const drop = () => {
          if (stopped || performance.now() - start > RAIN_MS) return;
          rain({
            particleCount: 2,
            angle: 270,
            spread: 40,
            startVelocity: 12,
            gravity: 0.8,
            ticks: 220,
            scalar: 1.3,
            shapes: ["star"],
            colors,
            origin: { x: Math.random(), y: -0.05 },
            disableForReducedMotion: true,
          });
          frame = requestAnimationFrame(drop);
        };
        drop();
      })
      .catch(() => {
        // The rain is a bonus: a failed download is not worth a message.
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      reset?.();
    };
  }, [run, reduceMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
