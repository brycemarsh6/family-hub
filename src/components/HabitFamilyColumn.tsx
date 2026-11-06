"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitIcon } from "./HabitIcon";
import { LogButton } from "./LogButton";
import { SKIPPED_TODAY_LABEL } from "@/lib/habitVocabulary";
import { doneCountLabel, type FamilyColumn, type FamilyRow } from "@/lib/habitsFamily";

/**
 * One line of the family view: the icon and title (a link to the habit's stats
 * page, decision 105), a streak when allowed (98) and the 44px check. A row the
 * viewer may tick for gets the same `LogButton` as Today; a row they may not
 * shows its state in a plain marker that is not a button. A skipped row shows
 * the same dashed marker as Today and reads "Skipped today" (101).
 */
export function FamilyHabitRow({
  row,
  showStreaks,
  onToggle,
}: {
  row: FamilyRow;
  showStreaks: boolean;
  onToggle: () => void;
}) {
  const finished = row.doneToday || row.skippedToday;
  const showProgress = row.dueState === "open" && row.progress && row.progress.target > 1 && !row.doneToday;
  const meta = row.skippedToday
    ? SKIPPED_TODAY_LABEL
    : row.carriedFrom && !row.doneToday
      ? "Carried over"
      : showProgress
        ? `${row.progress!.count} of ${row.progress!.target} ${row.progress!.label}`
        : null;
  const streak = showStreaks && row.streakLabel;

  return (
    <div className="flex min-h-14 items-center gap-2.5">
      <Link href={`/habits/${row.id}`} draggable={false} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 self-stretch">
        <span className={`flex shrink-0 ${finished ? "text-muted" : "text-accent"}`}>
          <HabitIcon name={row.icon} kind={row.kind} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`text-base font-semibold ${finished ? "text-muted" : ""}`}>{row.title}</span>
          {meta && <span className="text-xs text-muted">{meta}</span>}
        </span>
        {streak && (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-warn">
            <Flame aria-hidden="true" size={14} />
            {streak}
          </span>
        )}
      </Link>
      {row.canLog || row.skippedToday ? (
        <LogButton done={row.doneToday} label={row.title} idle="empty" skipped={row.skippedToday} onClick={onToggle} />
      ) : (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            row.doneToday ? "bg-accent text-accent-fg" : "border-2 border-line-strong"
          }`}
        >
          {row.doneToday && <Check aria-hidden="true" size={22} />}
          <span className="sr-only">{row.doneToday ? `${row.title} is done` : `${row.title} is not done yet`}</span>
        </span>
      )}
    </div>
  );
}

/**
 * One person's card on the family view: avatar, name, "x of y done" (skipped
 * rows are in neither number, 109), then Habits and Chores. No flame in the
 * header until PR D's chore streak (95).
 */
export function HabitFamilyColumn({
  column,
  showStreaks,
  onToggle,
}: {
  column: FamilyColumn;
  showStreaks: boolean;
  onToggle: (row: FamilyRow) => void;
}) {
  const sections = [
    { key: "habit", title: "Habits", rows: column.rows.filter((row) => row.kind === "habit") },
    { key: "chore", title: "Chores", rows: column.rows.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);

  return (
    <section aria-label={column.displayName} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-2.5 pb-1.5">
        <AvatarBadge displayName={column.displayName} avatarColor={column.avatarColor} size={40} />
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-lg font-bold leading-tight">{column.displayName}</h2>
          <span className="text-sm text-muted">{doneCountLabel(column.rows)}</span>
        </div>
      </div>
      {sections.length === 0 && <p className="py-2 text-sm text-muted">Nothing due today.</p>}
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">{section.title}</h3>
          <ul className="divide-y divide-line">
            {section.rows.map((row) => (
              <li key={row.id}>
                <FamilyHabitRow row={row} showStreaks={showStreaks} onToggle={() => onToggle(row)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
