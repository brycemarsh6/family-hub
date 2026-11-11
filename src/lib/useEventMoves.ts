"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState } from "react";
import { formatClockTime } from "./calendarDates";
import { HOUSEHOLD_TIME_ZONE } from "./constants";
import { calendarDateInZone, calendarDaysBetween, minuteOfDayInZone, zoneOffsetMs } from "./householdDate";
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
// Mission 71: a dropped event that is one day of a repeating Google series
// does not save at once. It stays where it was dropped (lifted look kept) and
// `repeatSheet` asks: This one (the save above, unchanged), All of them
// (every visible day of the series shifts by the same wall-clock minutes, then
// `moveSeries`, whose result carries the Undo's event id), or Cancel (glides
// home, nothing saved).
//
// The save goes through `run` (the one optimistic wrapper, STRUCTURE.md), its
// `onError` carrying the glide back and the warn bar. The action is a closure
// (`move`, CalendarViews passes moveCalendarEvent), so this file never
// imports from `app/`.

type MoveResult = { error?: string };
type MoveAction = (id: string, newStartIso: string) => Promise<MoveResult>;
type SeriesUndo = { eventId: string; startIso: string };
type SeriesAction = (id: string, newStartIso: string) => Promise<MoveResult & { undo?: SeriesUndo }>;
type Move = { id: string; startAt: Date; endAt: Date };
/** Every day of one series shifted by wall-clock minutes. */
type SeriesShift = { seriesId: string; minutes: number };

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

/** The bar's words after "All of them" saved: "Moved every Wake Up to 7:30 AM". */
export function movedAllText(title: string, start: Date): string {
  return `Moved every ${title} to ${formatClockTime(start)}`;
}

/**
 * How many wall-clock minutes a drop moves the whole series by, or null when
 * the drop is on another household day (then only "This one" is offered).
 * The same rule as the server's planSeriesShift, read in the household zone.
 */
export function seriesShiftMinutes(event: CalendarEventView, newStart: Date): number | null {
  const zone = HOUSEHOLD_TIME_ZONE;
  const days = calendarDaysBetween(calendarDateInZone(event.startAt, zone), calendarDateInZone(newStart, zone));
  if (days !== 0) return null;
  return minuteOfDayInZone(newStart, zone) - minuteOfDayInZone(event.startAt, zone);
}

/** One instant moved by wall-clock minutes in the household zone (7:00 is 7:30 after +30 on any day, clock changes included); the server's arithmetic. */
export function shiftWallClock(instant: Date, minutes: number): Date {
  const zone = HOUSEHOLD_TIME_ZONE;
  const target = instant.getTime() + zoneOffsetMs(instant, zone) + minutes * 60000;
  const first = target - zoneOffsetMs(new Date(target), zone);
  return new Date(target - zoneOffsetMs(new Date(first), zone));
}

/** The events with every day of one series shifted; the others are the same objects. */
export function applySeriesShift(events: CalendarEventView[], shift: SeriesShift): CalendarEventView[] {
  return events.map((event) =>
    event.seriesId === shift.seriesId
      ? { ...event, startAt: shiftWallClock(event.startAt, shift.minutes), endAt: shiftWallClock(event.endAt, shift.minutes) }
      : event,
  );
}

/** What the optimistic list can be asked to show. */
type Change = Move | SeriesShift;
function applyChange(events: CalendarEventView[], change: Change): CalendarEventView[] {
  return "seriesId" in change ? applySeriesShift(events, change) : applyMove(events, change);
}

/** The Undo button's call after "All of them": the server's event id and original start, and the shift back. */
export function seriesUndoRequest(undo: SeriesUndo, minutes: number) {
  return { eventId: undo.eventId, startIso: undo.startIso, minutes: -minutes };
}

/** What RepeatMoveSheet shows and does (CalendarViews just hands it over). */
export type RepeatSheetProps = {
  title: string;
  /** Where it is going: "Thu 7:30 AM". */
  where: string;
  /** False on another household day: no All of them, and the sheet says why. */
  sameDay: boolean;
  onThisOne: () => void;
  onAll: () => void;
  onCancel: () => void;
};

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

/** Notes where the event's block is drawn now, to glide home from. */
function glideFrom(event: CalendarEventView): GlideBack | null {
  const rect = blockFor(event.id)?.getBoundingClientRect();
  return rect ? { id: event.id, homeStartMs: event.startAt.getTime(), left: rect.left, top: rect.top } : null;
}

export function useEventMoves(events: CalendarEventView[], move: MoveAction, moveSeries: SeriesAction) {
  const [shown, applyOptimistic] = useOptimistic(events, applyChange);
  const { run } = useOptimisticRun(applyOptimistic);
  const [bar, setBar] = useState<MoveBar | null>(null);
  // A repeating event's drop waiting on the sheet. It stays drawn where it was dropped.
  const [pending, setPending] = useState<{ event: CalendarEventView; newStart: Date } | null>(null);
  const barId = useRef(0);
  const glide = useRef<GlideBack[]>([]);
  const latest = useRef(events);
  useEffect(() => {
    latest.current = events;
  });

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
        const spot = glideFrom(event);
        if (spot) glide.current = [...glide.current.filter((g) => g.id !== spot.id), spot];
        showBar({ message: error, tone: "warn" });
      },
    );
  }

  // "All of them": every visible day of the series shifts by `minutes`; the
  // server moves Google's series and answers with where Undo points.
  function saveSeries(eventId: string, seriesId: string, title: string, newStart: Date, minutes: number, undo: boolean) {
    let undoTo: SeriesUndo | undefined;
    run(
      { seriesId, minutes },
      async () => {
        const result = await moveSeries(eventId, newStart.toISOString());
        undoTo = result.undo;
        return result;
      },
      () => {
        if (undo) return;
        const back = undoTo;
        showBar({
          message: movedAllText(title, newStart),
          tone: "neutral",
          actionLabel: back ? "Undo" : undefined,
          onAction: back
            ? () => {
                setBar(null);
                const request = seriesUndoRequest(back, minutes);
                saveSeries(request.eventId, seriesId, title, new Date(request.startIso), request.minutes, true);
              }
            : undefined,
        });
      },
      (error) => {
        // Every day of the series is drawn shifted: each glides home.
        const spots = latest.current
          .filter((e) => e.seriesId === seriesId)
          .map(glideFrom)
          .filter((spot): spot is GlideBack => spot !== null);
        glide.current = [...glide.current.filter((g) => !spots.some((spot) => spot.id === g.id)), ...spots];
        showBar({ message: error, tone: "warn" });
      },
    );
  }

  // The dropped repeating block keeps the lifted look while the sheet asks.
  // (`data-lifted` is the look's one switch, useTimelineDrag.ts sets it for a
  // real lift; React never renders it, so it survives re-renders.) It comes
  // off before the glide effect below measures, so a Cancel glides from the
  // lifted spot.
  const displayed = pending
    ? applyMove(shown, {
        id: pending.event.id,
        startAt: pending.newStart,
        endAt: new Date(pending.newStart.getTime() + pending.event.endAt.getTime() - pending.event.startAt.getTime()),
      })
    : shown;
  const liftedId = pending?.event.id;
  useLayoutEffect(() => {
    const block = liftedId ? blockFor(liftedId) : null;
    block?.setAttribute("data-lifted", "");
    return () => block?.removeAttribute("data-lifted");
  }, [liftedId, displayed]);

  // The glide back (FLIP): once the refused event is drawn home again, start
  // it at the spot it was dropped and let its own `translate` transition carry
  // it home. Reduce motion makes that transition instant (globals.css).
  useLayoutEffect(() => {
    if (glide.current.length === 0) return;
    const waiting: GlideBack[] = [];
    for (const pendingGlide of glide.current) {
      const event = displayed.find((e) => e.id === pendingGlide.id);
      // Other renders can land first while the refused move is still shown.
      if (event && event.startAt.getTime() !== pendingGlide.homeStartMs) {
        waiting.push(pendingGlide);
        continue;
      }
      const block = blockFor(pendingGlide.id);
      if (!block) continue;
      const home = block.getBoundingClientRect();
      block.style.transition = "none";
      block.style.translate = `${pendingGlide.left - home.left}px ${pendingGlide.top - home.top}px`;
      void block.offsetHeight; // commit the start spot before the transition returns
      block.style.transition = "";
      block.style.translate = "";
    }
    glide.current = waiting;
  }, [displayed]);

  function drop(eventId: string, newStart: Date) {
    const event = shown.find((e) => e.id === eventId);
    if (!event) return;
    // A refused earlier drop of this event still waiting to glide home: this
    // newer drop decides where it is drawn now, so that glide is dropped.
    glide.current = glide.current.filter((g) => g.id !== eventId);
    setBar(null);
    if (event.seriesId) setPending({ event, newStart });
    else save(event, newStart, false);
  }

  let repeatSheet: RepeatSheetProps | null = null;
  if (pending) {
    const { event, newStart } = pending;
    const minutes = seriesShiftMinutes(event, newStart);
    repeatSheet = {
      title: event.title,
      where: `${SHORT_DAY_NAMES[newStart.getDay()]} ${formatClockTime(newStart)}`,
      sameDay: minutes !== null,
      onThisOne: () => {
        setPending(null);
        save(event, newStart, false);
      },
      onAll: () => {
        if (minutes === null || !event.seriesId) return;
        setPending(null);
        saveSeries(event.id, event.seriesId, event.title, newStart, minutes, false);
      },
      onCancel: () => {
        // Still drawn at the dropped spot: glide home from there.
        const spot = glideFrom(event);
        if (spot) glide.current = [...glide.current.filter((g) => g.id !== spot.id), spot];
        setPending(null);
      },
    };
  }

  return { events: displayed, drop, bar, closeBar: () => setBar(null), repeatSheet };
}
