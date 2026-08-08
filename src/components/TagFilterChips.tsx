"use client";

export type TagFilterOption = { id: string; name: string };

/**
 * Single-select tag filter chips — the one control shared between All
 * Recipes (C2) and the cookbook page's fuller filter bar (C4), per the
 * plan's "one filter-bar component, used twice" decision. Extracted out of
 * RecipesBrowser rather than duplicated into RecipeFilterBar, so the two
 * surfaces can't quietly drift into two different tag-chip behaviors.
 */
export function TagFilterChips({
  tags,
  selectedTagId,
  onSelect,
  totalCount,
  countFor,
}: {
  tags: TagFilterOption[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
  totalCount: number;
  countFor: (tagId: string) => number;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        <Chip
          active={selectedTagId === null}
          onClick={() => onSelect(null)}
          label={`All (${totalCount})`}
        />
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            active={selectedTagId === tag.id}
            onClick={() => onSelect(tag.id)}
            label={`${tag.name} (${countFor(tag.id)})`}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-line bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );
}
