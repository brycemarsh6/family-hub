import { AvatarBadge } from "./AvatarBadge";
import { StarBank } from "./StarBank";
import { starCountText } from "@/lib/rewardVocabulary";
import type { HouseholdPerson } from "@/lib/householdPeople";

/**
 * The phone's row of people: tap one to see that person's rewards. The chosen
 * chip shows the name; the others show only the avatar and bank, so more fit.
 * The row scrolls sideways when they still do not.
 */
export function RewardPersonChips({
  people,
  banks,
  selectedId,
  onSelect,
}: {
  people: HouseholdPerson[];
  banks: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="group" aria-label="People" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
      {people.map((person) => {
        const selected = person.id === selectedId;
        const bank = banks[person.id] ?? 0;
        return (
          <button
            key={person.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${person.displayName}, ${starCountText(bank)}`}
            onClick={() => onSelect(person.id)}
            className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-base font-bold text-fg transition-colors active:bg-surface-2 ${
              selected ? "border-2 border-accent bg-accent-soft" : "border border-line bg-surface"
            }`}
          >
            <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={32} />
            {selected && <span>{person.displayName}</span>}
            <StarBank stars={bank} />
          </button>
        );
      })}
    </div>
  );
}
