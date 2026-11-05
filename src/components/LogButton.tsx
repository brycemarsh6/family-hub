import { Check, Plus } from "lucide-react";

/**
 * The 44px round tap that logs a habit: an outlined "+" until today has its
 * check, then a filled check that taps back to undo.
 * `label` names the habit ("Run"), so the button reads "Log Run" / "Undo Run".
 */
export function LogButton({
  done,
  label,
  disabled = false,
  onClick,
}: {
  done: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={done}
      aria-label={done ? `Undo ${label}` : `Log ${label}`}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        done ? "bg-accent text-accent-fg" : "border-2 border-accent bg-surface text-accent"
      }`}
    >
      {done ? <Check aria-hidden="true" size={22} /> : <Plus aria-hidden="true" size={22} />}
    </button>
  );
}
