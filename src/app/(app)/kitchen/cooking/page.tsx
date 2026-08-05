import { BookOpen, CalendarDays } from "lucide-react";
import BranchTile from "@/components/BranchTile";
import PlanWeekTile from "@/components/PlanWeekTile";
import { BackLink } from "@/components/BackLink";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Cooking's landing page — same tile-grid pattern as Kitchen's own landing
// page (src/app/kitchen/page.tsx), one large tile per sub-page. The global nav
// bar doesn't drill into a branch's sub-pages, so this page is the only route
// into Recipes and Meal Plan.
//
// Was three tiles (Recipes / Menu / Meal planning) — Menu and Meal planning
// were dropped to one line apart in conversation and merged into a single
// "Meal Plan" tile before Menu was ever built, rather than shipping two
// features that would have turned out to be the same feature.
//
// Meal Plan carries the same "Plan this week" badge Kitchen's Cooking tile
// does, deliberately: Kitchen's badge is what makes you tap through, and a
// badge that vanished on the way in would leave you hunting for whatever it
// was pointing at.
export default async function CookingPage() {
  const mealPlans = await db.mealPlan.findMany({ select: { weekStart: true } });

  return (
    <div className="py-4">
      <BackLink href="/kitchen" label="Kitchen" />

      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Cooking</h1>
      <p className="mt-2 text-base text-muted">
        What we make, and what we&apos;re making next.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <BranchTile
          href="/kitchen/cooking/recipes"
          icon={<BookOpen size={32} className="text-muted" />}
          title="Recipes"
        />
        <PlanWeekTile
          href="/kitchen/cooking/meal-plan"
          icon={<CalendarDays size={32} className="text-muted" />}
          title="Meal Plan"
          plannedWeekStarts={mealPlans.map((plan) => plan.weekStart)}
        />
      </div>
    </div>
  );
}
