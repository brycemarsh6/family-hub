"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, BookX } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { SwipeActions } from "./SwipeActions";
import { searchRecipes } from "@/lib/match";

export type RecipeListItem = {
  id: string;
  title: string;
  ingredients: string;
};

const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

/** First-letter bucket for a title: A-Z, or "#" for anything else (digits,
 * symbols, or an empty title, though the form doesn't allow the last one). */
function letterOf(title: string): string {
  const first = title.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

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
  emptyHint = "Tap the + button to add one.",
}: {
  recipes: RecipeListItem[];
  onRemove?: (recipeId: string) => void;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  // The letter currently under a finger on the rail, for visual feedback —
  // not tied to scroll position, since scrollIntoView's animation means
  // "what section is on screen" and "what you're touching" briefly disagree.
  const [pressedLetter, setPressedLetter] = useState<string | null>(null);

  const railRef = useRef<HTMLDivElement>(null);
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
    <div>
      <div ref={searchWrapperRef} className="relative mb-3">
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

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title={`No matches for "${query.trim()}"`}
            hint="Search checks both the title and the ingredients."
          />
        ) : (
          <ul className="space-y-2">
            {searchResults.map((recipe) => (
              <RecipeRow key={recipe.id} recipe={recipe} onRemove={onRemove} />
            ))}
          </ul>
        )
      ) : sorted.length === 0 ? (
        <EmptyState emoji="📖" title="No recipes yet" hint={emptyHint} />
      ) : (
        <div className="relative pr-8">
          <div>
            {ALPHABET.filter((letter) => groups.has(letter)).map((letter) => (
              <section
                key={letter}
                ref={(el) => {
                  if (el) sectionRefs.current.set(letter, el);
                  else sectionRefs.current.delete(letter);
                }}
                className="scroll-mt-16"
              >
                {/* The scroll target is this plain section, not the sticky
                    heading below — scrollIntoView's "smooth" behavior doesn't
                    reliably compute a target against a position: sticky
                    element (it's already visually "in place" once stuck, so
                    Chromium can compute zero scroll distance). A normal-flow
                    wrapper doesn't have that problem, and starts in the same
                    spot the heading would anyway. */}
                <h2 className="sticky top-16 z-10 -mx-4 bg-bg px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
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

          {/* The jump rail. Pinned to the viewport's right edge (not the
              content column) so it's reachable at a phone's actual screen
              edge, same as the iPhone contacts rail it's modeled on. */}
          <div
            ref={railRef}
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
            onPointerCancel={handlePointerUp}
            style={{ top: railTop ?? 140, bottom: "4.5rem" }}
            className="fixed right-0 z-30 flex w-7 touch-none select-none flex-col items-center justify-between py-1"
          >
            {ALPHABET.map((letter) => {
              const hasRecipes = groups.has(letter);
              return (
                <span
                  key={letter}
                  aria-hidden="true"
                  className={`text-[10px] font-semibold leading-none transition-colors ${
                    !hasRecipes
                      ? "text-line"
                      : pressedLetter === letter
                        ? "text-accent"
                        : "text-muted"
                  }`}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeRow({
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
