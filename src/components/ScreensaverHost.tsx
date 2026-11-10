"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ScreensaverSlide } from "@/components/ScreensaverSlide";
import { loadScreensaverShow } from "@/app/actions/screensaver";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { screensaverState, type ScreensaverSettings } from "@/lib/screensaver";
import type { SlideshowShowItem } from "@/lib/slideshowRead";

const TICK_MS = 1000;
// After a load that failed, or that decided to stay awake, wait this long.
const RETRY_MS = 60_000;

type Show = { kind: "slideshow"; settings: ScreensaverSettings; photos: SlideshowShowItem[] } | { kind: "sleep" } | null;

/**
 * The wall tablet's screensaver: mounted by AppChrome for a device login only.
 * A 1-second tick asks `screensaverState` what the screen should be. Before it
 * leaves "awake" it fetches fresh settings and photos (`loadScreensaverShow`)
 * and re-checks the rule with them, so new photos and changed settings reach
 * the tablet without a reload.
 *
 * A tap must only wake the screen, never press what is underneath. The overlay
 * is the hit target from the first touch; it swallows `pointerdown` and wakes
 * on its own `click`, so the whole tap belongs to it. Taps anywhere else,
 * caught on `window`, reset the idle clock. Nothing here touches the screen's
 * power or light.
 */
export function ScreensaverHost({ initialSettings }: { initialSettings: ScreensaverSettings }) {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShowState] = useState<Show>(null);
  const showRef = useRef<Show>(null);
  const settingsRef = useRef(initialSettings);
  // Unknown until the first load; the tick assumes "maybe" so it goes to look.
  const photoCountRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const nextTryAtRef = useRef(0);
  const loadingRef = useRef(false);

  // Overlay only renders after mount (it portals to document.body).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const setShow = useCallback((next: Show) => {
    showRef.current = next;
    setShowState(next);
  }, []);

  useEffect(() => {
    lastTapRef.current = Date.now();
    function noteTap() {
      lastTapRef.current = Date.now();
    }
    window.addEventListener("pointerdown", noteTap, true);
    window.addEventListener("keydown", noteTap, true);

    function stateNow(settings: ScreensaverSettings, hasPhotos: boolean) {
      return screensaverState({
        now: new Date(),
        lastTapAt: new Date(lastTapRef.current),
        settings,
        hasPhotos,
        timeZone: HOUSEHOLD_TIME_ZONE,
      });
    }

    async function tick() {
      if (loadingRef.current) return;
      const wanted = stateNow(settingsRef.current, photoCountRef.current !== 0);
      // Already showing what the rule wants, or the rule wants awake (a shown
      // screen only ever closes on a tap).
      if (wanted === "awake" || wanted === (showRef.current?.kind ?? "awake")) return;
      if (Date.now() < nextTryAtRef.current) return;

      loadingRef.current = true;
      let fresh: Awaited<ReturnType<typeof loadScreensaverShow>> = null;
      try {
        fresh = await loadScreensaverShow();
      } catch {
        fresh = null;
      }
      loadingRef.current = false;
      if (!fresh) {
        nextTryAtRef.current = Date.now() + RETRY_MS;
        return;
      }
      settingsRef.current = fresh.settings;
      photoCountRef.current = fresh.photos.length;
      const confirmed = stateNow(fresh.settings, fresh.photos.length > 0);
      if (confirmed === "slideshow" && showRef.current?.kind !== "slideshow") {
        setShow({ kind: "slideshow", settings: fresh.settings, photos: fresh.photos });
      } else if (confirmed === "sleep" && showRef.current?.kind !== "sleep") {
        setShow({ kind: "sleep" });
      } else if (confirmed === "awake") {
        nextTryAtRef.current = Date.now() + RETRY_MS;
      }
    }

    const interval = window.setInterval(() => void tick(), TICK_MS);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", noteTap, true);
      window.removeEventListener("keydown", noteTap, true);
    };
  }, [setShow]);

  function wake() {
    lastTapRef.current = Date.now();
    nextTryAtRef.current = 0;
    setShow(null);
    if (pathname !== "/") router.push("/");
  }

  if (!mounted || !show) return null;

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label="Wake Marshee"
      className="print:hidden fixed inset-0 z-[100] cursor-none select-none overflow-hidden bg-black"
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={wake}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") wake();
      }}
    >
      {show.kind === "slideshow" && <ScreensaverSlide photos={show.photos} settings={show.settings} />}
    </div>,
    document.body,
  );
}
