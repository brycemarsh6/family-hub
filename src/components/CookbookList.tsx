"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { RadioSheet } from "./RadioSheet";

export type CookbookListItem = {
  id: string;
  title: string;
  count: number;
  /** When a recipe was most recently filed into this book, or null if it's
   * empty — see CookbookRecipe.addedAt in schema.prisma for why this isn't
   * just the cookbook's own updatedAt. */
  mostRecentAddedAt: Date | null;
};

type Sort = "az" | "recent";

/** Cookbook rows (title + count), with an A-Z/most-recent sort sheet — the
 * Cookbooks view of the Recipes page. */
export function CookbookList({ cookbooks }: { cookbooks: CookbookListItem[] }) {
  const [sort, setSort] = useState<Sort>("az");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  if (cookbooks.length === 0) {
    return (
      <EmptyState
        emoji="📚"
        title="No cookbooks yet"
        hint="Tap the + button to start one."
      />
    );
  }

  const sorted = [...cookbooks].sort((a, b) => {
    if (sort === "az") return a.title.localeCompare(b.title);
    const aTime = a.mostRecentAddedAt?.getTime() ?? 0;
    const bTime = b.mostRecentAddedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setSortSheetOpen(true)}
        className="mb-3 flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted"
      >
        <ArrowUpDown aria-hidden="true" size={14} />
        Sort: {sort === "az" ? "A–Z" : "Most recent"}
      </button>

      <ul className="space-y-2">
        {sorted.map((cookbook) => (
          <li key={cookbook.id}>
            <Link
              href={`/kitchen/cooking/recipes/cookbooks/${cookbook.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
            >
              <span className="truncate">{cookbook.title}</span>
              <span className="shrink-0 text-sm text-muted">
                {cookbook.count} {cookbook.count === 1 ? "recipe" : "recipes"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {sortSheetOpen && (
        <RadioSheet
          title="Sort"
          options={[
            { value: "az" as Sort, label: "A–Z" },
            { value: "recent" as Sort, label: "Most recent" },
          ]}
          selected={sort}
          onSelect={setSort}
          onClose={() => setSortSheetOpen(false)}
        />
      )}
    </div>
  );
}
