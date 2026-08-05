"use client";

import BranchTile from "./BranchTile";
import { useToday } from "@/lib/useToday";
import { isSameDay, sundayOf } from "@/lib/mealPlanDates";

/**
 * A BranchTile that badges "Plan this week" when the current week has no
 * meal plan yet — the badge philosophy applied to meal planning: an
 * unplanned week is exactly the kind of thing that needs attention, while
 * a planned one needs no badge at all (never "3 meals planned").
 *
 * This is a client component for one specific reason, and it's the same
 * reason MealPlanList is: deciding *which* week is the current one has to
 * happen against the browser's clock, never the server's. Vercel's runtime
 * runs UTC and this household runs Mountain, so a server-rendered badge
 * would call the week "unplanned" hours early every evening — see
 * src/lib/useToday.ts and src/lib/mealPlanDates.ts for the full reasoning.
 *
 * The server hands down the raw list of planned week-starts and does no
 * date interpretation of its own. While `today` is still null (SSR and the
 * first client render) the tile renders with no badge — briefly showing
 * nothing is the honest option, and matches what the server rendered, so
 * there's no hydration mismatch to flip.
 */
export default function PlanWeekTile({
  href,
  icon,
  title,
  plannedWeekStarts,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  plannedWeekStarts: Date[];
}) {
  const today = useToday();

  const thisWeekPlanned =
    today === null ||
    plannedWeekStarts.some((weekStart) => isSameDay(weekStart, sundayOf(today)));

  return (
    <BranchTile
      href={href}
      icon={icon}
      title={title}
      badge={thisWeekPlanned ? undefined : "Plan this week"}
    />
  );
}
