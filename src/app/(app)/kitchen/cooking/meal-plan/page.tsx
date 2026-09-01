import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { MealPlanList } from "@/components/MealPlanList";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

export const dynamic = "force-dynamic";

// Meal Plan's own page. Household scale (a full year is 52 rows), so this
// fetches every week at once and hands it to a client component that does
// all the actual date interpretation — see src/lib/mealPlanDates.ts and
// src/lib/useToday.ts for why "what week is this" has to be decided by the
// browser's own clock, never the server's.
export default async function MealPlanPage() {
  // Only to decide whether each week's delete button renders below —
  // deleteMealPlan is the real, server-side gate (mission-6's C1).
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  const [plans, recipes] = await Promise.all([
    db.mealPlan.findMany({
      include: { entries: true },
      orderBy: { weekStart: "asc" },
    }),
    db.recipe.findMany({
      select: { id: true, title: true, ingredients: true },
    }),
  ]);

  const views: MealPlanView[] = plans.map((plan) => ({
    id: plan.id,
    weekStart: plan.weekStart,
    entries: plan.entries.map((entry) => ({
      id: entry.id,
      dayOffset: entry.dayOffset,
      slot: entry.slot,
      title: entry.title,
      recipeId: entry.recipeId,
    })),
  }));

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking" label="Cooking" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Meal Plan
      </h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        This week, and the weeks before it.
      </p>

      <MealPlanList plans={views} recipes={recipes} canManage={canManage} />
    </div>
  );
}
