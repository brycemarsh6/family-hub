import { AvatarBadge } from "./AvatarBadge";
import type { SideBySideRow } from "@/lib/habitsStats";
import { RATE_NONE_LABEL, streakCountLabel, type StreakUnit } from "@/lib/habitVocabulary";

/**
 * The Side by side table (decision 97's companion): total done, rate and
 * streak for each person. It is also the text alternative to the week strips
 * below it, so it always stays on the page. A real table, so a screen reader
 * announces each number with its column.
 */
export function HabitSideBySide({ rows, unit }: { rows: SideBySideRow[]; unit: StreakUnit }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <table className="w-full text-sm">
        <caption className="sr-only">Done, rate and streak for each person</caption>
        <thead>
          <tr className="text-left font-semibold text-muted">
            <th scope="col" className="min-h-10 py-2 font-semibold">
              <span className="sr-only">Person</span>
            </th>
            <th scope="col" className="py-2 font-semibold">Done</th>
            <th scope="col" className="py-2 font-semibold">Rate</th>
            <th scope="col" className="py-2 font-semibold">Streak</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId} className="border-t border-line">
              <th scope="row" className="min-h-10 py-2 text-left font-normal">
                <span className="flex items-center gap-1.5">
                  <AvatarBadge displayName={row.displayName} avatarColor={row.avatarColor} size={22} />
                  {row.displayName}
                </span>
              </th>
              <td className="py-2">{row.total}</td>
              <td className="py-2">{row.rate === null ? RATE_NONE_LABEL : `${row.rate}%`}</td>
              <td className="py-2">{streakCountLabel(row.streak, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
