// The dashboard's one widget registry: which widgets exist, what they are
// called, how wide they render and whether they start switched on. No React
// imports on purpose, so this file is importable from a Server Action and
// from a client component alike. The registry's key order is the default
// order of the dashboard.

export const DASHBOARD_WIDGET_IDS = ["todayMeals", "inventory", "grocery", "recipes"] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidgetDef = {
  label: string;
  /** "half" widgets sit two to a row; "full" widgets take the whole row. */
  width: "full" | "half";
  defaultEnabled: boolean;
};

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, DashboardWidgetDef> = {
  todayMeals: { label: "Today's meals", width: "full", defaultEnabled: true },
  inventory: { label: "Inventory", width: "half", defaultEnabled: true },
  grocery: { label: "Grocery", width: "half", defaultEnabled: true },
  recipes: { label: "Recipes", width: "full", defaultEnabled: true },
};
