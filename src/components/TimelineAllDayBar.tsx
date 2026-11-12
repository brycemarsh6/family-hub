"use client";

// The event and task bars of the all-day strip, moved out of
// TimelineAllDayStrip.tsx (mission 73) so the strip drops below its size cap.
// Moved, not rewritten: the markup and the reasoning comments travelled with
// the code. Sizes: the old 24px row is now `1.5rem` times the zoom text scale
// (`--zoom-text-scale`, set by TimelineGrid beside `--hour-height` from
// `zoomTextScale`; the fallback 1 covers any render outside the timeline), so Text size now grows the row too.

import type { CSSProperties } from "react";
import { avatarColorHex } from "@/lib/constants";
import { personFill } from "@/lib/color";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

const ZOOM = "var(--zoom-text-scale, 1)";
/** The pill's font size and the row height, both zoom-scaled rem. */
export const ALL_DAY_FONT_SIZE = `calc(0.5625rem * ${ZOOM})`;
export const ALL_DAY_ROW_HEIGHT = `calc(1.5rem * ${ZOOM})`;
const ALL_DAY_CORNER_LINE_HEIGHT = `calc(1.375rem * ${ZOOM})`;

/** Font size, height and line height for a pill; with a corner the rows may
 * grow, so the pill pins its own height (see the strip's grid comment). */
export function allDayPillSize(hasCorner: boolean): CSSProperties {
  return {
    fontSize: ALL_DAY_FONT_SIZE,
    lineHeight: hasCorner ? ALL_DAY_CORNER_LINE_HEIGHT : ALL_DAY_ROW_HEIGHT,
    ...(hasCorner ? { height: ALL_DAY_ROW_HEIGHT } : {}),
  };
}

export function AllDayTaskBar({
  task,
  gridColumn,
  gridRow,
  hasCorner,
  onOpen,
}: {
  task: CalendarTaskView;
  gridColumn: string;
  gridRow: number;
  hasCorner: boolean;
  onOpen: () => void;
}) {
  const completed = task.completedAt !== null;
  const colors = task.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
  const fill = personFill(colors, completed, 3);
  // A task is always single-day (CalendarTaskView's own comment:
  // "exactly one due date, never a span"), so unlike an event bar it
  // never has an open/continuing edge to draw — always fully
  // rounded on both sides.
  return (
    <button
      type="button"
      onClick={onOpen}
      // `line-through` (a purely visual text-decoration) is not
      // announced by assistive tech, so "completed" is also said in
      // words here via aria-label — the same reasoning
      // TaskCard.tsx's own aria-label already documents for the
      // identical fact.
      aria-label={completed ? `${task.title}, completed` : task.title}
      className={`truncate rounded border px-1 text-left font-semibold ${
        fill.look === "none"
          ? completed ? "border-muted text-muted" : "border-fg text-fg"
          : `border-transparent ${fill.textClass}`
      }`}
      style={{
        gridColumn,
        gridRow,
        ...fill.style,
        ...allDayPillSize(hasCorner),
      }}
    >
      {/* MonthCell.tsx's own open/completed checkbox glyph
          vocabulary (✓ / ☐) — see that component's own comment for
          the full reasoning on why a glyph exists at all. Paired
          with `line-through` on the title HERE, unlike MonthCell:
          this strip's title is a real visible string at every width
          this file renders (never `sr-only` below `md` the way
          MonthCell's phone-width pill is), so the reason MonthCell
          reaches for a glyph INSTEAD of `line-through` — its title
          is invisible below `md` — doesn't apply here, and both can
          carry the "done" fact together. No `past`-based dimming
          (unlike an event bar, and unlike MonthCell's own task
          handling): TaskCard.tsx's own rule is "only completedAt
          changes how this renders," and that is the one this code
          follows directly rather than replicating MonthCell's
          separate `past` check. */}
      <span aria-hidden="true">{completed ? "✓ " : "☐ "}</span>
      <span className={completed ? "line-through" : ""}>{task.title}</span>
    </button>
  );
}

export function AllDayEventBar({
  event,
  gridColumn,
  gridRow,
  hasCorner,
  continuesBefore,
  continuesAfter,
  onOpen,
}: {
  event: CalendarEventView;
  gridColumn: string;
  gridRow: number;
  hasCorner: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  onOpen: () => void;
}) {
  const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
  // Mission 77: all-day events have no past look today, so they stay solid.
  // The border is transparent (it keeps the box size) unless nobody is on it.
  const fill = personFill(colors, false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`truncate border-y px-1 text-left font-semibold ${
        fill.look === "none" ? "text-fg border-fg" : `border-transparent ${fill.textClass}`
      } ${
        continuesBefore ? "" : "rounded-l border-l"
      } ${continuesAfter ? "" : "rounded-r border-r"}`}
      style={{ gridColumn, gridRow, ...fill.style, ...allDayPillSize(hasCorner) }}
    >
      {event.title}
    </button>
  );
}
