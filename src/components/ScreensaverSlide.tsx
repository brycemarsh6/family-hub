"use client";

import { useEffect, useState } from "react";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { formatHouseholdClock } from "@/lib/householdDate";
import {
  formatScreensaverDate,
  formatTakenOn,
  pickNextPhoto,
  type ScreensaverSettings,
} from "@/lib/screensaver";
import { slideshowImageUrl } from "@/lib/slideshowPhotos";
import type { SlideshowShowItem } from "@/lib/slideshowRead";

const CROSSFADE_CLASSES = "transition-opacity duration-1000 ease-in-out";
// After every photo failed to load, wait this long before trying again.
const RETRY_AFTER_ALL_FAILED_MS = 30_000;

type Slots = { a: SlideshowShowItem | null; b: SlideshowShowItem | null; active: "a" | "b" };

/** Loads and decodes the image so the crossfade never starts on a half-drawn photo. */
async function preload(id: string): Promise<boolean> {
  try {
    const image = new Image();
    image.src = slideshowImageUrl(id);
    await image.decode();
    return true;
  } catch {
    return false;
  }
}

/**
 * One photo layer: a blurred, darkened, scaled-up copy fills the sides, the
 * whole photo sits centred on top, and the caption and taken date (each only
 * when its switch is on) sit bottom right over a soft shade.
 */
function PhotoLayer({
  photo,
  visible,
  settings,
}: {
  photo: SlideshowShowItem | null;
  visible: boolean;
  settings: ScreensaverSettings;
}) {
  if (!photo) return null;
  const caption = settings.showCaption && photo.caption ? photo.caption : null;
  const takenOn = settings.showTakenOn ? formatTakenOn(photo.takenOn) : null;
  return (
    <div className={`absolute inset-0 ${CROSSFADE_CLASSES} ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a private, authenticated image route; next/image's optimiser would not carry the login */}
      <img
        src={slideshowImageUrl(photo.id)}
        alt=""
        className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-50"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- same private route */}
      <img
        src={slideshowImageUrl(photo.id)}
        alt={photo.caption ?? ""}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {(caption || takenOn) && (
        <div
          className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/60 to-transparent px-8 pb-6 pt-24 text-right text-white"
          style={{
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            paddingRight: "calc(2rem + env(safe-area-inset-right))",
          }}
        >
          <div className="max-w-[50%]">
            {caption && <p className="text-2xl font-medium">{caption}</p>}
            {takenOn && <p className="text-lg text-white/80">{takenOn}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The slideshow picture: shuffled photos with a 1-second crossfade between
 * them, and the clock and date bottom left. Mounted fresh each time the
 * slideshow starts, with the photos the host just loaded. When the host swaps
 * in different photos or settings, the effect below restarts the round.
 */
export function ScreensaverSlide({
  photos,
  settings,
}: {
  photos: SlideshowShowItem[];
  settings: ScreensaverSettings;
}) {
  const [slots, setSlots] = useState<Slots>({ a: null, b: null, active: "a" });
  const [time, setTime] = useState(() => formatHouseholdClock(new Date(), HOUSEHOLD_TIME_ZONE, { dropZeroMinutes: false }));
  const [date, setDate] = useState(() => formatScreensaverDate(new Date(), HOUSEHOLD_TIME_ZONE));

  useEffect(() => {
    if (!settings.showClock) return;
    const id = window.setInterval(() => {
      const now = new Date();
      setTime(formatHouseholdClock(now, HOUSEHOLD_TIME_ZONE, { dropZeroMinutes: false }));
      setDate(formatScreensaverDate(now, HOUSEHOLD_TIME_ZONE));
    }, 1000);
    return () => window.clearInterval(id);
  }, [settings.showClock]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const ids = photos.map((p) => p.id);
    let shownIds: string[] = [];
    let lastId: string | null = null;
    // Photos whose image failed to load: never picked again during this slideshow.
    const failedIds = new Set<string>();

    async function advance() {
      // A photo that fails to load is skipped, and not asked for again.
      for (;;) {
        const usable = ids.filter((id) => !failedIds.has(id));
        if (usable.length === 0) break;
        const pick = pickNextPhoto(usable, shownIds, lastId, Math.random);
        if (!pick) break;
        shownIds = pick.shownIds;
        lastId = pick.id;
        const ok = await preload(pick.id);
        if (cancelled) return;
        if (!ok) {
          failedIds.add(pick.id);
          continue;
        }
        const photo = photos.find((p) => p.id === pick.id);
        if (!photo) continue;
        setSlots((prev) => {
          const next = prev.active === "a" ? "b" : "a";
          return { ...prev, [next]: photo, active: next };
        });
        timer = window.setTimeout(advance, settings.secondsPerPhoto * 1000);
        return;
      }
      // Every photo failed: forget the failures and try them all again later.
      failedIds.clear();
      timer = window.setTimeout(advance, RETRY_AFTER_ALL_FAILED_MS);
    }

    void advance();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [photos, settings.secondsPerPhoto]);

  return (
    <>
      <PhotoLayer photo={slots.a} visible={slots.active === "a"} settings={settings} />
      <PhotoLayer photo={slots.b} visible={slots.active === "b"} settings={settings} />
      {settings.showClock && (
        <>
          {/* A shade that does not depend on the photo, so the clock reads on bright photos with no caption */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-t from-black/70 via-black/40 to-transparent"
          />
          <div
            className="absolute bottom-0 left-0 z-10 px-8 pb-6 text-white"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
              paddingLeft: "calc(2rem + env(safe-area-inset-left))",
            }}
          >
            <p className="text-7xl font-semibold leading-none [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">{time}</p>
            <p className="mt-2 text-xl text-white/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">{date}</p>
          </div>
        </>
      )}
    </>
  );
}
