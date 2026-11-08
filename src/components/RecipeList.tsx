"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, BookX } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { SwipeActions } from "./SwipeActions";
import { searchRecipes } from "@/lib/match";
import { useHamburgerRowHeight } from "@/lib/appChrome";
import { columnCountFor, splitByWeight } from "@/lib/splitColumns";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { ALPHABET, RecipeLetterRail } from "./RecipeLetterRail";

export type RecipeListItem = {
  id: string;
  title: string;
  ingredients: string;
};

/** First-letter bucket for a title: A-Z, or "#" for anything else (digits,
 * symbols, or an empty title, though the form doesn't allow the last one). */
function letterOf(title: string): string {
  const first = title.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

const GRID_CLASS = "grid items-start gap-x-4";

/**
 * Recipes browsed A-Z with a slide-to-jump rail, or searched — same
 * grouped-view/flat-ranked-view split Inventory already established, plus a
 * jump rail Inventory has no equivalent of.
 *
 * `onRemove`, when passed, wraps every row in a swipe-to-reveal "Remove"
 * action — used by the cookbook detail page (Recipes v2's C1 phase) to
 * unfile a recipe from that cookbook without touching the recipe itself.
 * Tone is "neutral", not "danger": unlike deleting a recipe, unfiling is
 * reversible (it can be added right back), same reasoning as Shopping's
 * Edit action. Omitted entirely on the All Recipes view, which has no such
 * per-row action.
 */
export function RecipeList({
  recipes,
  onRemove,
  emptyTitle = "No recipes yet",
  emptyHint = "Tap the + button to add one.",
  filters,
}: {
  recipes: RecipeListItem[];
  onRemove?: (recipeId: string) => void;
  emptyTitle?: string;
  emptyHint?: string;
  /** Rendered in the same row as the search box on wide screens (above it
   * on phones). It lives inside the measured search wrapper on purpose: the
   * rail's `railTop` is read from that wrapper's bottom edge, so whatever
   * sits beside or above the search box must be inside it. */
  filters?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  // The letter currently under a finger on the rail, for visual feedback —
  // not tied to scroll position, since scrollIntoView's animation means
  // "what section is on screen" and "what you're touching" briefly disagree.
  const [pressedLetter, setPressedLetter] = useState<string | null>(null);

  const railRef = useRef<HTMLDivElement>(null);
  // Wide pages split the letters (or the search results) into 2 or 3
  // columns, decided from the order and row counts only, never from pixel
  // heights (src/lib/splitColumns.ts), so a letter never hops columns. CSS
  // `columns` would balance by height and is not used. The ref is on the
  // always-mounted outer div so the width is measured in every view.
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = columnCountFor(useContainerWidth(gridRef), 3);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  // The rail spans from just below the search box to just above the bottom
  // nav. Measured at runtime rather than a guessed pixel offset — the sticky
  // header and the title/count/New-button row above the search box aren't a
  // fixed height (the title alone grows from text-2xl to md:text-3xl at the
  // md breakpoint), so a hardcoded top would either overlap the New button on
  // some screens or leave a gap on others.
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [railTop, setRailTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = searchWrapperRef.current;
    if (!el) return;

    function measure() {
      setRailTop(el!.getBoundingClientRect().bottom + 8);
    }
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // mission-16/C6: the letter headings below are `position: sticky`, so
  // they need to sit exactly this far below the viewport's top edge or the
  // floating hamburger button (mission-23) covers their top. The hook
  // reads that button's real bottom edge, safe-area inset included. The
  // rail's OWN `railTop` measurement just above is a different job (it
  // positions the A-Z rail against this page's search box) and correctly
  // keeps its own separate `ResizeObserver`.
  const stickyOffset = useHamburgerRowHeight();

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => a.title.localeCompare(b.title)),
    [recipes],
  );

  const searchResults = query.trim() ? searchRecipes(query, sorted) : null;

  const groups = useMemo(() => {
    const byLetter = new Map<string, RecipeListItem[]>();
    for (const recipe of sorted) {
      const letter = letterOf(recipe.title);
      const group = byLetter.get(letter);
      if (group) group.push(recipe);
      else byLetter.set(letter, [recipe]);
    }
    return byLetter;
  }, [sorted]);

  const lettersWithRecipes = ALPHABET.filter((letter) => groups.has(letter));
  const columnLetters = splitByWeight(lettersWithRecipes, columns, (l) => groups.get(l)!.length + 1);
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  function scrollToLetter(letter: string) {
    const section = sectionRefs.current.get(letter);
    if (!section) return; // empty letter — inert, nothing to jump to
    // "instant", not "smooth" — this fires on every pointermove during a
    // drag, so the list needs to track a moving finger in real time. Queuing
    // a separate smooth animation per letter crossed would make the list
    // visibly lag behind a fast swipe instead of tracking it.
    section.scrollIntoView({ behavior: "instant", block: "start" });
    setPressedLetter(letter);
  }

  /** Maps a touch/pointer Y position to a letter by where it falls in the
   * rail's own height — this is what makes the rail one continuous surface
   * instead of 27 separate sub-48px buttons. */
  function jumpToClientY(clientY: number) {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const relative = Math.min(Math.max(clientY - rect.top, 0), rect.height - 1);
    const index = Math.floor((relative / rect.height) * ALPHABET.length);
    scrollToLetter(ALPHABET[Math.min(index, ALPHABET.length - 1)]);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Without this, a mouse-drag starting on the rail still runs the
    // browser's native text-selection gesture underneath it — pointer
    // capture reroutes event dispatch, but doesn't on its own suppress that
    // default action.
    event.preventDefault();
    // Captures the pointer so drags that wander off this narrow strip
    // horizontally keep reporting to it — precision comes from the whole
    // gesture being tracked, not from hitting a thin target dead-on.
    event.currentTarget.setPointerCapture(event.pointerId);
    jumpToClientY(event.clientY);
  }

  function handlePointerUp() {
    setPressedLetter(null);
  }

  return (
    <div ref={gridRef}>
      <div ref={searchWrapperRef} className="@container mb-3">
        <div className="flex flex-col gap-3 @min-[64rem]:flex-row @min-[64rem]:items-center">
          {filters && (
            <div className="order-first @min-[64rem]:order-none @min-[64rem]:min-w-0">
              {filters}
            </div>
          )}
          <div className="relative @min-[64rem]:min-w-[16rem] @min-[64rem]:flex-1">
            <Search
              aria-hidden="true"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              inputMode="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes…"
              className="min-h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-base placeholder:text-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X aria-hidden="true" size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title={`No matches for "${query.trim()}"`}
            hint="Search checks both the title and the ingredients."
          />
        ) : (
          <div className={GRID_CLASS} style={gridStyle}>
            {splitByWeight(searchResults, columns, () => 1).map((column, i) => (
              <ul key={i} className="space-y-2">
                {column.map((recipe) => (
                  <RecipeRow key={recipe.id} recipe={recipe} onRemove={onRemove} />
                ))}
              </ul>
            ))}
          </div>
        )
      ) : sorted.length === 0 ? (
        <EmptyState emoji="📖" title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className="relative pr-8">
          <div className={GRID_CLASS} style={gridStyle}>
            {columnLetters.map((letters, i) => (
              <div key={i}>
                {letters.map((letter) => (
                  <section
                    key={letter}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(letter, el);
                      else sectionRefs.current.delete(letter);
                    }}
                    style={{ scrollMarginTop: stickyOffset }}
                  >
                    {/* The scroll target is this plain section, not the sticky
                        heading below — scrollIntoView's "smooth" behavior
                        doesn't reliably compute a target against a position:
                        sticky element (it's already visually "in place" once
                        stuck, so Chromium can compute zero scroll distance).
                        A normal-flow wrapper doesn't have that problem, and
                        starts in the same spot the heading would anyway. */}
                    <h2
                      style={{ top: stickyOffset }}
                      className={`sticky z-10 bg-bg py-1.5 text-sm font-semibold uppercase tracking-wide text-muted ${
                        // The bleed to the page edge is for one column; in a
                        // column it would overlap the neighbour.
                        columns > 1 ? "" : "-mx-4 px-4"
                      }`}
                    >
                      {letter}
                    </h2>
                    <ul className="mb-2 space-y-2 py-1">
                      {groups.get(letter)!.map((recipe) => (
                        <RecipeRow key={recipe.id} recipe={recipe} onRemove={onRemove} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
          </div>

          {/* The jump rail. Pinned to the viewport's right edge (not the
              content column) so it's reachable at a phone's actual screen
              edge, same as the iPhone contacts rail it's modeled on. It sits
              outside the column grid above (STRUCTURE.md "Wide pages",
              rule 1). */}
          <RecipeLetterRail
            railRef={railRef}
            railTop={railTop}
            pressedLetter={pressedLetter}
            hasLetter={(letter) => groups.has(letter)}
            onPointerDown={handlePointerDown}
            onPointerMove={(event) => {
              // Requires an active press for every pointer type (touch
              // contact and a held mouse button both report buttons === 1) —
              // without this, a mouse merely hovering over the rail would
              // jump-scroll the page just from passing over it.
              if (event.buttons !== 1) return;
              jumpToClientY(event.clientY);
            }}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}
    </div>
  );
}

/** Exported for reuse by FlatRecipeRows (the cookbook page's C4 filtered
 * view), which needs the exact same row + swipe-to-remove behavior without
 * RecipeList's own A-Z grouping/rail/search — a flat, already-filtered list
 * is a fundamentally different shape than "browse the whole library." */
export function RecipeRow({
  recipe,
  onRemove,
}: {
  recipe: RecipeListItem;
  onRemove?: (recipeId: string) => void;
}) {
  // Same composition SwipeActions already establishes on GroceryRow/PantryRow:
  // the border/background/rounding live on the <li> once a row is wrapped in
  // SwipeActions (whose own inner div already paints bg-surface), so the
  // content itself carries none of that — otherwise a swipe-wrapped row would
  // show a double border. The plain (non-cookbook) row keeps its own
  // border/bg directly, since it's never wrapped.
  const link = (
    <Link
      href={`/kitchen/cooking/recipes/${recipe.id}`}
      className={`flex min-h-14 items-center px-4 text-base font-medium transition-colors active:bg-surface-2 ${
        onRemove ? "" : "rounded-xl border border-line bg-surface"
      }`}
    >
      {recipe.title}
    </Link>
  );

  if (!onRemove) return <li>{link}</li>;

  return (
    <li className="rounded-xl border border-line bg-surface">
      <SwipeActions
        actions={[
          {
            label: "Remove",
            accessibleLabel: `Remove ${recipe.title} from this cookbook`,
            icon: <BookX aria-hidden="true" size={18} />,
            onAction: () => onRemove(recipe.id),
            tone: "neutral",
          },
        ]}
      >
        {link}
      </SwipeActions>
    </li>
  );
}
