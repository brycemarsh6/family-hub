import { Package, ShoppingCart, Hourglass, ChefHat } from "lucide-react";
import BranchTile from "@/components/BranchTile";
import PlanWeekTile from "@/components/PlanWeekTile";
import { db } from "@/lib/db";
import { effectiveExpiry, daysUntil } from "@/lib/expiring";
import type { Category, Location } from "@/lib/constants";

// Matches "now" on the Expiring page itself (today/tomorrow) plus one more
// day of runway — enough to nudge you before something is actually urgent,
// not just after.
const TILE_BADGE_WINDOW_DAYS = 3;

// "force-dynamic" tells Next.js: never serve a cached copy of this page, always
// rebuild it from the database. Without it Next would happily show a snapshot
// taken at build time, and the badges below would silently go stale.
export const dynamic = "force-dynamic";

// Kitchen's own landing page — one large tile per sub-branch. This is now the
// only route into Inventory, Shopping, Expiring and Cooking: the global nav
// bar (see src/app/layout.tsx) doesn't drill down into a branch's own pages,
// so a branch needs a page like this to get you the rest of the way in.
//
// Each tile's badge reports what needs attention, not how much is in there —
// deliberately not "87 items stocked", just the count that means "go look at
// this." Cooking's badge is the odd one out: it isn't a count at all, since
// "this week has no meal plan" is a yes/no question, and it's decided on the
// client rather than here (see PlanWeekTile for why).
export default async function KitchenPage() {
  const [toBuy, pantryItems, mealPlans] = await Promise.all([
    db.groceryItem.count({ where: { checked: false } }),
    db.pantryItem.findMany({
      select: {
        quantity: true,
        lowThreshold: true,
        name: true,
        category: true,
        location: true,
        expiresAt: true,
        restockedAt: true,
      },
    }),
    // Just the week-starts — the Cooking tile's badge decides "is this week
    // planned" on the client, against the browser's clock (see PlanWeekTile).
    db.mealPlan.findMany({ select: { weekStart: true } }),
  ]);

  // SQLite can't compare two columns to each other inside a `where`, so we
  // count the low items here instead. Fine at family scale (dozens of rows).
  const lowCount = pantryItems.filter(
    (item) => item.quantity <= item.lowThreshold,
  ).length;

  const today = new Date();
  const expiringSoonCount = pantryItems.filter((item) => {
    const expiry = effectiveExpiry({
      name: item.name,
      category: item.category as Category,
      location: item.location as Location,
      expiresAt: item.expiresAt,
      restockedAt: item.restockedAt,
    });
    return expiry !== null && daysUntil(expiry.date, today) <= TILE_BADGE_WINDOW_DAYS;
  }).length;

  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kitchen</h1>
      <p className="mt-2 text-base text-muted">
        What we need, and what we already have.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <BranchTile
          href="/kitchen/inventory"
          icon={<Package size={32} className="text-muted" />}
          title="Inventory"
          badge={lowCount > 0 ? `${lowCount} low` : undefined}
        />
        <BranchTile
          href="/kitchen/shopping"
          icon={<ShoppingCart size={32} className="text-muted" />}
          title="Shopping"
          badge={toBuy > 0 ? `${toBuy} to buy` : undefined}
        />
        <BranchTile
          href="/kitchen/expiring"
          icon={<Hourglass size={32} className="text-muted" />}
          title="Expiring"
          badge={expiringSoonCount > 0 ? `${expiringSoonCount} soon` : undefined}
        />
        <PlanWeekTile
          href="/kitchen/cooking"
          icon={<ChefHat size={32} className="text-muted" />}
          title="Cooking"
          plannedWeekStarts={mealPlans.map((plan) => plan.weekStart)}
        />
      </div>
    </div>
  );
}
