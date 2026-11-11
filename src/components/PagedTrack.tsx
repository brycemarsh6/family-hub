"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { GLIDE_MS, usePagedSwipe } from "@/lib/usePagedSwipe";

// Mission 69 (C3): three pages side by side, shifted by `--page-dx` from the
// nearest ancestor that sets it (usePagedSwipe writes it). Panels are keyed by
// POSITION, not by period: the three panels stay, and after a turn commits
// their contents shift by one period, so the flush and the variable's reset
// to 0 land in one frame. Only the current panel is in the
// flow (it sets the height); the neighbours sit beside it, hidden from touch
// and screen readers until they become current. Reduce motion is handled in
// usePagedSwipe (it never sets `data-glide`) and by globals.css.

export function PagedTrack({
  previous,
  current,
  next,
}: {
  previous: ReactNode;
  current: ReactNode;
  next: ReactNode;
}) {
  return (
    <div
      data-paged-track
      className="relative will-change-transform [[data-glide=true]_&]:transition-transform [[data-glide=true]_&]:duration-(--glide-ms) [[data-glide=true]_&]:ease-out"
      style={{
        transform: "translateX(var(--page-dx, 0px))",
        "--glide-ms": `${GLIDE_MS}ms`,
      } as CSSProperties}
    >
      <div aria-hidden="true" inert className="absolute inset-x-0 top-0 -translate-x-full">
        {previous}
      </div>
      <div>{current}</div>
      <div aria-hidden="true" inert className="absolute inset-x-0 top-0 translate-x-full">
        {next}
      </div>
    </div>
  );
}

/** A swipeable PagedTrack for views that page as a whole (Month, Year): the
 * root carries the variable, the touch handlers and `touch-action: pan-y`. */
export function PagedSwipeArea({
  onTurn,
  pageKey,
  className = "",
  previous,
  current,
  next,
}: {
  onTurn: (direction: 1 | -1) => void;
  /** Changes with the shown period (see usePagedSwipe). */
  pageKey: string | number;
  /** Extra classes for the root (Month's edge bleed lives here). */
  className?: string;
  previous: ReactNode;
  current: ReactNode;
  next: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { handlers } = usePagedSwipe({ varRef: rootRef, onTurn, pageKey });
  return (
    <div ref={rootRef} className={`touch-pan-y overflow-hidden ${className}`} {...handlers}>
      <PagedTrack previous={previous} current={current} next={next} />
    </div>
  );
}
