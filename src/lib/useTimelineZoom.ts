"use client";

// The hour timeline's live hour height, pinchable and remembered (mission-65).
// Returns the height in px that TimelineGrid draws with. The pure maths is in
// timelineZoom.ts; this file is the part that needs a browser.
//
// STORAGE: localStorage under a key that includes the signed-in person's id,
// read with useSyncExternalStore (the server render and the hydration render
// use the default 48, the real value arrives on the next render) with a
// same-tab signal, the shape lastCalendarView.ts uses. Per device and per
// person, shared by Day, 3 Day and Week. Written only when a pinch ENDS.
//
// THE PINCH: native touch listeners on the scroller, added with
// { passive: false } because React's synthetic touch handlers are passive and
// cannot call preventDefault. With exactly two touches the page must not
// scroll or zoom, so the move is cancelled. Safari's own gesturestart/
// gesturechange are cancelled too, or iPhone zooms the whole page.
//
// THE ANCHOR: when the pinch starts, the minute of the day under the two
// fingers' midpoint is recorded. After every height change the scroller's
// scrollTop is set so that minute sits under the CURRENT midpoint (so moving
// both fingers also pans). The scrollTop is set in a layout effect, after the
// new height has rendered, so the taller rail exists before it is scrolled.
//
// THE FLOOR: the day never zooms out past filling the visible rail (scroller
// height minus the sticky header), so an iPad in portrait shows no blank band
// under 11 PM. The floor is measured, kept in state, and re-measured whenever
// the scroller or the sticky header changes size (a ResizeObserver).
// It only limits what is DRAWN and what a pinch can reach; the stored value is
// not rewritten, so the same person on a phone keeps their 32.
//
// useScrollAnchor.ts is not reused: it anchors Schedule's page scroller on
// prepends; the timeline has its own scroller.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";
import {
  DEFAULT_HOUR_HEIGHT_PX,
  MAX_HOUR_HEIGHT_PX,
  MIN_HOUR_HEIGHT_PX,
  anchorScrollTop,
  hourHeightKey,
  minHourHeightFor,
  minuteUnderPoint,
  parseStoredHourHeight,
  pinchHourHeight,
  railOffsetPx,
} from "./timelineZoom";

// A same-tab signal: the browser's "storage" event fires only for OTHER tabs.
const HOUR_HEIGHT_CHANGED = "marshee:timeline-hour-height-changed";

function subscribeHourHeight(callback: () => void) {
  window.addEventListener(HOUR_HEIGHT_CHANGED, callback);
  return () => window.removeEventListener(HOUR_HEIGHT_CHANGED, callback);
}

function readHourHeight(viewerId: string | null): number {
  if (viewerId === null) return DEFAULT_HOUR_HEIGHT_PX;
  try {
    return parseStoredHourHeight(window.localStorage.getItem(hourHeightKey(viewerId)));
  } catch {
    return DEFAULT_HOUR_HEIGHT_PX; // storage blocked (private mode): the default
  }
}

/** True when saved; false when storage refused, so the caller can keep the live value. */
function writeHourHeight(viewerId: string, heightPx: number): boolean {
  try {
    window.localStorage.setItem(hourHeightKey(viewerId), String(heightPx));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(HOUR_HEIGHT_CHANGED));
  return true;
}

function touchDistance(touches: TouchList): number {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function preventDefault(event: Event) {
  event.preventDefault();
}

/**
 * `viewerId` null (nobody signed in) means the default height and nothing is
 * ever saved. `railRef` is the hour rail's element: its top inside the
 * scroller is measured, never assumed, because the sticky weekday header and
 * the all-day strip sit above it and change height. `stickyHeaderRef` is that
 * header, measured for the whole-day floor.
 */
export function useTimelineZoom(
  viewerId: string | null,
  scrollerRef: RefObject<HTMLDivElement | null>,
  railRef: RefObject<HTMLDivElement | null>,
  stickyHeaderRef: RefObject<HTMLDivElement | null>,
): number {
  const getSnapshot = useCallback(() => readHourHeight(viewerId), [viewerId]);
  const stored = useSyncExternalStore(subscribeHourHeight, getSnapshot, () => DEFAULT_HOUR_HEIGHT_PX);
  // Set while fingers are down; null the rest of the time (the stored value wins).
  const [live, setLive] = useState<number | null>(null);
  // The whole-day floor (see THE FLOOR above); 32 until measured.
  const [floorPx, setFloorPx] = useState(MIN_HOUR_HEIGHT_PX);
  const hourHeightPx = Math.max(live ?? stored, floorPx);

  const heightRef = useRef(hourHeightPx); // the last height that was rendered
  const anchorRef = useRef<{ minute: number; midY: number } | null>(null);

  // After a height change has rendered, put the anchor back where it belongs.
  useLayoutEffect(() => {
    const previous = heightRef.current;
    heightRef.current = hourHeightPx;
    const scroller = scrollerRef.current;
    const rail = railRef.current;
    if (!scroller || !rail || previous === hourHeightPx) return;
    const offset = railOffsetPx(
      rail.getBoundingClientRect().top,
      scroller.getBoundingClientRect().top,
      scroller.scrollTop,
    );
    const anchor = anchorRef.current;
    if (anchor) {
      scroller.scrollTop = anchorScrollTop(anchor.minute, hourHeightPx / 60, offset, anchor.midY);
    } else {
      // Not a pinch: the stored value resolved after hydration (the server
      // snapshot is 48), or it changed under us. Keep the minute at the top
      // of the visible rail where it was. The sticky header covers the top
      // `offset` px of the scroller, so that line sits at pointY = offset.
      const minute = minuteUnderPoint(scroller.scrollTop, offset, offset, previous / 60);
      scroller.scrollTop = anchorScrollTop(minute, hourHeightPx / 60, offset, offset);
    }
  }, [hourHeightPx, scrollerRef, railRef]);

  // The same measurement the scroll-to-now effect uses.
  const measureFloor = useCallback((): number => {
    const scroller = scrollerRef.current;
    if (!scroller) return MIN_HOUR_HEIGHT_PX;
    const header = stickyHeaderRef.current?.getBoundingClientRect().height ?? 0;
    const floor = Math.min(MAX_HOUR_HEIGHT_PX, minHourHeightFor(scroller.clientHeight - header));
    setFloorPx(floor);
    return floor;
  }, [scrollerRef, stickyHeaderRef]);

  // A layout effect, so the first paint already respects the floor. The
  // observer re-measures whenever the scroller or the sticky header changes
  // size (window resize, the all-day strip appearing or going away).
  useLayoutEffect(() => {
    measureFloor();
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() => measureFloor());
    observer.observe(scroller);
    if (stickyHeaderRef.current) observer.observe(stickyHeaderRef.current);
    return () => observer.disconnect();
  }, [measureFloor, scrollerRef, stickyHeaderRef]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const el = scroller;

    let pinch: { startDistance: number; startHeight: number; floor: number } | null = null;
    let lastHeight = heightRef.current; // newest height asked for
    let pendingHeight: number | null = null;
    let frame = 0;

    function midpointY(touches: TouchList): number {
      return (touches[0].clientY + touches[1].clientY) / 2 - el.getBoundingClientRect().top;
    }

    function begin(touches: TouchList) {
      const rail = railRef.current;
      if (!rail) return;
      const offset = railOffsetPx(rail.getBoundingClientRect().top, el.getBoundingClientRect().top, el.scrollTop);
      const midY = midpointY(touches);
      const startHeight = heightRef.current;
      pinch = { startDistance: touchDistance(touches), startHeight, floor: measureFloor() };
      lastHeight = startHeight;
      pendingHeight = null;
      anchorRef.current = { minute: minuteUnderPoint(el.scrollTop, midY, offset, startHeight / 60), midY };
    }

    // Once per animation frame: render the newest height. If the height did
    // not change (fingers only slid), no render will follow, so pan directly.
    function applyFrame() {
      frame = 0;
      if (pendingHeight === null) return;
      const next = pendingHeight;
      pendingHeight = null;
      lastHeight = next;
      if (next === heightRef.current) {
        const rail = railRef.current;
        const anchor = anchorRef.current;
        if (rail && anchor) {
          const offset = railOffsetPx(rail.getBoundingClientRect().top, el.getBoundingClientRect().top, el.scrollTop);
          el.scrollTop = anchorScrollTop(anchor.minute, next / 60, offset, anchor.midY);
        }
        return;
      }
      setLive(next);
    }

    function end() {
      if (!pinch) return;
      const startHeight = pinch.startHeight;
      pinch = null;
      cancelAnimationFrame(frame);
      frame = 0;
      const final = pendingHeight ?? lastHeight;
      pendingHeight = null;
      if (final === startHeight) {
        // A tap or a pinch back to where it began: nothing to save, and the
        // stored value must not be overwritten by a floored one.
        // Render it while the anchor is still set (as the saving branch does),
        // so the minute under the fingers does not jump.
        flushSync(() => setLive(null));
        anchorRef.current = null;
        return;
      }
      // Render the final height now (anchor still set) so no frame is lost.
      if (final !== heightRef.current) flushSync(() => setLive(final));
      anchorRef.current = null;
      if (viewerId !== null && writeHourHeight(viewerId, final)) setLive(null);
      // No viewer, or storage refused: keep the live value for this visit.
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        event.preventDefault();
        begin(event.touches);
      } else if (pinch) {
        end(); // a third finger (or a stray start) ends the pinch
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      if (anchorRef.current) anchorRef.current.midY = midpointY(event.touches);
      pendingHeight = pinchHourHeight(pinch.startHeight, pinch.startDistance, touchDistance(event.touches), pinch.floor);
      if (frame === 0) frame = requestAnimationFrame(applyFrame);
    }

    function onTouchEnd(event: TouchEvent) {
      if (pinch && event.touches.length < 2) end();
    }

    const options = { passive: false } as const;
    el.addEventListener("touchstart", onTouchStart, options);
    el.addEventListener("touchmove", onTouchMove, options);
    el.addEventListener("touchend", onTouchEnd, options);
    el.addEventListener("touchcancel", onTouchEnd, options);
    // Safari-only: without these iPhone zooms the whole page on a pinch.
    el.addEventListener("gesturestart", preventDefault, options);
    el.addEventListener("gesturechange", preventDefault, options);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("gesturestart", preventDefault);
      el.removeEventListener("gesturechange", preventDefault);
      cancelAnimationFrame(frame);
      anchorRef.current = null;
    };
  }, [viewerId, scrollerRef, railRef, measureFloor]);

  return hourHeightPx;
}
