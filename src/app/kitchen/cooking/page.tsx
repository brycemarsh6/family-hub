import { BookOpen, UtensilsCrossed, CalendarDays } from "lucide-react";
import BranchTile from "@/components/BranchTile";

// Cooking's landing page — same tile-grid pattern as Kitchen's own landing
// page (src/app/kitchen/page.tsx), one large tile per sub-page. The global nav
// bar doesn't drill into a branch's sub-pages, so this page is the only route
// into Recipes, Menu and Meal planning.
//
// No badges yet: all three sub-pages are placeholders, and a badge's job is to
// say "this needs attention" — there's nothing behind them to need it.
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
          href="/kitchen/cooking/menu"
          icon={UtensilsCrossed}
          title="Menu"
        />
        <BranchTile
          href="/kitchen/cooking/meal-planning"
          icon={CalendarDays}
          title="Meal planning"
          wide
        />
      </div>
    </div>
  );
}
