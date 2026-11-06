import { Check, Plus, SkipForward } from "lucide-react";

/**
 * The 44px round tap that logs a habit: an outlined "+" until today has its
 * check, then a filled check that taps back to undo.
 * `label` names the habit ("Run"), so the button reads "Log Run" / "Undo Run".
 * `idle="empty"` draws the open state as an empty ring (the Today list) and
 * reads "Mark Run done". `skipped` swaps the tap for a dashed, switched-off
 * marker: a skipped day is left alone until the skip is undone.
 */
export function LogButton({
  done,
  label,
  disabled = false,
  idle = "plus",
  skipped = false,
  onClick,
}: {
  done: boolean;
  label: string;
  disabled?: boolean;
  idle?: "plus" | "empty";
  skipped?: boolean;
  onClick: () => void;
}) {
  if (skipped) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-muted">
        <SkipForward aria-hidden="true" size={18} />
        <span className="sr-only">Skipped today</span>
      </span>
    );
  }
  const open = idle === "empty" ? `Mark ${label} done` : `Log ${label}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={done}
      aria-label={done ? `Undo ${label}` : open}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        done ? "bg-accent text-accent-fg" : "border-2 border-accent bg-surface text-accent"
      }`}
    >
      {done ? (
        <Check aria-hidden="true" size={22} />
      ) : (
        idle === "plus" && <Plus aria-hidden="true" size={22} />
      )}
    </button>
  );
}
