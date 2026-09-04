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
              {person.displayName}
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
