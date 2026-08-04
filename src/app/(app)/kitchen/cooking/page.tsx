import { BookOpen, CalendarDays } from "lucide-react";
import BranchTile from "@/components/BranchTile";

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
// No badge on Meal Plan yet: it's still a placeholder, and a badge's job is
// to say "this needs attention" — there's nothing behind it to need it.
export default function CookingPage() {
  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Cooking</h1>
      <p className="mt-2 text-base text-muted">
        What we make, and what we&apos;re making next.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <BranchTile
          href="/kitchen/cooking/recipes"
          icon={BookOpen}
          title="Recipes"
        />
        <BranchTile
          href="/kitchen/cooking/meal-plan"
          icon={CalendarDays}
          title="Meal Plan"
        />
      </div>
    </div>
  );
}
