"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ScreensaverSlide } from "@/components/ScreensaverSlide";
import { loadScreensaverShow } from "@/app/actions/screensaver";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { SCREENSAVER_WORDS, screensaverState, type ScreensaverSettings } from "@/lib/screensaver";
import type { SlideshowShowItem } from "@/lib/slideshowRead";

const TICK_MS = 1000;
// A state change the cached rule asks for is checked at most this often (and a failed load waits this long).
const RETRY_MS = 60_000;
// The quiet refresh (a slideshow showing, or an idle look for the first photo) runs at most this often.
const BACKGROUND_REFRESH_MS = 3_600_000;
// A load that has not settled by then counts as a failure.
const LOAD_TIMEOUT_MS = 15_000;
// Idle at least this long, the host keeps its photo and settings view fresh.
const IDLE_REFRESH_AFTER_MS = 60_000;

type Show = { kind: "slideshow"; settings: ScreensaverSettings; photos: SlideshowShowItem[] } | { kind: "sleep" } | null;

/** True when the fresh photo ids (as a set) or any setting differ from what the slideshow is showing. */
function differs(
  showing: { settings: ScreensaverSettings; photos: SlideshowShowItem[] },
  fresh: { settings: ScreensaverSettings; photos: SlideshowShowItem[] },
) {
  const ids = new Set(showing.photos.map((p) => p.id));
  const sameIds = ids.size === fresh.photos.length && fresh.photos.every((p) => ids.has(p.id));
  const keys = Object.keys(fresh.settings) as (keyof ScreensaverSettings)[];
  return !sameIds || keys.some((key) => showing.settings[key] !== fresh.settings[key]);
}

/**
 * The wall tablet's screensaver: mounted by AppChrome for a device login only.
 * A 1-second tick asks `screensaverState` what the screen should be. Before it
 * leaves "awake" it fetches fresh settings and photos (`loadScreensaverShow`)
 * and re-checks the rule with them. The database sleeps after 5 idle minutes,
 * so loads happen only when something can change, in exactly four cases:
 * (a) leaving "awake" for slideshow or sleep, held back only by a recent failure;
 * (b) the cached rule differs from what is showing (slideshow to sleep, sleep
 * to slideshow, an overlay to awake), at most once a minute, so only at real
 * transitions;
 * (c) while a slideshow is showing, one refresh at most every 60 minutes;
 * (d) awake, idle past "Start after" outside sleep hours with 0 photos cached,
 * one check at most every 60 minutes.
 * Never a refresh while someone is using the tablet, and none during the sleep
 * overlay except (b). A failed load waits a minute. A shown overlay closes by
 * itself when fresh data says "awake", but never within a minute of a touch
 * (the overlay's own click wakes it), so new photos and changed settings reach
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
  // Case (b) waits for this (set after any load); case (a) skips it.
  const nextRefreshAtRef = useRef(0);
  // Cases (c) and (d) wait for this (set after any successful load).
  const nextBackgroundAtRef = useRef(0);
  const failedUntilRef = useRef(0);
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
      const now = Date.now();
      if (now < failedUntilRef.current) return;
      const current = showRef.current?.kind ?? "awake";
      // Cached photo count 0 never blocks a look: only "awake" is decided by it.
      const wanted = stateNow(settingsRef.current, photoCountRef.current !== 0);
      // (a) leaving awake: only a recent failure holds it back.
      const leaving = current === "awake" && wanted !== "awake";
      // (b) the cached rule differs from what is showing, any other way: once a minute.
      const changing = !leaving && wanted !== current && now >= nextRefreshAtRef.current;
      const slow = now >= nextBackgroundAtRef.current;
      // (c) a slideshow is showing: refresh at most every 60 minutes.
      const refreshing = current === "slideshow" && slow;
      // (d) idle past "Start after" with 0 photos cached: look again at most every 60 minutes.
      const lookingForPhotos =
        current === "awake" && photoCountRef.current === 0 && stateNow(settingsRef.current, true) === "slideshow" && slow;
      if (!leaving && !changing && !refreshing && !lookingForPhotos) return;

      loadingRef.current = true;
      let fresh: Awaited<ReturnType<typeof loadScreensaverShow>> = null;
      let timeout: number | undefined;
      try {
        fresh = await Promise.race([
          loadScreensaverShow(),
          new Promise<null>((resolve) => {
            timeout = window.setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
          }),
        ]);
      } catch {
        fresh = null;
      }
      window.clearTimeout(timeout);
      loadingRef.current = false;
      nextRefreshAtRef.current = Date.now() + RETRY_MS;
      if (!fresh) {
        failedUntilRef.current = Date.now() + RETRY_MS;
        return;
      }
      nextBackgroundAtRef.current = Date.now() + BACKGROUND_REFRESH_MS;
      settingsRef.current = fresh.settings;
      photoCountRef.current = fresh.photos.length;
      const confirmed = stateNow(fresh.settings, fresh.photos.length > 0);
      if (confirmed === "slideshow" && showRef.current?.kind !== "slideshow") {
        setShow({ kind: "slideshow", settings: fresh.settings, photos: fresh.photos });
      } else if (confirmed === "slideshow" && showRef.current?.kind === "slideshow" && differs(showRef.current, fresh)) {
        // A running slideshow takes the fresh photos and settings (the slide restarts its round).
        setShow({ kind: "slideshow", settings: fresh.settings, photos: fresh.photos });
      } else if (confirmed === "sleep" && showRef.current?.kind !== "sleep") {
        setShow({ kind: "sleep" });
      } else if (confirmed === "awake" && showRef.current && Date.now() - lastTapRef.current >= IDLE_REFRESH_AFTER_MS) {
        // Closes by itself: no route change, nothing pressed. Read the last touch
        // after the load returns: a recent touch means the overlay's own click will
        // wake it, and unmounting under a finger would drop the click onto the page.
        setShow(null);
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
    nextRefreshAtRef.current = 0;
    setShow(null);
    if (pathname !== "/") router.push("/");
  }

  if (!mounted || !show) return null;

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label={SCREENSAVER_WORDS.wakeLabel}
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
