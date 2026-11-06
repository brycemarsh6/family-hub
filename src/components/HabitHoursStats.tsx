"use client";

import { Flame } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HoursEntryList } from "./HoursEntryList";
import { ProgressBar } from "./ProgressBar";
import { streakCountLabel } from "@/lib/habitVocabulary";
import { formatHours, type HoursStatsData } from "@/lib/habitsHours";

const SECTION_TITLE = "text-sm font-semibold uppercase tracking-wide text-muted";
const CHART_HEIGHT = 96;
/** A day with no time still draws a thin stub, so the seven days always read as a row. */
const EMPTY_STUB = 4;

function Tile({ value, label, flame = false }: { value: string; label: string; flame?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl border border-line bg-surface p-2.5">
      <span className="flex items-center gap-1 text-[22px] font-bold">
        {flame && <Flame aria-hidden="true" size={16} className="text-streak" />}
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/**
 * The hours habit's stats body (decisions 192, 195, 196, 198): the three tiles,
 * "This week" with its bar and a Sunday to Saturday chart drawn to scale (the
 * hours above each bar, blank over an empty day), the last four weeks, the
 * "Switched to hours" line, the entries to remove, and for Side by side one bar
 * per person. There is no month calendar here. The words come ready-made from
 * `buildHoursStats`; this only draws them.
 */
export function HabitHoursStats({ hours }: { hours: HoursStatsData }) {
  const tallest = Math.max(...hours.chartDays.map((day) => day.minutes), 1);
  const { view } = hours;

  return (
    <>
      <div className="flex gap-2">
        <Tile value={streakCountLabel(hours.tiles.current, "weeks")} label="Current streak" flame />
        <Tile value={streakCountLabel(hours.tiles.best, "weeks")} label="Best streak" />
        <Tile value={hours.tiles.totalText} label="Total hours" />
      </div>

      <h2 className={`mt-1 ${SECTION_TITLE}`}>This week</h2>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
        <p className="text-2xl font-bold tabular-nums">{view.doneText}</p>
        <ProgressBar fraction={view.fraction} label={`This week: ${view.doneText}`} />
        {view.leftText && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-fg">{view.leftShort}</span>
            {view.leftText.slice((view.leftShort ?? "").length)}
          </p>
        )}
        <ul aria-label="Hours by day" className="mt-1 grid grid-cols-7 items-end gap-1.5">
          {hours.chartDays.map((day) => (
            <li key={day.day} className="flex flex-col items-center justify-end gap-1" style={{ height: CHART_HEIGHT + 40 }}>
              <span className="h-4 text-xs tabular-nums">{day.minutes > 0 ? formatHours(day.minutes) : ""}</span>
              <span
                aria-hidden="true"
                className={`w-full rounded-t-md ${day.minutes > 0 ? "bg-accent" : "bg-surface-2"}`}
                style={{ height: day.minutes > 0 ? Math.max(EMPTY_STUB, Math.round((day.minutes / tallest) * CHART_HEIGHT)) : EMPTY_STUB }}
              />
              <span className="text-xs text-muted">
                {day.label}
                <span className="sr-only">: {day.minutes > 0 ? `${formatHours(day.minutes)} hours` : "no time"}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted">{hours.lastWeeksText}</p>
      {hours.switchedText && <p className="text-sm text-muted">{hours.switchedText}</p>}

      <h2 className={`mt-1 ${SECTION_TITLE}`}>Time logged</h2>
      <HoursEntryList thisWeek={hours.entries.thisWeek} lastWeek={hours.entries.lastWeek} />

      {hours.perPerson && (
        <>
          <h2 className={`mt-1 ${SECTION_TITLE}`}>Side by side</h2>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5">
            {hours.perPerson.map((person) => (
              <div key={person.userId} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={24} />
                  <span className="flex-1 text-sm font-semibold">{person.displayName}</span>
                  <span className="text-sm tabular-nums text-muted">{person.view.doneText}</span>
                </div>
                <ProgressBar fraction={person.view.fraction} label={`${person.displayName}: ${person.view.doneText}`} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
