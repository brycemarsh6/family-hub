import type { ReactNode } from "react";
import { Package, ShoppingCart, BookOpen, CalendarDays } from "lucide-react";
import DashboardTile from "@/components/DashboardTile";
import ChoresTile from "@/components/ChoresTile";
import { ChoreShoutOutCard } from "@/components/ChoreShoutOutCard";
import GoalsTile from "@/components/GoalsTile";
import HabitsTile from "@/components/HabitsTile";
import { NudgeCards } from "@/components/NudgeCard";
import { PlanDayCards } from "@/components/PlanDayCard";
import { PlannedTodayCard } from "@/components/PlannedTodayCard";
import TodayMealsTile from "@/components/TodayMealsTile";
import DashboardWidgetList from "@/components/DashboardWidgetList";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { DEFAULT_DASHBOARD_LAYOUT, parseDashboardLayout } from "@/lib/dashboardLayout";
import { layoutForViewer, picksOf } from "@/lib/dashboardPicks";
import type { DashboardWidgetId } from "@/lib/dashboardWidgets";
import { householdToday } from "@/lib/assistant/today";
import { loadGoalsTile } from "@/lib/goalsRead";
import { loadDashboardHabits } from "@/lib/habitsRead";
import { isLow } from "@/lib/constants";
import { addDays } from "@/lib/mealPlanDates";
import { isExpiringWithin } from "@/lib/expiring";
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
 * into each one. Nothing here is role-gated (the real login gate lives in
 * proxy.ts plus the shared (app) layout), but the session is read to find
 * this person's saved widget layout. Device logins (the wall tablet) always
 * get the default layout and no Customize button.
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

  const user = await getVerifiedUser();
  const isDevice = user?.isDevice ?? true;

  // The Goals tile is the one server-side "what day is it" decision on this
  // page, so it uses the household (Denver) date, the same helper the Plans
  // pages use, never serverNow.
  const goalsToday = householdToday(new Date())!;

  // The layout read starts now but nothing waits on it except the two loaders
  // that need the picked habits and goals in it. Whatever is stored is a
  // claim, never a type: parse, don't cast. The tablet always gets the default
  // layout, minus the Habits and Chores tiles (decision 138).
  const layoutPromise = (
    user && !user.isDevice
      ? db.userPreferences.findUnique({
          where: { userId: user.userId },
          select: { dashboardLayout: true },
        })
      : Promise.resolve(null)
  ).then((stored) =>
    layoutForViewer(
      stored?.dashboardLayout ? parseDashboardLayout(stored.dashboardLayout) : DEFAULT_DASHBOARD_LAYOUT,
      isDevice,
    ),
  );

  const [layout, pantryItems, groceryItems, recipeCount, newestRecipe, mealPlans, goalsTile, habitsData] = await Promise.all([
    layoutPromise,
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
    user
      ? layoutPromise.then((layout) =>
          loadGoalsTile({ userId: user.userId, isDevice: user.isDevice }, goalsToday, picksOf(layout, "goals")),
        )
      : { done: 0, total: 0, todo: [], picked: false, pickable: [] },
    // Habits & Chores read the same rows Today does; the tablet has no tile for them.
    user && !user.isDevice
      ? layoutPromise.then((layout) =>
          loadDashboardHabits({ userId: user.userId, role: user.role }, goalsToday, picksOf(layout, "habits")),
        )
      : null,
  ]);

  // Same reasoning as kitchen/page.tsx's own lowCount: Postgres (like
  // SQLite before it) can't compare two columns of the same row to each
  // other inside a `where`, so the low check happens here instead. Fine at
  // family scale (hundreds of rows, not thousands).
  const lowItems = pantryItems.filter((item) => isLow(item.quantity, item.lowThreshold));
  const urgent = urgentLowItems(lowItems, MAX_URGENT_LOW_ITEMS);

  const expiringSoonCount = pantryItems.filter((item) => {
    return isExpiringWithin(
      {
        name: item.name,
        category: item.category as Category,
        location: item.location as Location,
        expiresAt: item.expiresAt,
        restockedAt: item.restockedAt,
      },
      EXPIRING_SOON_WINDOW_DAYS,
      serverNow,
    );
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

  const tiles: Record<DashboardWidgetId, ReactNode> = {
    habits:
      habitsData && user ? (
        <HabitsTile
          key={picksOf(layout, "habits").join(",")}
          rows={habitsData.habits.rows}
          todayRows={habitsData.habitsToday}
          label={habitsData.habits.label}
          empty={habitsData.habits.empty}
          showStreaks={user.showStreaks}
        />
      ) : null,
    chores:
      habitsData && user ? (
        <ChoresTile
          rows={habitsData.chores.rows}
          todayRows={habitsData.choresToday}
          empty={habitsData.chores.empty}
          choreStreak={habitsData.choreStreak}
          showStreaks={user.showStreaks}
        />
      ) : null,
    todayMeals: (
      <TodayMealsTile
        href="/kitchen/cooking/meal-plan"
        icon={<CalendarDays size={20} className="text-muted" />}
        title="Today's meals"
        plans={mealPlanViews}
      />
    ),
    goals: <GoalsTile done={goalsTile.done} total={goalsTile.total} todo={goalsTile.todo} picked={goalsTile.picked} />,
    inventory: (
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
    ),
    grocery: (
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
            {/* Non-breaking space: a plain one let "Amazon 2" wrap between the
                store and its count, orphaning a bare "2" on the next line. */}
            {breakdown.map((store) => `${store.label}\u00A0${store.count}`).join(" · ")}
          </p>
        )}
      </DashboardTile>
    ),
    recipes: (
      <DashboardTile
        href="/kitchen/cooking/recipes"
        icon={<BookOpen size={20} className="text-muted" />}
        title="Recipes"
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
    ),
  };

  // The nudge and Sunday cards sit under the heading row, above the tiles,
  // nudges first (decision 139), then Planned today and the Pick a day cards
  // (decisions 141, 145). They are not widgets and the tablet gets none.
  const hasNotes =
    habitsData &&
    (habitsData.nudges.length > 0 || habitsData.shoutOut || habitsData.plannedToday.length > 0 || habitsData.prompts.length > 0);
  const notes =
    habitsData && user && hasNotes ? (
      <>
        <NudgeCards nudges={habitsData.nudges} />
        {habitsData.shoutOut && <ChoreShoutOutCard />}
        <PlannedTodayCard rows={habitsData.plannedToday} showStreaks={user.showStreaks} />
        <PlanDayCards prompts={habitsData.prompts} />
      </>
    ) : null;

  return (
    <DashboardWidgetList
      layout={layout}
      tiles={tiles}
      notes={notes}
      pickable={{ habits: habitsData?.pickable ?? [], goals: goalsTile.pickable }}
      canCustomize={!isDevice}
    />
  );
}
