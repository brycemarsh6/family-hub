"use client";

import { Flame, House } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { HabitTileRows } from "./HabitsTile";
import type { HabitRowView } from "@/lib/habitsRead";

/**
 * The dashboard's "Chores today" tile (decision 133): chores due or done today,
 * the chore flame after the title from 2 days when the person shows streaks
 * (as on Today, decision 120). Panel shape like the Habits tile.
 */
export default function ChoresTile({
  rows,
  empty,
  choreStreak,
  showStreaks,
}: {
  rows: HabitRowView[];
  empty: string | null;
  choreStreak: number;
  showStreaks: boolean;
}) {
  return (
    <DashboardTile
      shape="panel"
      href="/habits"
      icon={<House aria-hidden="true" size={20} className="text-muted" />}
      title="Chores today"
      aside={
        showStreaks && choreStreak >= 2 ? (
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-streak">
            <Flame aria-hidden="true" size={14} />
            {choreStreak} days
          </span>
        ) : undefined
      }
    >
      <HabitTileRows rows={rows} empty={empty} showStreaks={showStreaks} />
    </DashboardTile>
  );
}
