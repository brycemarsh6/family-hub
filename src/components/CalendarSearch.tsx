"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { DaySection } from "./DaySection";
import { EventDetailSheet } from "./EventDetailSheet";
import { CalendarTaskSheet } from "./CalendarTaskSheet";
import { UndoBar } from "./UndoBar";
import { searchCalendar } from "@/app/actions/calendarSearch";
import { uncompleteTask } from "@/app/actions/tasks";
import { DEFAULT_SEARCH_LIMIT, searchWords, type CalendarSearchResult, type SearchResultDay } from "@/lib/calendarSearch";
import { parseDateParam } from "@/lib/calendarPaging";
import { useToday } from "@/lib/useToday";
import { useUndoBar } from "@/lib/useUndoBar";
import { useTaskDone } from "@/lib/useTaskDone";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

const DEBOUNCE_MS = 300;

/**
 * Mission 75: the search page's client half. Typing asks `searchCalendar` after a
 * short pause (a request counter makes sure an older answer never replaces a newer
 * one, and the newest answer stays on screen under "Searching..." until the next one
 * arrives); results are Schedule's own cards, one `DaySection` per day. The words are
 * the mock's (`.avengers/mocks/calendar-pr9-search-mock.html`). After any change
 * made in a sheet the current search runs again. This page has its own single
 * `UndoBar` and `useTaskDone`, like `CalendarViews` (docs/structure/calendar.md).
 */
export function CalendarSearch({
  people,
  canManage,
  isTablet,
}: {
  people: CalendarPersonView[];
  canManage: boolean;
  isTablet: boolean;
}) {
  const today = useToday();
  const [text, setText] = useState("");
  const query = text.trim();
  const words = searchWords(query);
  // What the newest answer on screen was asked for (the same text means it is current).
  const [answer, setAnswer] = useState<{ asked: string; result: CalendarSearchResult | null } | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  // A "Show more" that failed: the list stays and the error line sits under it.
  const [moreFailed, setMoreFailed] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTaskView | null>(null);
  const requestCounter = useRef(0);
  const limits = useRef({ upcoming: DEFAULT_SEARCH_LIMIT, past: DEFAULT_SEARCH_LIMIT });
  const inputRef = useRef<HTMLInputElement>(null);
  // The text in the box right now, for the sheets' reruns, Show more and Try again (never an older capture).
  const liveQuery = useRef(query);
  useEffect(() => {
    liveQuery.current = query;
  }, [query]);

  // Ask the server; only the newest request's answer is kept. A failed Show more keeps the list it grew from.
  async function ask(asked: string, fromMore = false) {
    setMoreFailed(false);
    requestCounter.current += 1;
    const mine = requestCounter.current;
    let result: CalendarSearchResult | null = null;
    try {
      result = await searchCalendar({ text: asked, upcomingLimit: limits.current.upcoming, pastLimit: limits.current.past });
    } catch {
      result = null;
    }
    if (mine !== requestCounter.current) return;
    if (result === null && fromMore) {
      setAnswer((previous) => (previous && previous.result && previous.asked === asked ? previous : { asked, result }));
      setMoreFailed(true);
    } else {
      setAnswer({ asked, result });
    }
    setMoreBusy(false);
  }

  // Ask the live text again, if it is still worth asking.
  function askLive(fromMore = false) {
    const live = liveQuery.current;
    if (searchWords(live) !== null) void ask(live, fromMore);
  }

  useEffect(() => {
    if (!query || searchWords(query) === null) return;
    limits.current = { upcoming: DEFAULT_SEARCH_LIMIT, past: DEFAULT_SEARCH_LIMIT };
    const timer = setTimeout(() => void ask(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `ask` only touches refs and setters; the text is what restarts the wait.
  }, [query]);

  // The newest answer stays up while a newer one is pending; failed and nothing-found are the current answer's only.
  const shown = words !== null ? answer : null;
  const result = shown?.result ?? null;
  const isCurrent = shown !== null && shown.asked === query;
  const searching = words !== null && !isCurrent;
  const failed = isCurrent && shown.result === null;
  const nothingFound = isCurrent && result !== null && result.upcoming.length === 0 && result.past.length === 0;
  const typedWords = useMemo(() => searchWords(shown?.asked ?? "") ?? [], [shown?.asked]);

  // The sheets' changes run the current search again.
  const rerun = () => askLive();

  const { bar, showBar, closeBar } = useUndoBar();
  const serverTasks = useMemo(
    () => (result ? [...result.upcoming, ...result.past].flatMap((entry) => entry.tasks) : []),
    [result],
  );
  const { applyDone, clearTaskDone, onTaskCompleted } = useTaskDone(serverTasks, {
    showBar,
    closeBar,
    uncomplete: uncompleteTask,
  });
  const repeatingEventIds = useMemo(() => new Set(result?.repeatingEventIds ?? []), [result]);

  function showMore(side: "upcoming" | "past") {
    limits.current = { ...limits.current, [side]: limits.current[side] + DEFAULT_SEARCH_LIMIT };
    setMoreBusy(true);
    askLive(true);
  }

  // Try again after a failed search (the list is empty) or a failed Show more (the list stays).
  function tryAgain() {
    if (moreFailed) setMoreBusy(true);
    else setAnswer(null);
    askLive(moreFailed);
  }

  function renderDays(days: SearchResultDay[]) {
    if (today === null) return null;
    return days.map((entry) => {
      const day = parseDateParam(entry.day);
      if (!day) return null;
      return (
        <DaySection
          key={entry.day}
          day={day}
          today={today}
          events={entry.events}
          tasks={applyDone(entry.tasks)}
          showLocation
          dateLabel={dayLabel(day, today)}
          repeatingEventIds={repeatingEventIds}
          highlightWords={typedWords}
          onOpenEvent={(event, eventDay) => setSelected({ event, day: eventDay })}
          onOpenTask={(task) => setSelectedTask(task)}
        />
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-accent bg-surface px-3">
        <Search aria-hidden="true" size={18} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search events and tasks"
          aria-label="Search events and tasks"
          maxLength={200}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText("");
              inputRef.current?.focus();
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            <X aria-hidden="true" size={18} />
          </button>
        )}
      </div>

      {words === null && (
        <p className="px-6 py-6 text-center text-sm text-muted">
          Find any event or task by a word in its title, place or notes. Past and upcoming.
        </p>
      )}
      {searching && (
        <p role="status" className="px-1 text-xs text-muted">
          Searching...
        </p>
      )}
      {failed && <SearchError onTryAgain={tryAgain} />}
      {nothingFound && (
        <p className="px-6 py-6 text-center text-sm text-muted">
          No events or tasks match &quot;{shown?.asked}&quot;.
        </p>
      )}

      {result && words !== null && (
        <>
          {renderDays(result.upcoming)}
          {result.hasMoreUpcoming && isCurrent && <ShowMore label="Show more" busy={moreBusy} onClick={() => showMore("upcoming")} />}
          {result.past.length > 0 && (
            <>
              <h2 className="mt-2 border-t border-line px-1 pt-4 text-xs font-extrabold uppercase tracking-wider text-muted">Past</h2>
              {renderDays(result.past)}
              {result.hasMorePast && isCurrent && <ShowMore label="Show more past" busy={moreBusy} onClick={() => showMore("past")} />}
            </>
          )}
          {moreFailed && isCurrent && <SearchError onTryAgain={tryAgain} />}
        </>
      )}

      {selected && (
        <EventDetailSheet
          event={selected.event}
          day={selected.day}
          createdByName={selected.event.createdByName}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            rerun();
          }}
        />
      )}
      {selectedTask && (
        <CalendarTaskSheet
          task={selectedTask}
          people={people}
          canManage={canManage}
          isTablet={isTablet}
          onClose={() => setSelectedTask(null)}
          onTaskCompleted={onTaskCompleted}
          clearTaskDone={clearTaskDone}
          refresh={rerun}
        />
      )}
      {bar && <UndoBar key={bar.id} {...bar} onClose={closeBar} />}
    </div>
  );
}

function SearchError({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p role="alert" className="text-sm text-warn">Couldn&apos;t search. Try again.</p>
      <button
        type="button"
        onClick={onTryAgain}
        className="min-h-12 shrink-0 rounded-xl border border-line bg-surface px-4 text-base font-semibold text-fg active:bg-surface-2"
      >
        Try again
      </button>
    </div>
  );
}

function ShowMore({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-surface text-base font-semibold text-fg active:bg-surface-2 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/** "Sat, Dec 13" (with the year when it is not this year, since results reach back and forward). */
function dayLabel(day: Date, today: Date): string {
  return day.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(day.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}
