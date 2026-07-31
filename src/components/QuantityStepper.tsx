"use client";

/**
 * A big −/+ pair with the number between them.
 *
 * Typing into a number field is fiddly on a phone and miserable on a wall
 * tablet with wet hands, so quantities are only ever changed by tapping.
 */
export function QuantityStepper({
  value,
  unit,
  onChange,
  min = 0,
  label,
  size = "md",
}: {
  value: number;
  unit?: string | null;
  onChange: (next: number) => void;
  min?: number;
  /** Describes the item, for screen readers: "Bananas". */
  label: string;
  size?: "sm" | "md";
}) {
  const buttonSize = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className={`${buttonSize} flex items-center justify-center rounded-lg text-xl font-medium text-fg transition-colors hover:bg-surface-2 active:bg-line disabled:opacity-30`}
      >
        −
      </button>

      <span
        className={`${textSize} min-w-9 text-center font-semibold tabular-nums`}
      >
        {/* Show "1.5" but not "2.0" — trailing zeroes just add noise. */}
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {unit ? <span className="ml-0.5 font-normal text-muted">{unit}</span> : null}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        className={`${buttonSize} flex items-center justify-center rounded-lg text-xl font-medium text-fg transition-colors hover:bg-surface-2 active:bg-line`}
      >
        +
      </button>
    </div>
  );
}
