"use client";

import { useEffect, useRef, type RefObject } from "react";
import { resolveDrop } from "./timelineDrag";
import { minutesOfDay } from "./timelineLayout";
import { isSameDay } from "./mealPlanDates";
import { formatClockDigits, formatTimeRange } from "./calendarDates";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { DragCallbacks } from "./usePagedSwipe";
import type { CalendarEventView } from "./types";

// Mission 70 (C3): the DOM side of a lifted event block on the hour timeline.
// NOT a gesture machine: calendarGesture.ts decides what a touch is, and
// usePagedSwipe.ts (its only driver) hands this hook the hold and drag
// effects as `DragCallbacks`. This hook only carries them out.
//
// No React state, so no render, while a block is lifted. Every move writes
// straight to the DOM: the block's `transform` and time line, the target
// day's header tint, and the gutter marker (the new start, "4:30", with the
// hour label under it hidden). Where the block lands is `resolveDrop`
// (timelineDrag.ts), fed the LIVE hour height and columns measured now.
//
// The page cannot slide while lifted (the machine sends no offset), and the
// hours cannot scroll natively: iOS decides "this touch scrolls" at
// touchstart, so toggling touch-action after the hold does nothing. Instead
// one non-passive touchmove listener on the grid root cancels moves, only
// while a block is lifted. A vertical drag that starts on a block without a
// hold still scrolls, because nothing is cancelled then.
//
// The blocks that may lift carry `data-drag-id` (TimelineDayColumn.tsx); the
// lifted one gets `data-lifted`, which its own classes style (scale, shadow,
// accent outline). Every way out (drop, cancel, unmount) puts everything back.
// A lift that went stale under the finger (its block left the page, or the
// columns now show other days) is put down without a drop.

/** The strips at the top (under the sticky header) and bottom of the hours
 * where a held block scrolls them. */
const EDGE_STRIP_PX = 44;
/** How far the hours scroll per frame while the finger sits in a strip. */
const EDGE_SCROLL_PX_PER_FRAME = 6;
/** The block's glide home; matches its `duration-200` class. */
const PUT_BACK_MS = 200;

/** True when a press began on a block that may lift. */
export function isOnDragBlock(target: EventTarget): boolean {
  return target instanceof Element && target.closest("[data-drag-id]") !== null;
}

/** The days the columns showed, as one comparable key. */
function daysKey(days: Date[]): string {
  return days.map((day) => day.getTime()).join(",");
}

type Lift = {
  id: string;
  block: HTMLElement;
  timeEl: HTMLElement | null;
  timeText: string;
  originalStart: Date;
  durationMinutes: number;
  /** The page's day columns, measured each time they are needed. */
  columns: HTMLElement[];
  originIndex: number;
  /** `daysKey` of the columns at the hold: a different key means stale. */
  daysKey: string;
  grabOffsetY: number;
  x: number;
  y: number;
  newStart: Date | null;
};

export type TimelineDragOptions = {
  rootRef: RefObject<HTMLElement | null>;
  scrollerRef: RefObject<HTMLElement | null>;
  stickyHeaderRef: RefObject<HTMLElement | null>;
  railRef: RefObject<HTMLElement | null>;
  /** The header tint (inside the sticky header) and the gutter marker
   * (inside the rail), both drawn hidden by TimelineGrid. */
  tintRef: RefObject<HTMLElement | null>;
  markerRef: RefObject<HTMLElement | null>;
  columnDays: Date[];
  events: CalendarEventView[];
  pxPerMinute: number;
  /** A drop that moves the event. Missing: the block glides back. */
  onDrop?: (eventId: string, newStart: Date) => void;
};

export function useTimelineDrag(options: TimelineDragOptions): DragCallbacks {
  const reduceMotion = usePrefersReducedMotion();
  const latest = useRef({ ...options, reduceMotion });
  useEffect(() => {
    latest.current = { ...options, reduceMotion };
  });
  const lift = useRef<Lift | null>(null);
  const frame = useRef(0);
  // The last put-down's pending tidy-up (its time text comes back after the glide).
  const restoreTimer = useRef(0);
  const pendingRestore = useRef<(() => void) | null>(null);

  function flushRestore() {
    window.clearTimeout(restoreTimer.current);
    pendingRestore.current?.();
  }

  // Stop native scrolling while lifted (see the header).
  const { rootRef } = options;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onTouchMove = (event: TouchEvent) => {
      if (lift.current && event.cancelable) event.preventDefault();
    };
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => root.removeEventListener("touchmove", onTouchMove);
  }, [rootRef]);

  function resolve(current: Lift): Date | null {
    const { scrollerRef, stickyHeaderRef, railRef, columnDays, pxPerMinute } = latest.current;
    const scroller = scrollerRef.current?.getBoundingClientRect();
    const sticky = stickyHeaderRef.current?.getBoundingClientRect();
    const rail = railRef.current?.getBoundingClientRect();
    const first = current.columns[0]?.getBoundingClientRect();
    if (!scroller || !sticky || !rail || !first) return null;
    return resolveDrop({
      fingerX: current.x - first.left,
      // The visible hours start at the sticky header's bottom edge; how far
      // the rail has gone up under it is the scroll.
      fingerY: current.y - sticky.bottom,
      scrollTop: sticky.bottom - rail.top,
      visibleHeightPx: scroller.bottom - sticky.bottom,
      grabOffsetY: current.grabOffsetY,
      pxPerMinute,
      columnCount: columnDays.length,
      columnWidthPx: first.width,
      columnDays,
      originalStart: current.originalStart,
      durationMinutes: current.durationMinutes,
    });
  }

  function showMarker(start: Date | null) {
    const { markerRef, rootRef: root, pxPerMinute } = latest.current;
    const marker = markerRef.current;
    if (!marker) return;
    const labels = root.current?.querySelectorAll<HTMLElement>("[data-hour-label]") ?? [];
    if (!start) {
      marker.style.display = "none";
      labels.forEach((label) => (label.style.visibility = ""));
      return;
    }
    const topPx = minutesOfDay(start) * pxPerMinute;
    marker.style.display = "flex";
    marker.style.top = `${topPx}px`;
    marker.firstElementChild!.textContent = formatClockDigits(start);
    // Hide an hour label the marker sits on top of. Both are centred on
    // their line, so they overlap when the lines are closer than half of
    // the two heights together.
    const markerHeight = marker.offsetHeight;
    labels.forEach((label) => {
      const labelPx = Number(label.dataset.hourLabel) * 60 * pxPerMinute;
      const overlaps = Math.abs(labelPx - topPx) < (markerHeight + label.offsetHeight) / 2;
      label.style.visibility = overlaps ? "hidden" : "";
    });
  }

  function showTint(index: number | null, columns: HTMLElement[]) {
    const { tintRef, stickyHeaderRef } = latest.current;
    const tint = tintRef.current;
    const header = stickyHeaderRef.current;
    if (!tint || !header) return;
    const column = index === null ? undefined : columns[index];
    if (!column) {
      tint.style.display = "none";
      return;
    }
    const rect = column.getBoundingClientRect();
    tint.style.display = "block";
    tint.style.left = `${rect.left - header.getBoundingClientRect().left}px`;
    tint.style.width = `${rect.width}px`;
  }

  // Draws the lifted block where a drop right now would put it: the snapped
  // spot, or home when the drop would save nothing.
  function place(current: Lift) {
    const { columnDays, pxPerMinute } = latest.current;
    const newStart = resolve(current);
    current.newStart = newStart;
    const start = newStart ?? current.originalStart;
    const index = columnDays.findIndex((day) => isSameDay(day, start));
    let dx = 0;
    let dy = 0;
    if (newStart && index !== -1 && current.columns[index] && current.columns[current.originIndex]) {
      dx =
        current.columns[index].getBoundingClientRect().left -
        current.columns[current.originIndex].getBoundingClientRect().left;
      dy = minutesOfDay(newStart) * pxPerMinute - current.block.offsetTop;
    }
    current.block.style.transform = `translate(${dx}px, ${dy}px)`;
    if (current.timeEl) {
      const end = new Date(start.getTime() + current.durationMinutes * 60000);
      current.timeEl.textContent = formatTimeRange(start, end);
    }
    showTint(newStart && index !== current.originIndex ? index : null, current.columns);
    showMarker(start);
  }

  // The lifted block is gone from the page (a view or period change during
  // the hold) or the columns show other days: nothing it says is true now.
  function isStale(current: Lift): boolean {
    return !current.block.isConnected || daysKey(latest.current.columnDays) !== current.daysKey;
  }

  // -1 in the top strip, 1 in the bottom one, 0 elsewhere.
  function edgeDirection(y: number): number {
    const scroller = latest.current.scrollerRef.current?.getBoundingClientRect();
    const sticky = latest.current.stickyHeaderRef.current?.getBoundingClientRect();
    if (!scroller || !sticky) return 0;
    if (y < sticky.bottom + EDGE_STRIP_PX) return -1;
    if (y > scroller.bottom - EDGE_STRIP_PX) return 1;
    return 0;
  }

  // While the finger rests in a strip, scroll a step and re-place each frame.
  function edgeScroll() {
    if (frame.current) return;
    const step = () => {
      frame.current = 0;
      const current = lift.current;
      const scroller = latest.current.scrollerRef.current;
      if (!current || !scroller) return;
      if (isStale(current)) return putDown(true);
      const direction = edgeDirection(current.y);
      if (direction === 0) return;
      scroller.scrollTop += direction * EDGE_SCROLL_PX_PER_FRAME;
      place(current);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  // Puts the block down: glides home (instant under reduce motion), or stays
  // put when `inPlace` (a drop handed to onDrop, whose render moves it).
  function putDown(inPlace: boolean) {
    const current = lift.current;
    lift.current = null;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    showMarker(null);
    showTint(null, []);
    if (!current) return;
    flushRestore();
    const { block, timeEl, timeText } = current;
    const instant = inPlace || latest.current.reduceMotion;
    if (instant) block.style.transition = "none";
    block.removeAttribute("data-lifted");
    block.style.transform = "";
    const restore = () => {
      restoreTimer.current = 0;
      pendingRestore.current = null;
      block.style.transition = "";
      if (timeEl) timeEl.textContent = timeText;
    };
    if (instant) {
      void block.offsetHeight; // commit the jump before the transition returns
      restore();
    } else {
      pendingRestore.current = restore;
      restoreTimer.current = window.setTimeout(restore, PUT_BACK_MS);
    }
  }

  useEffect(
    () => () => {
      putDown(true);
      flushRestore();
    },
    // Teardown only; putDown reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    holdStarted({ x, y, target }) {
      putDown(true);
      // A glide home still finishing: tidy it now, before reading this block.
      flushRestore();
      const { rootRef: root, railRef, events, columnDays } = latest.current;
      const block = target instanceof Element ? target.closest<HTMLElement>("[data-drag-id]") : null;
      const rail = railRef.current?.getBoundingClientRect();
      const column = block?.closest<HTMLElement>("[data-day-column]");
      const event = events.find((e) => e.id === block?.dataset.dragId);
      if (!block || !rail || !column?.parentElement || !event || !root.current?.contains(block)) return;
      const columns = Array.from(column.parentElement.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute("data-day-column"),
      );
      const timeEl = block.querySelector<HTMLElement>("[data-drag-time]");
      lift.current = {
        id: event.id,
        block,
        timeEl,
        timeText: timeEl?.textContent ?? "",
        originalStart: event.startAt,
        durationMinutes: (event.endAt.getTime() - event.startAt.getTime()) / 60000,
        columns,
        originIndex: columns.indexOf(column),
        daysKey: daysKey(columnDays),
        // offsetTop ignores transforms, so the grab is from the block's real top.
        grabOffsetY: y - rail.top - block.offsetTop,
        x,
        y,
        newStart: null,
      };
      block.setAttribute("data-lifted", "");
      place(lift.current);
    },
    dragMove(x, y) {
      const current = lift.current;
      if (!current) return;
      if (isStale(current)) return putDown(true);
      current.x = x;
      current.y = y;
      place(current);
      if (edgeDirection(y) !== 0) edgeScroll();
    },
    dragDrop(x, y) {
      const current = lift.current;
      if (!current) return;
      if (isStale(current)) return putDown(true);
      current.x = x;
      current.y = y;
      const newStart = resolve(current);
      const { onDrop } = latest.current;
      if (newStart && onDrop) {
        putDown(true);
        onDrop(current.id, newStart);
      } else {
        putDown(false);
      }
    },
    dragCancel() {
      putDown(false);
    },
  };
}
