"use client";

import { useSyncExternalStore } from "react";

// Mission 73 (C3): the live root font size in pixels (16 at Normal, 24 at
// Largest on a tablet). Text size (mission 58) changes it through an
// attribute on <html>, so this watches that attribute and window resizes.
// The calendar's block titles need real pixels to count whole lines.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  window.addEventListener("resize", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", onChange);
  };
}

function getSnapshot() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function getServerSnapshot() {
  return 16;
}

export function useRootFontPx(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
