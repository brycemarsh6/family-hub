import { Check } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import type { CalendarPersonView } from "@/lib/types";

/**
 * The "People" `<Field>` — the household roster as toggleable chips, lifted
 * out of EventForm.tsx (mission-13/CT1, contract C1) as part of getting that
 * file back under STRUCTURE.md's 350-line soft cap. Pure display + a single
 * `onToggle` callback; EventForm still owns `selectedUserIds` as its own
 * state.
 */
export function EventPeopleField({
  people,
  selectedUserIds,
  onToggle,
}: {
  people: CalendarPersonView[];
  selectedUserIds: string[];
  onToggle: (userId: string) => void;
}) {
  return (
    <Field label="People">
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const selected = selectedUserIds.includes(person.userId);
          return (
            <button
              key={person.userId}
              type="button"
              onClick={() => onToggle(person.userId)}
              aria-pressed={selected}
              className={`flex min-h-12 items-center gap-2 rounded-full border px-3 pl-1.5 text-left text-sm font-medium transition-colors ${
                selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-muted"
              }`}
            >
              <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={32} />
              <span>{person.displayName}</span>
              {/* mission-16/C8 — the app annotating a STATUS, not a longer
                  name: a muted tone is this app's existing "the app is
                  talking, not the data" signal (the same instinct as the
                  `~` estimate mark on a shelf-life guess), applied here
                  rather than the old version of this field's caller, which
                  suffixed `displayName` itself with this exact string — a
                  fix that read as a longer name (same weight, same color
                  as the real one) and, worse, got echoed back into local
                  state on save, doubling on a second edit in one sitting.
                  `font-normal` (this button is `font-medium` throughout)
                  is what keeps the marker distinct from the name even in
                  the SELECTED chip, where `--muted` measured 4.35:1 on
                  `--accent-soft` — under the 4.5:1 floor, and this chip's
                  default state (an already-assigned deactivated person
                  opens pre-selected). mission-16/C10 — `--muted-strong`
                  (globals.css) fixes that: 4.76:1 on `--accent-soft` /
                  5.88:1 on `--surface`, both themes. Deliberately used in
                  BOTH the selected and unselected branches, not just the
                  one that was failing, so the token means one thing.
                  What that actually buys, measured in gate round 3 rather
                  than assumed: in the SELECTED chip the marker is
                  separated from the name by colour AND weight (1.34:1
                  light / 1.86:1 dark, plus 400 vs 500). In the UNSELECTED
                  chip the name is `--muted` and the marker
                  `--muted-strong` — only **1.09:1** apart (1.20:1 dark),
                  perceptually identical — so there the annotation signal
                  is still weight and the parentheses, exactly as before.
                  An earlier version of this comment claimed colour
                  separation "everywhere the marker appears"; that does not
                  render, and overclaiming comments are this project's
                  named defect class. */}
              {person.deactivated && (
                <span className="font-normal text-muted-strong">(no longer active)</span>
              )}
              {selected && <Check aria-hidden="true" size={16} className="text-accent" />}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Local to this file, matching the house pattern of a small private
 * `Field` wrapper per form component (RecipeForm.tsx, PantryItemEditSheet.tsx,
 * etc. each keep their own rather than sharing one). */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      <span className="mb-1 flex items-baseline justify-between">
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}
