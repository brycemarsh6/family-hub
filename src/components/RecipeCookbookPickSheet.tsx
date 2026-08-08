"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";

export type CookbookOption = { id: string; title: string };

/**
 * File/unfile this recipe into cookbooks, from the recipe's own side — the
 * C1 join (CookbookRecipe) reused, just entered from the opposite direction
 * of AddRecipeToCookbookSheet (which adds a recipe to one cookbook from
 * that cookbook's page). No rename/delete here — that already lives on the
 * cookbook's own page; this sheet is only ever about membership.
 */
export function RecipeCookbookPickSheet({
  selectedCookbookIds,
  allCookbooks,
  onToggle,
  onClose,
}: {
  selectedCookbookIds: string[];
  allCookbooks: CookbookOption[];
  onToggle: (cookbook: CookbookOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? allCookbooks.filter((c) => c.title.toLowerCase().includes(normalized))
    : allCookbooks;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookbooks"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cookbooks</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {allCookbooks.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted">
            No cookbooks yet — start one from the Recipes page.
          </p>
        ) : (
          <>
            <label className="relative mb-2 block">
              <Search
                aria-hidden="true"
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cookbooks…"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl bg-surface-2 pl-10 pr-4 text-base outline-none placeholder:text-muted"
              />
            </label>

            <div className="flex flex-col gap-1">
              {filtered.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">
                  No cookbooks match that search.
                </p>
              ) : (
                filtered.map((cookbook) => {
                  const isSelected = selectedCookbookIds.includes(cookbook.id);
                  return (
                    <button
                      key={cookbook.id}
                      type="button"
                      onClick={() => onToggle(cookbook)}
                      className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
                    >
                      <span className="truncate">{cookbook.title}</span>
                      {isSelected && (
                        <Check aria-hidden="true" size={18} className="shrink-0 text-accent" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
