"use client";

export type Person = { id: string; displayName: string };

/** The pill every chip row in the habit form uses (the same look as ThisWeekList's filter chips). */
export function chipClass(selected: boolean): string {
  return `flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
    selected ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-fg"
  }`;
}

/**
 * Who a Together or Side by side habit is for: an "Everyone" chip, then one
 * chip per person. Everyone picks the whole family and sets the flag (decision
 * 87); tapping a person by hand clears it. The caller owns the state.
 */
export function ParticipantPicker({
  people,
  selectedIds,
  everyone,
  onChange,
}: {
  people: Person[];
  selectedIds: string[];
  everyone: boolean;
  onChange: (next: { selectedIds: string[]; everyone: boolean }) => void;
}) {
  function toggleEveryone() {
    if (everyone) onChange({ selectedIds, everyone: false });
    else onChange({ selectedIds: people.map((person) => person.id), everyone: true });
  }

  function togglePerson(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id];
    onChange({ selectedIds: next, everyone: false });
  }

  return (
    <div role="group" aria-label="People" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={everyone} onClick={toggleEveryone} className={chipClass(everyone)}>
        Everyone
      </button>
      {people.map((person) => {
        const selected = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            type="button"
            aria-pressed={selected}
            onClick={() => togglePerson(person.id)}
            className={chipClass(selected)}
          >
            {person.displayName}
          </button>
        );
      })}
    </div>
  );
}
