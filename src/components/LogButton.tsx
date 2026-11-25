import { Check, Plus, SkipForward } from "lucide-react";
import { SKIPPED_TODAY_LABEL } from "@/lib/habitVocabulary";

/** The 30px check circle drawn inside every 44px tap, so the circles match. */
export const CHECK_CIRCLE_CLASS = "flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full";

/**
 * The read-only check circle (a row the viewer may not tick, or a done mark
 * with nothing to tap): a 30px circle inside the same 44px box as the button,
 * filled with a check when done. The screen reader hears `srText`.
 */
export function CheckMarker({ done, srText }: { done: boolean; srText: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center">
      <span
        className={`${CHECK_CIRCLE_CLASS} ${
          done ? "bg-accent text-accent-fg" : "border-2 border-line-strong"
        }`}
      >
        {done && <Check aria-hidden="true" size={16} />}
      </span>
      <span className="sr-only">{srText}</span>
    </span>
  );
}

/**
 * The round tap that logs a habit: an outlined "+" until today has its
 * check, then a filled check that taps back to undo. It is a 44px tap target
 * drawing a 30px circle.
 * `label` names the habit ("Run"), so the button reads "Log Run" / "Undo Run".
 * `idle="empty"` draws the open state as an empty ring (the Today list) and
 * reads "Mark Run done". `forName` names whose check it is on a shared screen
 * ("Mark Run done for Emily"). `skipped` swaps the tap for a dashed, switched-off
 * marker: a skipped day is left alone until the skip is undone.
 * `skippedLabel` is what that marker says to a screen reader (default "Skipped today").
 */
export function LogButton({
  done,
  label,
  forName,
  disabled = false,
  idle = "plus",
  skipped = false,
  skippedLabel = SKIPPED_TODAY_LABEL,
  onClick,
}: {
  done: boolean;
  label: string;
  forName?: string;
  disabled?: boolean;
  idle?: "plus" | "empty";
  skipped?: boolean;
  skippedLabel?: string;
  onClick: () => void;
}) {
  if (skipped) {
    return (
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <span className={`${CHECK_CIRCLE_CLASS} border-2 border-dashed border-line-strong text-muted`}>
          <SkipForward aria-hidden="true" size={14} />
        </span>
        <span className="sr-only">{skippedLabel}</span>
      </span>
    );
  }
  const open = idle === "empty" ? `Mark ${label} done` : `Log ${label}`;
  const suffix = forName ? ` for ${forName}` : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={done}
      aria-label={`${done ? `Undo ${label}` : open}${suffix}`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
    >
      <span
        className={`${CHECK_CIRCLE_CLASS} transition-colors ${
          done ? "bg-accent text-accent-fg" : "border-2 border-accent bg-surface text-accent"
        }`}
      >
        {done ? (
          <Check aria-hidden="true" size={16} />
        ) : (
          idle === "plus" && <Plus aria-hidden="true" size={16} />
        )}
      </span>
    </button>
  );
}
