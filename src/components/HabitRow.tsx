"use client";

import Link from "next/link";
import { Check, Flame, SkipForward, Undo2 } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitIcon } from "./HabitIcon";
import { HoursHabitRow } from "./HoursHabitRow";
import { LogButton } from "./LogButton";
import { SwipeActions, type SwipeAction } from "./SwipeActions";
import { ANYTIME_LABEL, ON_VACATION_LABEL, PLANNED_FOR_TODAY_LABEL, SKIPPED_THIS_WEEK_LABEL, SKIPPED_TODAY_LABEL, TIME_OF_DAY_LABELS, habitWhoLabel } from "@/lib/habitVocabulary";
import { isExcused, isExcusedAllDay } from "@/lib/habits/weekOverrides";
import type { HabitRowView } from "@/lib/habitsRead";
import { dayOfWeek } from "@/lib/householdDate";
import { FULL_DAY_NAMES, formatDayLabel } from "@/lib/mealPlanDates";

/** The neutral "Quit" tag, shared with Manage (decision 90: amber is only for warnings). */
export const QUIT_TAG_CLASS = "rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-strong whitespace-nowrap";
const TAG_CLASS = "rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn whitespace-nowrap";

/**
 * One Today row: an icon tile, the title (with Carried over / Quit tags), a
 * line of who and when, and the round 44px check. It holds no state; the list
 * owns the optimistic flags. A row that is not yet checked or skipped swipes
 * left for "Skip today" (on a carried row, "Skip Thursday": the missed day, decision 89); a skipped row swipes for "Undo skip" (its check is
 * switched off, because a skipped day is left alone until the skip is undone).
 * The icon and title are a link to the habit's stats page (105); the check and
 * the swipe keep their own taps (SwipeActions swallows the click after a swipe).
 * A skipped row's line reads "Skipped today" (101); a streak shows from 2 (98).
 */
export function HabitRow({
  row,
  onToggle,
  onSkip,
  onUnskip,
  showStreaks,
  readOnly = false,
}: {
  row: HabitRowView;
  /** Check it, or undo the check when it is already done. An hours habit's row opens the log sheet instead; it has no check. */
  onToggle: () => void;
  /** Skip today, or the carried day when the row is carried over. */
  onSkip: () => void;
  onUnskip: () => void;
  /** The viewer's "Show streaks" switch; the family tablet always passes true (decision 98). */
  showStreaks: boolean;
  /** A past day (mission 51): the check is a plain marker, there is no swipe, and an hours row has no log button. */
  readOnly?: boolean;
}) {
  if (row.hours) return <HoursHabitRow row={row} hours={row.hours} onLog={onToggle} showStreaks={showStreaks} readOnly={readOnly} />;

  // Excused rows (skipped, undone on vacation, skipped this week) look finished too (decisions 115, 127).
  const finished = row.doneToday || isExcused(row);
  // Skipped for the week, or on vacation and undone: muted in the stronger grey (it must stay readable), and a skipped-this-week row shows the dashed marker and has no swipe (nothing to skip twice).
  const excusedByCalendar = isExcusedAllDay(row);
  const skippedMark = row.skippedToday || (row.skippedThisWeek && !row.doneToday);
  // Side by side: show the other people who have already done theirs.
  const othersDone = row.sharing === "each" ? row.participants.filter((p) => p.userId !== row.viewerId && p.done) : [];
  const streak = showStreaks && row.streakLabel ? (
    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-streak">
      <Flame aria-hidden="true" size={14} />
      {row.streakLabel}
    </span>
  ) : null;
  const shownPeople = row.sharing === "together" ? row.participants : othersDone;

  let actions: SwipeAction[] = [];
  if (readOnly) {
    // Nothing to swipe on a past day.
  } else if (row.skippedToday) {
    actions = [
      {
        label: "Undo skip",
        accessibleLabel: `Undo skip for ${row.title}`,
        icon: <Undo2 aria-hidden="true" size={18} />,
        onAction: onUnskip,
        tone: "neutral",
      },
    ];
  } else if (!row.doneToday && !row.skippedThisWeek) {
    // A carried row stands for a missed day: its skip is for that day, not today.
    const when = row.carriedFrom ? FULL_DAY_NAMES[dayOfWeek(row.carriedFrom)] : "today";
    actions = [
      {
        label: `Skip ${when}`,
        accessibleLabel: `Skip ${row.title} ${row.carriedFrom ? `for ${when}` : "today"}`,
        icon: <SkipForward aria-hidden="true" size={18} />,
        onAction: onSkip,
        tone: "neutral",
      },
    ];
  }

  const body = (
    <div className="flex min-h-15 items-center gap-3 px-3 py-1.5">
      <Link href={`/habits/${row.id}`} draggable={false} className="flex min-w-0 flex-1 items-center gap-3 self-stretch">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            finished ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent"
          }`}
        >
          <HabitIcon name={row.icon} kind={row.kind} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-base font-semibold ${excusedByCalendar ? "text-muted-strong" : finished ? "text-muted" : ""}`}>{row.title}</span>
            {row.mode === "quit" && <span className={QUIT_TAG_CLASS}>Quit</span>}
            {row.carriedFrom && !row.doneToday && <span className={TAG_CLASS}>Carried over</span>}
            {row.weekTag && <span className={QUIT_TAG_CLASS}>{row.weekTag}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
            {row.carriedFrom && !row.doneToday ? (
              <>
                <span>From {formatDayLabel(new Date(row.carriedFrom.year, row.carriedFrom.month - 1, row.carriedFrom.day)).split(",")[0]}</span>
                <span aria-hidden="true">·</span>
                <span>counts as done late</span>
              </>
            ) : row.skippedToday ? (
              <>
                <span>{SKIPPED_TODAY_LABEL}</span>
                {streak}
              </>
            ) : row.onVacation && !row.doneToday ? (
              <span className="text-muted-strong">{ON_VACATION_LABEL}</span>
            ) : (
              <>
                {shownPeople.map((p) => (
                  <AvatarBadge key={p.userId} displayName={p.displayName} avatarColor={p.avatarColor} size={18} />
                ))}
                <span>
                  {row.sharing === "each" && othersDone.length > 0
                    ? `${othersDone.map((p) => p.displayName).join(", ")} done`
                    : habitWhoLabel({ people: row.participants.length, everyone: row.everyone, sharing: row.sharing })}
                </span>
                {row.timeOfDay && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{TIME_OF_DAY_LABELS[row.timeOfDay]}</span>
                  </>
                )}
                {/* A day planned for today, or a later day this period, says so, replacing "Anytime" (decisions 145, 162). */}
                {(row.plannedToday || row.plannedLater || !row.timeOfDay) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{row.plannedToday ? PLANNED_FOR_TODAY_LABEL : (row.plannedLater ?? ANYTIME_LABEL)}</span>
                  </>
                )}
                {(row.dueState === "open" || row.plannedToday) && row.progress && row.progress.target > 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {row.progress.count} of {row.progress.target} {row.progress.label}
                    </span>
                  </>
                )}
                {streak}
              </>
            )}
          </div>
        </div>
      </Link>
      {readOnly && !skippedMark ? (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            row.doneToday ? "bg-accent text-accent-fg" : "border-2 border-line-strong"
          }`}
        >
          {row.doneToday && <Check aria-hidden="true" size={22} />}
          <span className="sr-only">{row.doneToday ? `${row.title} is done` : `${row.title} is not done`}</span>
        </span>
      ) : (
        <LogButton done={row.doneToday} label={row.title} idle="empty" skipped={skippedMark} skippedLabel={row.skippedToday ? SKIPPED_TODAY_LABEL : SKIPPED_THIS_WEEK_LABEL} onClick={onToggle} />
      )}
    </div>
  );

  return actions.length > 0 ? <SwipeActions actions={actions}>{body}</SwipeActions> : body;
}
