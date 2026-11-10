"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LadderStepper } from "@/components/LadderStepper";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { saveScreensaverSetting } from "@/app/actions/screensaver";
import {
  BACK_TO_BLACK_STEPS,
  SCREENSAVER_WORDS,
  SECONDS_PER_PHOTO_STEPS,
  START_AFTER_STEPS,
  formatSleepMinute,
  stepLadder,
  stepSleepMinute,
  type ScreensaverField,
  type ScreensaverSettings,
} from "@/lib/screensaver";

const ROW_CLASSES = "flex min-h-14 w-full items-center justify-between gap-3 px-4 text-base font-medium";
const CARD_CLASSES = "mt-3 divide-y divide-line rounded-xl border border-line bg-surface";

/**
 * The Wall tablet page's three cards (Slideshow, On the photo, Sleep). Every
 * change shows at once and saves in the background, one field per tap; a failed
 * save puts the old value back and says so under that row (same shape as
 * HabitsChoresSettings). Numbers move only by the −/+ buttons along their lists.
 * The three sleep steppers grey out while "Go black at night" is off.
 */
export function WallTabletSettings({
  initialSettings,
  photoCount,
}: {
  initialSettings: ScreensaverSettings;
  photoCount: number;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState<Partial<Record<ScreensaverField, string>>>({});

  async function change<F extends ScreensaverField>(field: F, next: ScreensaverSettings[F]) {
    let previous: ScreensaverSettings[F] | undefined;
    setErrors((e) => ({ ...e, [field]: undefined }));
    setSettings((s) => {
      previous = s[field];
      return { ...s, [field]: next };
    });
    let error: string | null = null;
    try {
      const result = await saveScreensaverSetting(field, next);
      if (!result.ok) error = result.error;
    } catch {
      error = SCREENSAVER_WORDS.saveFailed;
    }
    if (!error) {
      setErrors({});
    } else {
      setSettings((s) => ({ ...s, [field]: previous as ScreensaverSettings[F] }));
      setErrors((e) => ({ ...e, [field]: error ?? undefined }));
    }
  }

  function ladderRow(
    field: "startAfterMinutes" | "secondsPerPhoto" | "backToBlackMinutes",
    label: string,
    steps: readonly number[],
    unit: string,
    disabled = false,
  ) {
    const value = settings[field];
    return (
      <Row label={label} error={errors[field]}>
        <LadderStepper
          label={label}
          shownText={`${value} ${unit}`}
          atMin={value <= steps[0]}
          atMax={value >= steps[steps.length - 1]}
          disabled={disabled}
          onStep={(dir) => change(field, stepLadder(steps, value, dir))}
        />
      </Row>
    );
  }

  function switchRow(field: "showClock" | "showCaption" | "showTakenOn" | "sleepEnabled", label: string) {
    return (
      <Row label={label} error={errors[field]}>
        <ToggleSwitch checked={settings[field]} onChange={(next) => change(field, next)} label={label} />
      </Row>
    );
  }

  function sleepRow(field: "sleepStartMinute" | "sleepEndMinute", label: string) {
    const value = settings[field];
    return (
      <Row label={label} error={errors[field]}>
        <LadderStepper
          label={label}
          shownText={formatSleepMinute(value)}
          disabled={!settings.sleepEnabled}
          onStep={(dir) => change(field, stepSleepMinute(value, dir))}
        />
      </Row>
    );
  }

  const sleepOff = !settings.sleepEnabled;

  return (
    <>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">{SCREENSAVER_WORDS.slideshowSection}</h2>
        <div className={CARD_CLASSES}>
          {ladderRow("startAfterMinutes", SCREENSAVER_WORDS.startAfter, START_AFTER_STEPS, SCREENSAVER_WORDS.minUnit)}
          {ladderRow("secondsPerPhoto", SCREENSAVER_WORDS.eachPhoto, SECONDS_PER_PHOTO_STEPS, SCREENSAVER_WORDS.secUnit)}
          <Link
            href="/settings/slideshow"
            className={`${ROW_CLASSES} rounded-b-xl transition-colors active:bg-surface-2`}
          >
            <span>{SCREENSAVER_WORDS.photosRow}</span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-muted">{photoCount}</span>
              <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{SCREENSAVER_WORDS.overlaySection}</h2>
        <div className={CARD_CLASSES}>
          {switchRow("showClock", SCREENSAVER_WORDS.showClock)}
          {switchRow("showCaption", SCREENSAVER_WORDS.showCaption)}
          {switchRow("showTakenOn", SCREENSAVER_WORDS.showTakenOn)}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{SCREENSAVER_WORDS.sleepSection}</h2>
        <div className={CARD_CLASSES}>
          {switchRow("sleepEnabled", SCREENSAVER_WORDS.sleepEnabled)}
          {sleepRow("sleepStartMinute", SCREENSAVER_WORDS.sleepFrom)}
          {sleepRow("sleepEndMinute", SCREENSAVER_WORDS.sleepUntil)}
          {ladderRow("backToBlackMinutes", SCREENSAVER_WORDS.backToBlack, BACK_TO_BLACK_STEPS, SCREENSAVER_WORDS.minUnit, sleepOff)}
        </div>
        <p className="mt-2 text-sm text-muted">{SCREENSAVER_WORDS.backToBlackHelp}</p>
      </section>
    </>
  );
}

function Row({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={ROW_CLASSES}>
        <span>{label}</span>
        {children}
      </div>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
