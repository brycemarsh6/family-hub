"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { DaySection, DaySectionHeader } from "./DaySection";
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
import { isSameDay } from "@/lib/mealPlanDates";
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

/** Wide Extra large columns: 3 days sit in 3 columns; 7 days wrap, each column at least 13rem (208px) wide. */
function wideColumns(dayCount: number): string {
  return dayCount === 7 ? "@min-[30rem]:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]" : "@min-[30rem]:grid-cols-3";
}

type Handlers = {
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
};

/** "+N more": a full-width 44px row that opens Schedule on that list's day. */
function MoreLine({ more, day }: { more: number; day: Date }) {
  if (more <= 0) return null;
  return (
    <Link
      href={`/calendar?${buildCalendarSearch("schedule", day)}`}
      className="flex min-h-11 w-full items-center px-1 text-left text-sm text-muted"
    >
      {DASHBOARD_WIDGET_WORDS.moreRows(more)}
    </Link>
  );
}

function EmptyLine({ word }: { word: string }) {
  return <p className="px-1 py-2 text-sm text-muted">{word}</p>;
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
        <DaySectionHeader day={day} isToday={isToday} className="mb-1" />
        <EmptyLine word={empty} />
      </div>
    );
  }
  const shown = capDayItems(items, cap);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <DaySection day={day} today={today} tasks={shown.tasks} habitDays={shown.habitDays} events={shown.events} compact {...handlers} />
      <MoreLine more={shown.more} day={day} />
    </div>
  );
}

/** The grey shape of each size before the browser knows the day. It reserves the tallest real shape (two-line event cards at 96px, the day header, "+N more") so the tile can only shrink on load, never grow. */
function CalendarSkeleton({ size, dayCount }: { size: WidgetSize; dayCount: number }) {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, row) => <SkeletonBlock key={row} className="h-24 w-full" />);
  const dayBlock = (key: number, count: number) => (
    <div key={key} className="flex min-w-0 flex-col gap-1">
      <div>
        <SkeletonBlock className="mb-2 h-7 w-16" />
        <div className="flex flex-col gap-2">{rows(count)}</div>
      </div>
      <SkeletonBlock className="h-11 w-full" />
    </div>
  );
  const days = (count: number) => Array.from({ length: dayCount }, (_, day) => dayBlock(day, count));
  if (size === "s") {
    return (
      <DashboardTile href="/calendar" icon={ICON} title={TITLE} shape="link">
        <SkeletonBlock className="h-12 w-full" />
      </DashboardTile>
    );
  }
  return (
    <DashboardTile href="/calendar" icon={ICON} title={TITLE} shape="panel">
      {size === "m" && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-2">{rows(3)}</div>
          <SkeletonBlock className="h-11 w-full" />
        </div>
      )}
      {size === "l" && dayBlock(0, 6)}
      {size === "xl" && (
        <div className="@container">
          <div className="flex flex-col gap-3 @min-[30rem]:hidden">{days(3)}</div>
          <div className={`hidden gap-3 @min-[30rem]:grid ${wideColumns(dayCount)}`}>{days(5)}</div>
        </div>
      )}
    </DashboardTile>
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
    return <CalendarSkeleton size={size} dayCount={options.days} />;
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
            <MoreLine more={cap.more} day={today} />
          </div>
        )}
      </DashboardTile>
    );
  }

  // Extra large: the day list is its own CSS container, so the columns follow
  // the tile's real width, not the screen's. From 30rem (480px) of body the
  // days sit side by side (5 rows each); narrower they stack (3 rows each).
  // 3 days sit in 3 columns; 7 days wrap into as many columns as fit at 13rem
  // (208px) each, so a narrow tile gets a second row instead of crushed columns.
  // The two lists are both in the DOM and CSS shows one, since the row cap
  // differs and only the browser knows which width it has.
  const days = widgetDays(today, options.days);
  const columns = wideColumns(options.days);
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
