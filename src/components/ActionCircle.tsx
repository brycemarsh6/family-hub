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
 */
export function ActionCircle({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors active:bg-line">
        {icon}
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </button>
  );
}
