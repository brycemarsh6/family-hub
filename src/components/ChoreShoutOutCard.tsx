import { Trophy } from "lucide-react";
import { CHORES_LAST_WEEK_CARD } from "@/lib/habitVocabulary";

/** The Sunday card after a clean chore week (decision 122), shared by Today and the dashboard (decision 139). */
export function ChoreShoutOutCard() {
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-streak-soft px-3 py-3">
      <Trophy aria-hidden="true" size={20} className="shrink-0 text-streak" />
      <p className="min-w-0 flex-1 text-sm font-semibold">{CHORES_LAST_WEEK_CARD}</p>
    </div>
  );
}
