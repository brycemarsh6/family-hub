"use client";

import { useSyncExternalStore } from "react";

// Mission 73 (C3): the live root font size in pixels (16 at Normal, 24 at
// Largest on a tablet). Text size (mission 58) changes it through an
// attribute on <html>, so this watches that attribute and window resizes.
// The calendar's block titles need real pixels to count whole lines.

// The value is cached here and refreshed only when something can have changed
// it, so a render never calls getComputedStyle (one per column per render
// before). The first subscribe fills it.
let cachedPx: number | null = null;

export function readRootFontPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function subscribe(onChange: () => void) {
  const refresh = () => {
    cachedPx = readRootFontPx();
    onChange();
  };
  cachedPx = readRootFontPx();
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { attributes: true });
  window.addEventListener("resize", refresh);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", refresh);
  };
}

function getSnapshot() {
  if (cachedPx === null) cachedPx = readRootFontPx();
  return cachedPx;
}

function getServerSnapshot() {
  return 16;
}

export function useRootFontPx(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
