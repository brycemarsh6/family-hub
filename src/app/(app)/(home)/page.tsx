import { Package, ShoppingCart, BookOpen, CalendarDays } from "lucide-react";
import DashboardTile from "@/components/DashboardTile";
import TodayMealsTile from "@/components/TodayMealsTile";
import { db } from "@/lib/db";
import { isLow } from "@/lib/constants";
import { addDays } from "@/lib/mealPlanDates";
import { effectiveExpiry, daysUntil } from "@/lib/expiring";
import { storeBreakdown, urgentLowItems } from "@/lib/dashboard";
import type { Category, Location } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

// Same window kitchen/page.tsx's own tile badge uses for "expiring soon" —
// today/tomorrow plus one extra day of runway. Duplicated here rather than
// imported from a shared constant: expiring.ts doesn't currently export
// this number (it lives as a private constant inside kitchen/page.tsx), and
// lifting it would mean touching that file too for a three-line saving with
// no behavior change — see this contract's own boundary note on the
// optional lift. If a third caller ever needs this number, that's the time
// to actually make the shared constant.
const EXPIRING_SOON_WINDOW_DAYS = 3;

// How many of the most-urgent low items to name on the Inventory tile
// before folding the rest into "+N more" — a dashboard tile is a glance,
// not a list, so this stays small on purpose.
const MAX_URGENT_LOW_ITEMS = 3;

// "force-dynamic" tells Next.js: never serve a cached copy of this page,
// always rebuild it from the database. Without it, Next would happily show
// a snapshot taken at build time, and every count below would silently go
// stale — same rule every other page in this app already follows.
export const dynamic = "force-dynamic";

/**
 * The family's front door: four tiles summarizing the whole Kitchen branch
 * (today's meals, inventory, the grocery list, recipes) with a tap straight
 * into each one. No DAL/session call here — this page shows nothing
 * role-gated, and the real login gate already lives in proxy.ts plus the
 * shared (app) layout above this page.
 */
export default async function DashboardPage() {
  // Used only to bound the meal-plan query below (a wide tolerance window,
  // not a "what day is it" decision) — Vercel's server clock runs UTC while
  // this household runs Mountain, so nothing that actually decides which
  // week is "current" may use this value. That decision happens entirely
  // client-side, in TodayMealsTile, against the browser's own clock (see
  // src/lib/useToday.ts). ±8 days comfortably contains the real current
  // week no matter how far the two clocks disagree.
  const serverNow = new Date();
  const windowStart = addDays(serverNow, -8);
  const windowEnd = addDays(serverNow, 8);

  const [pantryItems, groceryItems, recipeCount, newestRecipe, mealPlans] = await Promise.all([
    db.pantryItem.findMany({
      select: {
        name: true,
        quantity: true,
        lowThreshold: true,
        category: true,
        location: true,
        expiresAt: true,
        restockedAt: true,
      },
    }),
    db.groceryItem.findMany({
      where: { checked: false },
      select: { store: true },
    }),
    db.recipe.count(),
    db.recipe.findFirst({
      orderBy: { createdAt: "desc" },
      select: { title: true },
    }),
    db.mealPlan.findMany({
      where: { weekStart: { gte: windowStart, lte: windowEnd } },
      include: {
        entries: {
          select: { id: true, dayOffset: true, slot: true, title: true, recipeId: true },
        },
      },
    }),
  ]);

  // Same reasoning as kitchen/page.tsx's own lowCount: Postgres (like
  // SQLite before it) can't compare two columns of the same row to each
  // other inside a `where`, so the low check happens here instead. Fine at
  // family scale (hundreds of rows, not thousands).
  const lowItems = pantryItems.filter((item) => isLow(item.quantity, item.lowThreshold));
  const urgent = urgentLowItems(lowItems, MAX_URGENT_LOW_ITEMS);

  const expiringSoonCount = pantryItems.filter((item) => {
    const expiry = effectiveExpiry({
      name: item.name,
      category: item.category as Category,
      location: item.location as Location,
      expiresAt: item.expiresAt,
      restockedAt: item.restockedAt,
    });
    return expiry !== null && daysUntil(expiry.date, serverNow) <= EXPIRING_SOON_WINDOW_DAYS;
  }).length;

  const toBuy = groceryItems.length;
  const breakdown = storeBreakdown(groceryItems);

  // Same shape as meal-plan/page.tsx's own view mapping — kept in sync by
  // hand, since MealPlanView is a plain browser-facing type, not something
  // Prisma produces directly.
  const mealPlanViews: MealPlanView[] = mealPlans.map((plan) => ({
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
    <div className="py-4">
      {/* Not "Marshee" — the wordmark is already in the header directly
          above this, and repeating it reads as a stutter. */}
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
      <p className="mt-2 text-base text-muted">What&apos;s going on around the house.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <TodayMealsTile
          href="/kitchen/cooking/meal-plan"
          icon={<CalendarDays size={20} className="text-muted" />}
          title="Today's meals"
          plans={mealPlanViews}
        />

        <DashboardTile
          href="/kitchen/inventory"
          icon={<Package size={20} className="text-muted" />}
          title="Inventory"
          badge={lowItems.length > 0 ? `${lowItems.length} low` : undefined}
        >
          <p className="text-lg font-semibold tabular-nums">
            {pantryItems.length} stocked
          </p>
          {expiringSoonCount > 0 && (
            <p className="text-sm text-muted">{expiringSoonCount} expiring</p>
          )}
          {urgent.names.length > 0 && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {urgent.names.join(", ")}
              {urgent.more > 0 && ` +${urgent.more} more`}
            </p>
          )}
        </DashboardTile>

        <DashboardTile
          href="/kitchen/shopping"
          icon={<ShoppingCart size={20} className="text-muted" />}
          title="Grocery"
          badge={toBuy > 0 ? `${toBuy} to buy` : undefined}
        >
          {toBuy === 0 ? (
            <p className="text-sm text-muted">Nothing to buy</p>
          ) : (
            <p className="line-clamp-2 text-sm text-muted">
              {breakdown.map((store) => `${store.label} ${store.count}`).join(" · ")}
            </p>
          )}
        </DashboardTile>

        <DashboardTile
          href="/kitchen/cooking/recipes"
          icon={<BookOpen size={20} className="text-muted" />}
          title="Recipes"
          wide
        >
          <p className="text-sm text-muted">
            {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
          </p>
          {newestRecipe && (
            // Its own line rather than appended after the count: real recipe
            // titles ("Copycat Cracker Barrel Meatloaf") ran past the tile
            // and truncated mid-word when the two shared one.
            <p className="mt-0.5 truncate text-sm text-muted">
              Newest: {newestRecipe.title}
            </p>
          )}
        </DashboardTile>
      </div>
    </div>
  );
}
