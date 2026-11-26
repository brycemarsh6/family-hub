"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, SquarePlus } from "lucide-react";
import { INSTALL_STEPS, INSTALL_WORDS } from "@/lib/welcomeVocabulary";

type Device = "iphone" | "ipad";

// Browser-only read, so useSyncExternalStore (DESIGN.md). Nothing changes
// while the page is open, so there is nothing to subscribe to.
function subscribe() {
  return () => {};
}

// An iPad on iPadOS 13 and up says it is a Mac; a Mac with a touch screen
// does not exist, so more than one touch point settles it.
function readDevice(): Device {
  const iPad =
    /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return iPad ? "ipad" : "iphone";
}

/**
 * The "put Marshee on the Home Screen" steps: an iPhone / iPad switch that
 * starts on whichever the person is holding, three numbered steps and two
 * small notes. Shared by the welcome steps and Settings, Install on your
 * phone. The words are all in welcomeVocabulary.ts.
 */
export function InstallHelp() {
  const detected = useSyncExternalStore(subscribe, readDevice, () => "iphone" as Device);
  const [picked, setPicked] = useState<Device | null>(null);
  const device = picked ?? detected;

  return (
    <div>
      <p className="mt-1 text-base text-muted">{INSTALL_WORDS.intro}</p>

      <div role="group" className="mt-4 flex rounded-xl bg-surface-2 p-1">
        {(["iphone", "ipad"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={device === option}
            onClick={() => setPicked(option)}
            className={`min-h-12 flex-1 rounded-lg text-base font-semibold transition-colors ${
              device === option ? "bg-surface text-fg shadow-sm" : "text-muted"
            }`}
          >
            {INSTALL_WORDS[option]}
          </button>
        ))}
      </div>

      <ol className="mt-4 flex flex-col gap-4">
        {INSTALL_STEPS[device].map((parts, index) => (
          <li key={index} className="flex items-start gap-3 text-base leading-snug">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold"
            >
              {index + 1}
            </span>
            <span>
              {parts.map((part, i) =>
                part.icon === "share" ? (
                  <Share key={i} aria-hidden="true" size={18} className="inline align-text-bottom" />
                ) : part.icon === "add" ? (
                  <SquarePlus key={i} aria-hidden="true" size={18} className="inline align-text-bottom" />
                ) : part.bold ? (
                  <b key={i}>{part.text}</b>
                ) : (
                  part.text
                ),
              )}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm text-muted">
        {device === "iphone" ? INSTALL_WORDS.chromeNoteIphone : INSTALL_WORDS.chromeNoteIpad}
      </p>
      <p className="mt-2 text-sm text-muted">{INSTALL_WORDS.everyone}</p>
    </div>
  );
}
