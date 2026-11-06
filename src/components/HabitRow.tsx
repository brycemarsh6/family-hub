"use client";

import { Check, SkipForward, Undo2 } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitIcon } from "./HabitIcon";
import { SwipeActions, type SwipeAction } from "./SwipeActions";
import type { HabitRowView } from "@/lib/habitsRead";
import { formatDayLabel } from "@/lib/mealPlanDates";

const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

const TAG_CLASS = "rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn whitespace-nowrap";

/** "Mine", "Everyone", "Together" or "Side by side": who the habit belongs to, from the viewer's side. */
function whoLabel(row: HabitRowView): string {
  if (row.participants.length <= 1) return "Mine";
  if (row.everyone) return "Everyone";
  return row.sharing === "together" ? "Together" : "Side by side";
}

/**
 * One Today row: an icon tile, the title (with Carried over / Quit tags), a
 * line of who and when, and the round 44px check. It holds no state; the list
 * owns the optimistic flags. A row that is not yet checked or skipped swipes
 * left for "Skip today"; a skipped row swipes for "Undo skip" (its check is
 * switched off, because a skipped day is left alone until the skip is undone).
 */
export function HabitRow({
  row,
  onToggle,
  onSkip,
  onUnskip,
}: {
  row: HabitRowView;
  /** Check it, or undo the check when it is already done. */
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
}) {
  const finished = row.doneToday || row.skippedToday;
  // Side by side: show the other people who have already done theirs.
  const othersDone = row.sharing === "each" ? row.participants.filter((p) => p.userId !== row.viewerId && p.done) : [];
  const shownPeople = row.sharing === "together" ? row.participants : othersDone;

  let actions: SwipeAction[] = [];
  if (row.skippedToday) {
    actions = [
      {
        label: "Undo skip",
        accessibleLabel: `Undo skip for ${row.title}`,
        icon: <Undo2 aria-hidden="true" size={18} />,
        onAction: onUnskip,
        tone: "neutral",
      },
    ];
  } else if (!row.doneToday) {
    actions = [
      {
        label: "Skip today",
        accessibleLabel: `Skip ${row.title} today`,
        icon: <SkipForward aria-hidden="true" size={18} />,
        onAction: onSkip,
        tone: "neutral",
      },
    ];
  }

  const body = (
    <div className="flex min-h-15 items-center gap-3 px-3 py-1.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          finished ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent"
        }`}
      >
        <HabitIcon name={row.icon} kind={row.kind} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-base font-semibold ${finished ? "text-muted" : ""}`}>{row.title}</span>
          {row.mode === "quit" && <span className={TAG_CLASS}>Quit</span>}
          {row.carriedFrom && !row.doneToday && <span className={TAG_CLASS}>Carried over</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
          {row.carriedFrom && !row.doneToday ? (
            <>
              <span>From {formatDayLabel(new Date(row.carriedFrom.year, row.carriedFrom.month - 1, row.carriedFrom.day)).split(",")[0]}</span>
              <span aria-hidden="true">·</span>
              <span>counts as done late</span>
            </>
          ) : (
            <>
              {shownPeople.map((p) => (
                <AvatarBadge key={p.userId} displayName={p.displayName} avatarColor={p.avatarColor} size={18} />
              ))}
              <span>
                {row.sharing === "each" && othersDone.length > 0
                  ? `${othersDone.map((p) => p.displayName).join(", ")} done`
                  : whoLabel(row)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{row.timeOfDay ? TIME_LABELS[row.timeOfDay] : "Anytime"}</span>
              {row.dueState === "open" && row.progress && row.progress.target > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {row.progress.count} of {row.progress.target} {row.progress.label}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {row.skippedToday ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-muted">
          <SkipForward aria-hidden="true" size={18} />
          <span className="sr-only">Skipped today</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={row.doneToday}
          aria-label={row.doneToday ? `Undo ${row.title}` : `Mark ${row.title} done`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            row.doneToday ? "bg-accent text-accent-fg" : "border-2 border-accent bg-surface text-accent"
          }`}
        >
          {row.doneToday && <Check aria-hidden="true" size={22} strokeWidth={2.5} />}
        </button>
      )}
    </div>
  );

  return actions.length > 0 ? <SwipeActions actions={actions}>{body}</SwipeActions> : body;
}
