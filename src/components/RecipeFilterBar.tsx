"use client";

import { useState } from "react";
import { Search, Star, ArrowUpDown } from "lucide-react";
import { TagFilterChips, type TagFilterOption } from "./TagFilterChips";
import { RadioSheet } from "./RadioSheet";
import { TIME_BUCKET_LABELS, type TimeBucket } from "@/lib/recipeTimeFilter";
import type { RecipeFilterState, SortOption } from "@/lib/recipeFilters";

const TIME_BUCKETS: TimeBucket[] = ["under30", "30to60", "over60"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "az", label: "A–Z" },
  { value: "rating", label: "Highest rated" },
  { value: "cooked", label: "Recently cooked" },
];

/**
 * The full filter bar: search, Tags, Total time, Cooked, Rating, Sort —
 * used on the cookbook page (Recipes v2's C4 phase). All Recipes only ever
 * needed the Tags portion (see TagFilterChips, extracted out so the two
 * surfaces share one implementation rather than drifting).
 *
 * Deliberately "controlled" — the caller owns the RecipeFilterState and
 * passes it straight to recipeFilters.ts's applyRecipeFilters, so the
 * filtering *logic* stays out of this component entirely and is testable
 * on its own.
 */
export function RecipeFilterBar({
  filters,
  onFiltersChange,
  tags,
  totalCount,
  tagCountFor,
}: {
  filters: RecipeFilterState;
  onFiltersChange: (filters: RecipeFilterState) => void;
  tags: TagFilterOption[];
  totalCount: number;
  tagCountFor: (tagId: string) => number;
}) {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  function update(partial: Partial<RecipeFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <label className="relative block">
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Search recipes…"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-base outline-none placeholder:text-muted"
        />
      </label>

      <TagFilterChips
        tags={tags}
        selectedTagId={filters.tagId}
        onSelect={(tagId) => update({ tagId })}
        totalCount={totalCount}
        countFor={tagCountFor}
      />

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          <Chip
            active={filters.timeBucket === "all"}
            onClick={() => update({ timeBucket: "all" })}
            label="Any time"
          />
          {TIME_BUCKETS.map((bucket) => (
            <Chip
              key={bucket}
              active={filters.timeBucket === bucket}
              onClick={() => update({ timeBucket: bucket })}
              label={TIME_BUCKET_LABELS[bucket]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Chip
          active={filters.cookedOnly}
          onClick={() => update({ cookedOnly: !filters.cookedOnly })}
          label="Cooked"
        />

        {/* Rating: "at least N stars." Tapping the already-active threshold
            clears it, same convention RecipeStars itself uses. */}
        <div className="flex items-center gap-0.5" role="group" aria-label="Minimum rating">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = filters.minRating !== null && value <= filters.minRating;
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  update({ minRating: filters.minRating === value ? null : value })
                }
                aria-label={`${value}+ stars`}
                aria-pressed={filters.minRating === value}
                className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:bg-surface-2"
              >
                <Star
                  aria-hidden="true"
                  size={18}
                  className={active ? "fill-warn text-warn" : "text-line"}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSortSheetOpen(true)}
          className="ml-auto flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted"
        >
          <ArrowUpDown aria-hidden="true" size={14} />
          {SORT_OPTIONS.find((option) => option.value === filters.sort)?.label}
        </button>
      </div>

      {sortSheetOpen && (
        <RadioSheet
          title="Sort"
          options={SORT_OPTIONS}
          selected={filters.sort}
          onSelect={(sort) => update({ sort })}
          onClose={() => setSortSheetOpen(false)}
        />
      )}
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
