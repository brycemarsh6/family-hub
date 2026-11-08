"use client";

export const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

/**
 * The A-Z jump rail, moved out of RecipeList as is. It is `fixed` to the
 * viewport edge, so it sits outside the column grid on purpose
 * (STRUCTURE.md "Wide pages", rule 1). All the behaviour (what a press or a
 * drag does) stays in RecipeList and arrives as props.
 */
export function RecipeLetterRail({
  railRef,
  railTop,
  pressedLetter,
  hasLetter,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  railRef: React.RefObject<HTMLDivElement | null>;
  railTop: number | null;
  pressedLetter: string | null;
  hasLetter: (letter: string) => boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
}) {
  return (
    <div
      ref={railRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // Bottom is a class so wide pages can end the rail above the +
      // (decision 266: the + sits bottom-right there).
      style={{ top: railTop ?? 140 }}
      className="bottom-[calc(1rem+env(safe-area-inset-bottom))] md:[body:has([data-page-width=wide])_&]:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] fixed right-0 z-30 flex w-7 touch-none select-none flex-col items-center justify-between py-1"
    >
      {ALPHABET.map((letter) => {
        const hasRecipes = hasLetter(letter);
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
  );
}
