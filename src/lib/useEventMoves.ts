"use client";

import { useLayoutEffect, useOptimistic, useRef, useState } from "react";
import { formatClockTime } from "./calendarDates";
import { SHORT_DAY_NAMES } from "./mealPlanDates";
import { useOptimisticRun } from "./useOptimisticRun";
import type { CalendarEventView } from "./types";

// Mission 70 (C4): what happens after a lifted block is let go on the hour
// timeline. The drop shows the event at its new time at once (useOptimistic,
// the PantryList pattern), saves it, and offers Undo for 5 seconds. A refusal
// puts the event back where it was, gliding there, with the server's reason
// in a warn bar.
//
// useTimelineDrag.ts puts the dropped block down in place with no transition
// and calls `drop` from the touch handler, so the optimistic update must be
// applied synchronously there: `useOptimisticRun`'s `run` applies it first
// thing inside its transition. React renders a discrete touch's updates
// before the next paint, so the block never shows a frame at its old spot.
//
// The save goes through `run` (the one optimistic wrapper, STRUCTURE.md), its
// `onError` carrying the glide back and the warn bar. The action is a closure
// (`move`, CalendarViews passes moveCalendarEvent), so this file never
// imports from `app/`.

type MoveResult = { error?: string };
type MoveAction = (id: string, newStartIso: string) => Promise<MoveResult>;
type Move = { id: string; startAt: Date; endAt: Date };

/** The bar's words after a saved move: "Moved to Wed 2:15 PM". The weekday is
 * named even for today, so every move reads the same way. */
export function movedToText(start: Date): string {
  return `Moved to ${SHORT_DAY_NAMES[start.getDay()]} ${formatClockTime(start)}`;
}

/** The events with one moved, keeping its length. */
export function applyMove(events: CalendarEventView[], move: Move): CalendarEventView[] {
  return events.map((event) =>
    event.id === move.id ? { ...event, startAt: move.startAt, endAt: move.endAt } : event,
  );
}

/** The one bar on screen (UndoBar's props). A new `id` replaces the old bar. */
export type MoveBar = {
  id: number;
  message: string;
  tone: "neutral" | "warn";
  actionLabel?: string;
  onAction?: () => void;
};

/** Where a refused block was shown, so it can glide from there to home. */
type GlideBack = { id: string; homeStartMs: number; left: number; top: number };

/** The event's block on the current page. The neighbour pages either side
 * (PagedTrack) are `inert` and may draw the same event, so they are skipped. */
function blockFor(id: string): HTMLElement | null {
  const blocks = document.querySelectorAll<HTMLElement>(`[data-drag-id="${CSS.escape(id)}"]`);
  return Array.from(blocks).find((block) => !block.closest("[inert]")) ?? null;
}

export function useEventMoves(events: CalendarEventView[], move: MoveAction) {
  const [shown, applyOptimistic] = useOptimistic(events, applyMove);
  const { run } = useOptimisticRun(applyOptimistic);
  const [bar, setBar] = useState<MoveBar | null>(null);
  const barId = useRef(0);
  const glide = useRef<GlideBack | null>(null);

  function showBar(next: Omit<MoveBar, "id">) {
    barId.current += 1;
    setBar({ ...next, id: barId.current });
  }

  // `undo` is true for the Undo button's own move back: no new Undo is offered.
  function save(event: CalendarEventView, newStart: Date, undo: boolean) {
    const from = event.startAt;
    const length = event.endAt.getTime() - from.getTime();
    const target = { id: event.id, startAt: newStart, endAt: new Date(newStart.getTime() + length) };
    run(
      target,
      () => move(event.id, newStart.toISOString()),
      () => {
        if (undo) return;
        showBar({
          message: movedToText(newStart),
          tone: "neutral",
          actionLabel: "Undo",
          onAction: () => {
            setBar(null);
            save({ ...event, startAt: target.startAt, endAt: target.endAt }, from, true);
          },
        });
      },
      (error) => {
        // Still drawn at the new spot: remember it, so the block glides home
        // once the transition ends and the optimistic move falls away.
        const block = blockFor(event.id);
        const rect = block?.getBoundingClientRect();
        if (rect) glide.current = { id: event.id, homeStartMs: from.getTime(), left: rect.left, top: rect.top };
        showBar({ message: error, tone: "warn" });
      },
    );
  }

  // The glide back (FLIP): once the refused event is drawn home again, start
  // it at the spot it was dropped and let its own `translate` transition carry
  // it home. Reduce motion makes that transition instant (globals.css).
  useLayoutEffect(() => {
    const pending = glide.current;
    if (!pending) return;
    const event = shown.find((e) => e.id === pending.id);
    // Other renders can land first while the refused move is still shown.
    if (event && event.startAt.getTime() !== pending.homeStartMs) return;
    glide.current = null;
    const block = blockFor(pending.id);
    if (!block) return;
    const home = block.getBoundingClientRect();
    block.style.transition = "none";
    block.style.translate = `${pending.left - home.left}px ${pending.top - home.top}px`;
    void block.offsetHeight; // commit the start spot before the transition returns
    block.style.transition = "";
    block.style.translate = "";
  }, [shown]);

  function drop(eventId: string, newStart: Date) {
    const event = shown.find((e) => e.id === eventId);
    if (!event) return;
    // A refused earlier drop of this event still waiting to glide home: this
    // newer drop decides where it is drawn now, so that glide is dropped.
    if (glide.current?.id === eventId) glide.current = null;
    setBar(null);
    save(event, newStart, false);
  }

  return { events: shown, drop, bar, closeBar: () => setBar(null) };
}
