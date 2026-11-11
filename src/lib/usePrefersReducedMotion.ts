"use client";

import { useSyncExternalStore } from "react";

// Mission 69 (C2): true when the device asks for less motion. The calendar's
// page turn skips its glide when this is true. globals.css already zeroes CSS
// transitions under the same setting; this is for code that must decide in JS
// (commit the turn at once instead of waiting for a transitionend).

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
