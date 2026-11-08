"use client";

import { Flame, Plane, Trophy } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { FamilyHabitRow } from "./HabitFamilyColumn";
import { TIME_ICONS } from "./HabitFilterChips";
import { avatarColorHex } from "@/lib/constants";
import { ANYTIME_LABEL, CHORES_LAST_WEEK_FAMILY, TIME_OF_DAY_LABELS, streakLabel } from "@/lib/habitVocabulary";
import type { FamilyColumn, FamilyRow } from "@/lib/habitsFamily";
import { emptyColumnText, familyCountText, groupColumnRows } from "@/lib/habitsFamilyColumns";

/**
 * One person's column on the iPad: 330px wide (or an equal share when everyone fits), tinted
 * with the person's colour and scrolling on its own. The header
 * (avatar, name, "3 of 7 done", the chore streak flame, the Sunday shout-out)
 * stays put; below it the rows sit under Morning, Afternoon, Evening and
 * Anytime. Together rows the person is on sit in their group with a tag, and a
 * tap on one checks it for the family (decision 1, mission 41).
 */
export function HabitFamilyWideColumn({
  column,
  together,
  showStreaks,
  fits = false,
  keep,
  onToggle,
}: {
  column: FamilyColumn;
  /** The Together habits, so the count and the groups can include the ones this person is on. */
  together: FamilyRow[];
  showStreaks: boolean;
  /** True when everyone fits: the column takes an equal share instead of 330px. */
  fits?: boolean;
  /** The lit filter chip: whether a row shows. The count above is always the whole day. */
  keep: (row: FamilyRow) => boolean;
  onToggle: (row: FamilyRow) => void;
}) {
  const groups = groupColumnRows(column, together, keep);
  const streak = showStreaks ? streakLabel(column.choreStreak, "days") : null;

  return (
    <section
      aria-label={column.displayName}
      data-family-person={column.id}
      data-layout="wide"
      // A 12% wash of the person's colour over the surface (dark mode follows --surface).
      style={{ backgroundColor: `color-mix(in srgb, ${avatarColorHex(column.avatarColor)} 12%, var(--surface))` }}
      className={`flex flex-col overflow-hidden rounded-2xl ${fits ? "min-w-0 flex-1 basis-0" : "w-[330px] shrink-0 snap-start"}`}
    >
      <div className="flex flex-col gap-1 p-3.5">
        <div className="flex items-center gap-3">
          <AvatarBadge displayName={column.displayName} avatarColor={column.avatarColor} size={44} />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-lg font-bold leading-tight">{column.displayName}</h2>
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-strong">
              {familyCountText(column, together)}
              {streak && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-streak">
                  <Flame aria-hidden="true" size={14} />
                  {streak}
                </span>
              )}
            </span>
          </div>
          {column.onVacation && <Plane aria-hidden="true" size={18} className="shrink-0 text-muted-strong" />}
        </div>
        {column.shoutOut && (
          <p className="mt-1 flex items-center gap-2 rounded-xl bg-streak-soft px-3 py-2 text-sm font-semibold">
            <Trophy aria-hidden="true" size={16} className="shrink-0 text-streak" />
            {CHORES_LAST_WEEK_FAMILY}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-20">
        {groups.length === 0 && <p className="py-3 text-sm text-muted-strong">{emptyColumnText(column, together)}</p>}
        {groups.map((group) => {
          const Icon = group.key === "anytime" ? null : TIME_ICONS[group.key];
          return (
            <div key={group.key}>
              <h3 className="flex items-center gap-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-strong">
                {Icon && <Icon aria-hidden="true" size={14} />}
                {group.key === "anytime" ? ANYTIME_LABEL : TIME_OF_DAY_LABELS[group.key]}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {group.items.map(({ row, tag, together: isTogether }) => (
                  <li key={row.id}>
                    <FamilyHabitRow row={row} showStreaks={showStreaks} onToggle={() => onToggle(row)} together={isTogether} tag={tag} layout="card" />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
