/**
 * The on/off switch: a 44px-tall hit area around a pill that slides. Lifted
 * out of DashboardCustomizeSheet so Plans & Goals' sheets can share it. The
 * caller owns the state; this only reports the next value.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Spoken by screen readers, e.g. "Show Inventory". */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-14 shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 items-center rounded-full border-2 transition-colors ${
          checked ? "border-transparent bg-accent" : "border-muted bg-surface-2"
        }`}
      >
        <span
          className={`rounded-full transition-transform ${
            checked
              ? "h-6 w-6 translate-x-5 bg-surface shadow"
              : "h-4 w-4 translate-x-1 bg-muted"
          }`}
        />
      </span>
    </button>
  );
}
