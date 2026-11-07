"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { DaySection } from "./DaySection";
import { EventCard } from "./EventCard";
import { HabitDayCard } from "./HabitDayCard";
import { TaskCard } from "./TaskCard";
import { SkeletonBlock } from "./Skeleton";
import { buildCalendarSearch } from "@/lib/calendarPaging";
import {
  calendarDayItems,
  capDayItems,
  dayEmptyWord,
  nextCalendarItem,
  nextEmptyWord,
  nextItemWhen,
  widgetDays,
  type CalendarWidgetData,
  type DayItems,
} from "@/lib/calendarWidget";
import { DASHBOARD_WIDGET_WORDS, DASHBOARD_WIDGETS, type WidgetSize } from "@/lib/dashboardWidgets";
import type { CalendarWidgetOptions } from "@/lib/dashboardWidgetOptions";
import { isSameDay, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { useNowMinute } from "@/lib/useNowMinute";
import { useToday } from "@/lib/useToday";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

// The dashboard's Calendar widget (W2). Which day is "today" and what time it
// is come from the BROWSER (useToday, useNowMinute), exactly as the Calendar
// page does; both are null until hydration, so the first paint is the tile
// shell around a grey block, never a guess. What to show is decided by the
// pure rules in calendarWidget.ts; this file only draws it, with the same
// cards Schedule uses. Taps on an event or task open Schedule on that day (no
// sheet inside a tile); a planned habit keeps HabitDayCard's own link.

const TITLE = DASHBOARD_WIDGETS.calendar.label;
const ICON = <CalendarDays size={20} className="text-muted" />;
const MEDIUM_CAP = 3;
const LARGE_CAP = 6;
const NARROW_DAY_CAP = 3;
const WIDE_DAY_CAP = 5;

type Handlers = {
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
};

function MoreLine({ more }: { more: number }) {
  if (more <= 0) return null;
  return <p className="px-1 text-sm text-muted">{DASHBOARD_WIDGET_WORDS.moreRows(more)}</p>;
}

function EmptyLine({ word }: { word: string }) {
  return <p className="px-1 py-2 text-sm text-muted">{word}</p>;
}

/** The weekday + date header of DaySection, for a day that has nothing to draw. */
function DayHeader({ day, today }: { day: Date; today: Date }) {
  const isToday = isSameDay(day, today);
  return (
    <div className="mb-1 flex items-center gap-2 px-1">
      <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}>
        {SHORT_DAY_NAMES[day.getDay()]}
      </span>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
          isToday ? "bg-accent text-accent-fg" : "text-fg"
        }`}
      >
        {day.getDate()}
      </span>
    </div>
  );
}

/** Today's rows with no day header: tasks, planned habits, then events (Medium). */
function PlainRows({ items, day, today, handlers }: { items: DayItems; day: Date; today: Date; handlers: Handlers }) {
  return (
    <div className="flex flex-col gap-2">
      {items.tasks.map((task) => (
        <TaskCard key={task.id} task={task} onOpen={() => handlers.onOpenTask(task, day)} />
      ))}
      {items.habitDays.map((item) => (
        <HabitDayCard key={item.id} item={item} />
      ))}
      {items.events.map((event) => (
        <EventCard key={event.id} event={event} day={day} today={today} compact onOpen={() => handlers.onOpenEvent(event, day)} />
      ))}
    </div>
  );
}

/** One Extra large day: a compact DaySection capped at `cap`, or its header and one muted line when empty. */
function DayColumn({
  data,
  day,
  today,
  now,
  options,
  cap,
  handlers,
}: {
  data: CalendarWidgetData;
  day: Date;
  today: Date;
  now: Date;
  options: CalendarWidgetOptions;
  cap: number;
  handlers: Handlers;
}) {
  const isToday = isSameDay(day, today);
  const items = calendarDayItems(data, day, now, options, { hideEnded: isToday && !options.wholeDay });
  const empty = dayEmptyWord(items, options, "column");
  if (empty !== null) {
    return (
      <div className="min-w-0">
        <DayHeader day={day} today={today} />
        <EmptyLine word={empty} />
      </div>
    );
  }
  const shown = capDayItems(items, cap);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <DaySection day={day} today={today} tasks={shown.tasks} habitDays={shown.habitDays} events={shown.events} compact {...handlers} />
      <MoreLine more={shown.more} />
    </div>
  );
}

export default function CalendarWidgetTile({
  data,
  size,
  options,
}: {
  data: CalendarWidgetData;
  size: WidgetSize;
  options: CalendarWidgetOptions;
}) {
  const router = useRouter();
  const today = useToday();
  const now = useNowMinute();
  const openDay = (day: Date) => router.push(`/calendar?${buildCalendarSearch("schedule", day)}`);
  const handlers: Handlers = {
    onOpenEvent: (_event, day) => openDay(day),
    onOpenTask: (_task, day) => openDay(day),
  };

  if (today === null || now === null) {
    const shape = size === "s" ? "link" : "panel";
    return (
      <DashboardTile href="/calendar" icon={ICON} title={TITLE} shape={shape}>
        <SkeletonBlock className={size === "s" ? "h-12 w-full" : "h-24 w-full"} />
      </DashboardTile>
    );
  }

  if (size === "s") {
    const next = nextCalendarItem(data, today, now, options);
    const title = next ? (next.type === "event" ? next.event.title : next.task.title) : null;
    return (
      <DashboardTile href={next ? `/calendar?${buildCalendarSearch("schedule", next.day)}` : "/calendar"} icon={ICON} title={TITLE}>
        {next && title ? (
          <>
            <p className="line-clamp-2 text-sm font-semibold">{title}</p>
            <p className="text-sm text-muted">{nextItemWhen(next, today)}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{nextEmptyWord(options)}</p>
        )}
      </DashboardTile>
    );
  }

  const todayItems = calendarDayItems(data, today, now, options, { hideEnded: !options.wholeDay });

  if (size === "m" || size === "l") {
    const empty = dayEmptyWord(todayItems, options, "today");
    const cap = capDayItems(todayItems, size === "m" ? MEDIUM_CAP : LARGE_CAP);
    return (
      <DashboardTile href="/calendar" icon={ICON} title={TITLE} shape="panel">
        {empty !== null ? (
          <EmptyLine word={empty} />
        ) : (
          <div className="flex flex-col gap-1">
            {size === "m" ? (
              <PlainRows items={cap} day={today} today={today} handlers={handlers} />
            ) : (
              <DaySection day={today} today={today} tasks={cap.tasks} habitDays={cap.habitDays} events={cap.events} compact {...handlers} />
            )}
            <MoreLine more={cap.more} />
          </div>
        )}
      </DashboardTile>
    );
  }

  // Extra large: the day list is its own CSS container, so the columns follow
  // the tile's real width, not the screen's. From 30rem (480px) of body the
  // days sit side by side (5 rows each); narrower they stack (3 rows each).
  // The two lists are both in the DOM and CSS shows one, since the row cap
  // differs and only the browser knows which width it has.
  const days = widgetDays(today, options.days);
  const columns = options.days === 7 ? "@min-[30rem]:grid-cols-7" : "@min-[30rem]:grid-cols-3";
  const list = (cap: number) =>
    days.map((day) => (
      <DayColumn key={day.getTime()} data={data} day={day} today={today} now={now} options={options} cap={cap} handlers={handlers} />
    ));
  return (
    <DashboardTile href="/calendar" icon={ICON} title={TITLE} shape="panel">
      <div className="@container">
        <div className="flex flex-col gap-3 @min-[30rem]:hidden">{list(NARROW_DAY_CAP)}</div>
        <div className={`hidden gap-3 @min-[30rem]:grid ${columns}`}>{list(WIDE_DAY_CAP)}</div>
      </div>
    </DashboardTile>
  );
}
