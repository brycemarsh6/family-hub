"use client";

/**
 * The round icon-over-label button used by the Calendar branch's header
 * (Today / Week-Day switcher) and by RecipeActionCircles (Meal Plan /
 * Groceries / Share). One shared component, per mission-8's Captain
 * finding (pass 1) that two independent copies had already started to
 * drift — the calendar's own copy had grown a `disabled` state
 * (paging/Today can go inert; a recipe's action never does) that the
 * Recipes copy never needed. This file is that superset: every existing
 * caller passes `disabled={false}` implicitly (the default), so hoisting
 * it is a zero-behavior move, not a redesign.
 *
 * `size="sm"` (mission-23) is the Calendar header's compact look, sitting
 * on the hamburger's row: a 44px circle (DESIGN.md's floor for compact
 * controls), a 20px icon the caller passes in, and an 11px label.
 *
 * `active` (mission 78) fills the circle with the accent, and `badge` puts a
 * small count chip at its top right (only above zero): the Calendar's Filter
 * circle uses both to show a filter is on.
 */
export function ActionCircle({
  icon,
  label,
  onClick,
  disabled = false,
  size = "md",
  badge = 0,
  active = false,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "md" | "sm";
  badge?: number;
  active?: boolean;
  /** Spoken name when the visible label plus the chip would read badly (e.g. "1Filtered"). */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <span
        className={`relative flex items-center justify-center rounded-full transition-colors ${
          active ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg active:bg-line"
        } ${size === "sm" ? "h-11 w-11" : "h-14 w-14"}`}
      >
        {icon}
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-fg px-1 ring-2 ring-bg text-[0.6875rem] font-bold leading-none text-bg">
            {badge}
          </span>
        )}
      </span>
      <span
        className={`font-medium text-muted ${size === "sm" ? "text-[0.6875rem] leading-4" : "text-xs"}`}
      >
        {label}
      </span>
    </button>
  );
}
