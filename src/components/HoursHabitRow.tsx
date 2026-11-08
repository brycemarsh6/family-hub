"use client";

import Link from "next/link";
import { Check, Flame, Plus } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import { ProgressBar } from "./ProgressBar";
import type { HoursRowView } from "@/lib/habitsHours";
import type { HabitRowView } from "@/lib/habitsRead";

/**
 * The 48px round tap on an hours row (decision 189): an outlined + until the
 * week's goal is met, then a filled check. Either way it opens the log sheet;
 * it never writes a check. `forName` names whose time it is on a shared screen.
 */
export function HoursLogButton({ hours, title, forName, onClick }: { hours: HoursRowView; title: string; forName?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add time to ${title}${forName ? ` for ${forName}` : ""}`}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
        hours.met ? "bg-accent text-accent-fg" : "border-2 border-accent bg-surface text-accent"
      }`}
    >
      {hours.met ? <Check aria-hidden="true" size={22} /> : <Plus aria-hidden="true" size={22} />}
    </button>
  );
}

/**
 * "3½ hours left · about 1¾ a day" with the amount left in semibold plain text
 * (decision 190: no amber). Nothing once the week's goal is met.
 */
export function HoursLeftLine({ hours }: { hours: HoursRowView }) {
  if (hours.leftShort === null || hours.leftText === null) return null;
  return (
    <p className="text-sm text-muted">
      <span className="font-semibold text-fg">{hours.leftShort}</span>
      {hours.leftText.slice(hours.leftShort.length)}
    </p>
  );
}

/**
 * An hours habit's Today row (decisions 187 to 190): the icon, the title, "6½ of
 * 10 hours this week", the bar, the hours left and the pace, and the + that
 * opens the log sheet. Once met it reads "done", sits with the finished rows
 * and the + is a filled check that still opens the sheet. It has no skip swipe:
 * an hours habit is never due on a day. A weeks streak shows from 2 (decision 195).
 */
export function HoursHabitRow({
  row,
  hours,
  onLog,
  showStreaks,
  readOnly = false,
  layout = "row",
}: {
  row: HabitRowView;
  hours: HoursRowView;
  onLog: () => void;
  showStreaks: boolean;
  /** A past day (mission 51): the bar and the words stay, the log button goes. */
  readOnly?: boolean;
  /** "auto" is a card in Mine's time columns (same classes, a rounded surface); "row" is the dashboard tile's row. */
  layout?: "row" | "auto";
}) {
  const body = (
    <div className="flex min-h-15 items-center gap-3 px-3 py-2">
      <Link href={`/habits/${row.id}`} draggable={false} className="flex min-w-0 flex-1 items-center gap-3 self-stretch">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hours.met ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent"}`}>
          <HabitIcon name={row.icon} kind={row.kind} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-base font-semibold ${hours.met ? "text-muted" : ""}`}>{row.title}</span>
            {showStreaks && row.streakLabel && (
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-streak">
                <Flame aria-hidden="true" size={14} />
                {row.streakLabel}
              </span>
            )}
          </div>
          <span className="text-sm text-muted">{hours.doneText}</span>
          <ProgressBar fraction={hours.fraction} label={`${row.title}: ${hours.doneText}`} />
          <HoursLeftLine hours={hours} />
        </div>
      </Link>
      {!readOnly && <HoursLogButton hours={hours} title={row.title} onClick={onLog} />}
    </div>
  );
  return layout === "auto" ? <div className="overflow-hidden rounded-2xl bg-surface">{body}</div> : body;
}
