// The dashboard's one widget registry: which widgets exist, what they are
// called, how wide they render and whether they start switched on. No React
// imports on purpose, so this file is importable from a Server Action and
// from a client component alike. DASHBOARD_WIDGET_IDS is the default order of
// the dashboard, and a test pins the record's key order to it.

export const DASHBOARD_WIDGET_IDS = [
  "todayMeals",
  "habits",
  "chores",
  "goals",
  "inventory",
  "grocery",
  "recipes",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

type DashboardWidgetDef = {
  label: string;
  /** "half" widgets sit two to a row; "full" widgets take the whole row. */
  width: "full" | "half";
  defaultEnabled: boolean;
};

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, DashboardWidgetDef> = {
  todayMeals: { label: "Today's meals", width: "full", defaultEnabled: true },
  habits: { label: "Habits", width: "full", defaultEnabled: true },
  chores: { label: "Chores today", width: "full", defaultEnabled: true },
  goals: { label: "Goals this week", width: "full", defaultEnabled: true },
  inventory: { label: "Inventory", width: "half", defaultEnabled: true },
  grocery: { label: "Grocery", width: "half", defaultEnabled: true },
  recipes: { label: "Recipes", width: "full", defaultEnabled: true },
};

/** The widgets whose rows can be picked in Customize (decisions 44, 49): the layout keeps an `items` list for these only. */
export const PICKABLE_WIDGET_IDS = ["habits", "goals"] as const satisfies readonly DashboardWidgetId[];

/** Most items a widget keeps picked; the parser cuts anything past it. */
export const MAX_WIDGET_ITEMS = 50;
