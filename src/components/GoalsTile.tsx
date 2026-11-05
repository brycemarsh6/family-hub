import { Target } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { ProgressBar } from "./ProgressBar";

/**
 * The dashboard's "Goals this week" tile: this week's habit taps (the same
 * numbers as the This week header) and up to three habits with taps left.
 * The whole tile opens This week; nothing inside it is a link or a button.
 */
export default function GoalsTile({
  done,
  total,
  todo,
}: {
  done: number;
  total: number;
  todo: { title: string; left: number }[];
}) {
  return (
    <DashboardTile
      href="/plans"
      icon={<Target size={20} className="text-muted" />}
      title="Goals this week"
    >
      {total === 0 ? (
        <p className="text-sm text-muted">No habits planned</p>
      ) : (
        <>
          <p className="text-lg font-semibold tabular-nums">
            {done} of {total} done
          </p>
          <div className="mt-2">
            <ProgressBar fraction={done / total} label="Goals this week progress" />
          </div>
          {todo.length === 0 ? (
            <p className="mt-3 text-sm text-muted">All done this week</p>
          ) : (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Still to do:</p>
              <ul className="mt-1 text-sm">
                {todo.map((habit) => (
                  <li key={habit.title} className="truncate">
                    {habit.title} · {habit.left} left
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </DashboardTile>
  );
}
