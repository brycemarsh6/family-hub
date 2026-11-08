"use client";

import { useLayoutEffect, useState } from "react";

/**
 * The width, in pixels, of the element `ref` points at. 0 on the server and
 * before the first measurement.
 *
 * Why a measured width: a CSS container can restyle its children but cannot
 * tell JavaScript how many columns it has, and the stable split of a list
 * into columns (`splitColumns.ts`) must be decided in JavaScript.
 *
 * Why the wrapper's own width and not the window: the pinned Sidebar or Rail
 * just leaves the page less room, and the column count follows that room
 * (STRUCTURE.md "Wide pages", rule 2).
 *
 * Known cost: on a hard reload the list paints at one column until the page
 * hydrates, then goes to 2 or 3. Client-side navigation measures before the
 * first paint, so it does not jump.
 */
export function useContainerWidth(
  ref: React.RefObject<HTMLElement | null>,
): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(() => {
      setWidth(Math.round(el.getBoundingClientRect().width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
