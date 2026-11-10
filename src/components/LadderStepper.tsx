"use client";

/**
 * A −/+ pair around a ready-made text ("30 min", "10:00 PM"). The QuantityStepper
 * look, for numbers that move along a fixed list instead of by one. The caller
 * works out the next value and which ends are reached; this only reports taps.
 */
export function LadderStepper({
  shownText,
  onStep,
  atMin = false,
  atMax = false,
  disabled = false,
  label,
}: {
  /** What sits between the buttons, unit included. */
  shownText: string;
  onStep: (dir: 1 | -1) => void;
  /** The − button is greyed (the bottom of the list). */
  atMin?: boolean;
  atMax?: boolean;
  /** Greys the whole stepper. */
  disabled?: boolean;
  /** Describes the setting, for screen readers: "Start after". */
  label: string;
}) {
  const buttonClasses =
    "flex h-12 w-12 items-center justify-center rounded-lg text-xl font-medium text-fg transition-colors hover:bg-surface-2 active:bg-line disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={disabled || atMin}
        aria-label={`Decrease ${label}`}
        className={buttonClasses}
      >
        −
      </button>

      <span className={`min-w-16 text-center text-base font-semibold tabular-nums ${disabled ? "opacity-40" : ""}`}>
        {shownText}
      </span>

      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={disabled || atMax}
        aria-label={`Increase ${label}`}
        className={buttonClasses}
      >
        +
      </button>
    </div>
  );
}
