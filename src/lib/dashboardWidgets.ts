// The dashboard's one widget registry: which kinds of widget exist, what they
// are called, which sizes each can take and which size a new one starts at.
// A person's dashboard is a list of widget instances (see dashboardLayout.ts),
// and a kind may appear in it more than once. No React imports on purpose, so
// this file is importable from a Server Action and from a client component
// alike. DASHBOARD_WIDGET_KINDS is the default order of the dashboard, and a
// test pins the record's key order to it.

export const DASHBOARD_WIDGET_KINDS = [
  "todayMeals",
  "habits",
  "chores",
  "goals",
  "inventory",
  "grocery",
  "recipes",
] as const;

export type DashboardWidgetKind = (typeof DASHBOARD_WIDGET_KINDS)[number];

/** Smallest to largest. A size's position here is what "nearest size" means. */
export const WIDGET_SIZES = ["s", "m", "l", "xl"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  s: "Small",
  m: "Medium",
  l: "Large",
  xl: "Extra large",
};

type DashboardWidgetDef = {
  label: string;
  /** The sizes this kind can take, never empty, in WIDGET_SIZES order (decision 200). */
  sizes: readonly WidgetSize[];
  /** The size a new widget of this kind starts at. Always one of `sizes`. */
  defaultSize: WidgetSize;
  /** False for the kinds the wall tablet does not show (decision 138). */
  onTablet: boolean;
};

export const DASHBOARD_WIDGETS: Record<DashboardWidgetKind, DashboardWidgetDef> = {
  todayMeals: { label: "Today's meals", sizes: ["m"], defaultSize: "m", onTablet: true },
  habits: { label: "Habits", sizes: ["m", "l"], defaultSize: "l", onTablet: false },
  chores: { label: "Chores today", sizes: ["m", "l"], defaultSize: "m", onTablet: false },
  goals: { label: "Goals this week", sizes: ["m"], defaultSize: "m", onTablet: true },
  inventory: { label: "Inventory", sizes: ["s", "m"], defaultSize: "s", onTablet: true },
  grocery: { label: "Grocery", sizes: ["s", "m"], defaultSize: "s", onTablet: true },
  recipes: { label: "Recipes", sizes: ["s", "m"], defaultSize: "m", onTablet: true },
};

/** The widgets whose rows can be picked in Customize (decisions 44, 49): the layout keeps an `items` list for these only. */
export const PICKABLE_WIDGET_IDS = ["habits", "goals"] as const satisfies readonly DashboardWidgetKind[];
export type PickableWidgetId = (typeof PICKABLE_WIDGET_IDS)[number];

export function isPickableWidget(kind: DashboardWidgetKind): kind is PickableWidgetId {
  return (PICKABLE_WIDGET_IDS as readonly string[]).includes(kind);
}

/** The words both pickers (Habits and Goals) share, inside the Customize sheet (decision 137). */
export const DASHBOARD_PICKER_LABELS = {
  /** The button on the Habits and Goals rows. */
  pick: "Pick",
  showing: "Showing",
  notShowing: "Not showing",
} as const;

/** Most items a widget keeps picked; the parser cuts anything past it. */
export const MAX_WIDGET_ITEMS = 50;

/** Most widgets one dashboard keeps; the parser cuts anything past it and Add stops here. */
export const MAX_DASHBOARD_WIDGETS = 30;

/** The words the Customize sheet and the grid add in W1 (decision 207); sizes and kind names live above. */
export const DASHBOARD_WIDGET_WORDS = {
  addWidget: "Add widget",
  addTitle: "Add a widget",
  removeWidget: "Remove widget",
  size: "Size",
  onDashboard: "On your dashboard",
  emptyTitle: "Your dashboard is empty.",
  emptyHint: "Tap Customize to add widgets.",
  /** The muted line under a Medium Habits or Chores tile that has more rows than it shows. */
  moreRows: (n: number) => `+${n} more`,
  /** The sheet's title and its Reset button (moved here from the sheet, so each phrase lives once). */
  customizeTitle: "Customize dashboard",
  reset: "Reset to default",
  /** Back controls name the view they return to (decision 210). */
  backToCustomize: "Back to Customize",
  backToAdd: "Back to Add a widget",
  backTo: (name: string) => `Back to ${name}`,
  /** The muted line under a disabled Add button at the cap (decision 211). */
  full: "Your dashboard is full. Remove a widget to add another.",
} as const;
