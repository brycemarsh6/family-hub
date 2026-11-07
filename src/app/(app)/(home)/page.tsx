import type { ReactNode } from "react";
import { Package, ShoppingCart, BookOpen, CalendarDays } from "lucide-react";
import DashboardTile from "@/components/DashboardTile";
import ChoresTile from "@/components/ChoresTile";
import { ChoreShoutOutCard } from "@/components/ChoreShoutOutCard";
import GoalsTile from "@/components/GoalsTile";
import HabitsTile from "@/components/HabitsTile";
import { NudgeCards } from "@/components/NudgeCard";
import { PlanDayCard } from "@/components/PlanDayCard";
import { PlannedTodayCard } from "@/components/PlannedTodayCard";
import TodayMealsTile from "@/components/TodayMealsTile";
import DashboardWidgetList from "@/components/DashboardWidgetList";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { DEFAULT_DASHBOARD_LAYOUT, parseDashboardLayout, type DashboardWidget } from "@/lib/dashboardLayout";
import { layoutForViewer, picksOf } from "@/lib/dashboardPicks";
import {
  loadGrocerySummary,
  loadInventorySummary,
  loadMealPlans,
  loadRecipesSummary,
} from "@/lib/dashboardLoaders";
import { DASHBOARD_WIDGETS, DASHBOARD_WIDGET_WORDS } from "@/lib/dashboardWidgets";
import { householdToday } from "@/lib/assistant/today";
import { goalsTileFor, loadGoalsTile } from "@/lib/goalsRead";
import { habitsTileFor, loadDashboardHabits } from "@/lib/habitsRead";

// "force-dynamic" tells Next.js: never serve a cached copy of this page,
// always rebuild it from the database. Without it, Next would happily show
// a snapshot taken at build time, and every count below would silently go
// stale: same rule every other page in this app already follows.
export const dynamic = "force-dynamic";

/**
 * The family's front door: the widgets this person laid out (by default the
 * whole Kitchen branch plus Habits, Chores and Goals), each a tap straight into
 * its page. Nothing here is role-gated (the real login gate lives in
 * proxy.ts plus the shared (app) layout), but the session is read to find
 * this person's saved widget layout. Device logins (the wall tablet) always
 * get the default layout and no Customize button.
 */
export default async function DashboardPage() {
  // Used only to bound the kitchen reads in dashboardLoaders.ts (a wide
  // tolerance window and an expiring-soon count, not a "what day is it"
  // decision); see loadMealPlans for why the server clock may not decide the week.
  const serverNow = new Date();

  const user = await getVerifiedUser();
  const isDevice = user?.isDevice ?? true;

  // The Goals and Habits reads are the server-side "what day is it" decisions
  // on this page, so they use the household (Denver) date, the same helper the
  // Plans pages use, never serverNow.
  const goalsToday = householdToday(new Date())!;

  // Whatever is stored is a claim, never a type: parse, don't cast. The tablet
  // always gets the default layout, minus the Habits and Chores tiles
  // (decision 138). The layout is read first because it decides which kinds
  // are loaded below: a dashboard with no Recipes widget never counts recipes.
  const stored =
    user && !user.isDevice
      ? await db.userPreferences.findUnique({
          where: { userId: user.userId },
          select: { dashboardLayout: true },
        })
      : null;
  const layout = layoutForViewer(
    stored?.dashboardLayout ? parseDashboardLayout(stored.dashboardLayout) : DEFAULT_DASHBOARD_LAYOUT,
    isDevice,
  );
  const kinds = new Set(layout.widgets.map((widget) => widget.kind));

  // A kind with two widgets is read once; each widget applies its own picks
  // below. Goals load for every signed-in viewer, so the Goals
  // picker has its list even before a Goals widget is on the layout. Habits & Chores read the same rows Today does and have no widget on
  // the tablet; the cards above the tiles (nudges and the rest) need them
  // whenever the viewer is not a device, with or without a Habits widget.
  const [mealPlans, inventory, grocery, recipes, goalsData, habitsData] = await Promise.all([
    kinds.has("todayMeals") ? loadMealPlans(serverNow) : null,
    kinds.has("inventory") ? loadInventorySummary(serverNow) : null,
    kinds.has("grocery") ? loadGrocerySummary() : null,
    kinds.has("recipes") ? loadRecipesSummary() : null,
    user ? loadGoalsTile({ userId: user.userId, isDevice: user.isDevice }, goalsToday) : null,
    user && !user.isDevice ? loadDashboardHabits({ userId: user.userId, role: user.role }, goalsToday) : null,
  ]);

  // One tile per widget, keyed by its uid. A widget whose data is missing
  // (nothing is loaded for it) gets no tile and is dropped from the layout below.
  function tileFor(widget: DashboardWidget): ReactNode {
    const picks = picksOf(widget);
    // A Medium Habits or Chores tile lists three rows and counts the rest; Large lists them all.
    const limit = widget.size === "m" ? 3 : undefined;
    switch (widget.kind) {
      case "habits": {
        if (!habitsData || !user) return null;
        const { tile, todayRows } = habitsTileFor(habitsData, picks);
        return (
          <HabitsTile
            key={picks.join(",")}
            rows={tile.rows}
            todayRows={todayRows}
            label={tile.label}
            empty={tile.empty}
            showStreaks={user.showStreaks}
            limit={limit}
          />
        );
      }
      case "chores":
        if (!habitsData || !user) return null;
        return (
          <ChoresTile
            rows={habitsData.chores.rows}
            todayRows={habitsData.choresToday}
            empty={habitsData.chores.empty}
            choreStreak={habitsData.choreStreak}
            showStreaks={user.showStreaks}
            limit={limit}
          />
        );
      case "todayMeals":
        if (!mealPlans) return null;
        return (
          <TodayMealsTile
            href="/kitchen/cooking/meal-plan"
            icon={<CalendarDays size={20} className="text-muted" />}
            title={DASHBOARD_WIDGETS.todayMeals.label}
            plans={mealPlans}
          />
        );
      case "goals": {
        if (!goalsData) return null;
        const tile = goalsTileFor(goalsData, picks);
        return <GoalsTile done={tile.done} total={tile.total} todo={tile.todo} picked={tile.picked} />;
      }
      case "inventory":
        if (!inventory) return null;
        return (
          <DashboardTile
            href="/kitchen/inventory"
            icon={<Package size={20} className="text-muted" />}
            title={DASHBOARD_WIDGETS.inventory.label}
            badge={inventory.lowCount > 0 ? `${inventory.lowCount} low` : undefined}
          >
            <p className="text-lg font-semibold tabular-nums">
              {inventory.stocked} stocked
            </p>
            {inventory.expiringSoonCount > 0 && (
              <p className="text-sm text-muted">{inventory.expiringSoonCount} expiring</p>
            )}
            {inventory.urgent.names.length > 0 && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {inventory.urgent.names.join(", ")}
                {inventory.urgent.more > 0 && ` ${DASHBOARD_WIDGET_WORDS.moreRows(inventory.urgent.more)}`}
              </p>
            )}
          </DashboardTile>
        );
      case "grocery":
        if (!grocery) return null;
        return (
          <DashboardTile
            href="/kitchen/shopping"
            icon={<ShoppingCart size={20} className="text-muted" />}
            title={DASHBOARD_WIDGETS.grocery.label}
            badge={grocery.toBuy > 0 ? `${grocery.toBuy} to buy` : undefined}
          >
            {grocery.toBuy === 0 ? (
              <p className="text-sm text-muted">Nothing to buy</p>
            ) : (
              <p className="line-clamp-2 text-sm text-muted">
                {/* Non-breaking space: a plain one let "Amazon 2" wrap between the
                    store and its count, orphaning a bare "2" on the next line. */}
                {grocery.breakdown.map((store) => `${store.label}\u00A0${store.count}`).join(" · ")}
              </p>
            )}
          </DashboardTile>
        );
      case "recipes":
        if (!recipes) return null;
        return (
          <DashboardTile
            href="/kitchen/cooking/recipes"
            icon={<BookOpen size={20} className="text-muted" />}
            title={DASHBOARD_WIDGETS.recipes.label}
          >
            <p className="text-sm text-muted">
              {recipes.count} {recipes.count === 1 ? "recipe" : "recipes"}
            </p>
            {recipes.newestTitle && (
              // Its own line rather than appended after the count: real recipe
              // titles ("Copycat Cracker Barrel Meatloaf") ran past the tile
              // and truncated mid-word when the two shared one.
              <p className="mt-0.5 truncate text-sm text-muted">
                Newest: {recipes.newestTitle}
              </p>
            )}
          </DashboardTile>
        );
    }
  }

  const tiles: Record<string, ReactNode> = {};
  for (const widget of layout.widgets) {
    const tile = tileFor(widget);
    if (tile) tiles[widget.uid] = tile;
  }
  // The client saves this filtered list when a person customizes. That is safe:
  // a widget loses its tile only when its data is missing (Habits and Chores
  // with no signed-in user, already removed for devices, who cannot customize),
  // so today nothing is dropped from a layout that can be saved.
  const renderable = { ...layout, widgets: layout.widgets.filter((widget) => widget.uid in tiles) };

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
        <PlanDayCard prompts={habitsData.prompts} />
      </>
    ) : null;

  return (
    <DashboardWidgetList
      layout={renderable}
      tiles={tiles}
      notes={notes}
      pickable={{ habits: habitsData?.pickable ?? [], goals: goalsData?.pickable ?? [] }}
      canCustomize={!isDevice}
    />
  );
}
