/**
 * A labelled row of tappable ideas ("Ideas for Health"). Tapping one hands the
 * words back so the form can fill a field; it never submits anything. Neutral
 * style on purpose: nothing here is "selected".
 */
export function IdeaChips({
  label,
  ideas,
  onPick,
}: {
  label: string;
  ideas: readonly string[];
  onPick: (idea: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="text-sm text-muted">
      <span className="mb-2 block">{label}</span>
      <div className="flex flex-wrap gap-2">
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => onPick(idea)}
            className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-left text-sm font-medium text-muted transition-colors active:bg-surface-2"
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );
}
