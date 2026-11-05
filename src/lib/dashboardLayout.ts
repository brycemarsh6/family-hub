import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_IDS,
  type DashboardWidgetId,
} from "@/lib/dashboardWidgets";

// Pure logic for one person's dashboard layout: turning any stored value
// into a safe layout, and the small edits the Customize sheet makes. No
// "use client", no server-only, no `db` import, so it runs in the page, in
// the save action and in the browser. parseDashboardLayout is the only
// reader of the stored JSON: whatever is in the database (or arrives from a
// client) is a claim, never trusted until it has been through here.

export type DashboardLayout = {
  version: 1;
  widgets: { id: DashboardWidgetId; enabled: boolean }[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  widgets: DASHBOARD_WIDGET_IDS.map((id) => ({
    id,
    enabled: DASHBOARD_WIDGETS[id].defaultEnabled,
  })),
};

function isWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && (DASHBOARD_WIDGET_IDS as readonly string[]).includes(value);
}

function defaultLayout(): DashboardLayout {
  return { version: 1, widgets: DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => ({ ...w })) };
}

/**
 * Any stored value to a safe layout. Never throws. Accepts a JSON string or
 * an already-parsed object; anything unusable gives the default. Unknown ids
 * are dropped, duplicates removed (first wins), and registry ids missing
 * from the stored row are added with their `defaultEnabled`, so a widget
 * added in a later release shows up for people who saved a layout before it
 * existed. A missing id goes directly after the nearest id before it in
 * DASHBOARD_WIDGET_IDS that is already in the list (at the start if none is),
 * so a new widget lands where the default order puts it, not at the end.
 */
export function parseDashboardLayout(raw: unknown): DashboardLayout {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return defaultLayout();
    }
  }
  if (typeof value !== "object" || value === null) return defaultLayout();
  const obj = value as { version?: unknown; widgets?: unknown };
  if (obj.version !== 1 || !Array.isArray(obj.widgets)) return defaultLayout();

  const seen = new Set<DashboardWidgetId>();
  const widgets: DashboardLayout["widgets"] = [];
  for (const entry of obj.widgets) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, enabled } = entry as { id?: unknown; enabled?: unknown };
    if (!isWidgetId(id) || seen.has(id)) continue;
    seen.add(id);
    widgets.push({ id, enabled: typeof enabled === "boolean" ? enabled : DASHBOARD_WIDGETS[id].defaultEnabled });
  }
  DASHBOARD_WIDGET_IDS.forEach((id, index) => {
    if (seen.has(id)) return;
    const before = DASHBOARD_WIDGET_IDS.slice(0, index).reverse().find((other) => seen.has(other));
    const at = before === undefined ? 0 : widgets.findIndex((w) => w.id === before) + 1;
    widgets.splice(at, 0, { id, enabled: DASHBOARD_WIDGETS[id].defaultEnabled });
    seen.add(id);
  });
  return { version: 1, widgets };
}

export function serializeDashboardLayout(layout: DashboardLayout): string {
  return JSON.stringify(layout);
}

/** Flip one widget on or off. Returns a new layout. */
export function toggleWidget(layout: DashboardLayout, id: DashboardWidgetId): DashboardLayout {
  return {
    version: 1,
    widgets: layout.widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : { ...w })),
  };
}

/**
 * Move one widget a step up (-1) or down (+1) in the full list. Clamped at
 * the ends: a move past either end returns an equal layout.
 */
export function moveWidget(layout: DashboardLayout, id: DashboardWidgetId, direction: -1 | 1): DashboardLayout {
  const widgets = layout.widgets.map((w) => ({ ...w }));
  const from = widgets.findIndex((w) => w.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= widgets.length) return { version: 1, widgets };
  [widgets[from], widgets[to]] = [widgets[to], widgets[from]];
  return { version: 1, widgets };
}

/**
 * The enabled widgets in order, each with the width it should render at.
 * Pairing is greedy, left to right: two consecutive enabled half widgets
 * pair up and render half; a half widget with no half partner beside it
 * (so it would leave a hole) renders full.
 */
export function widgetSpans(layout: DashboardLayout): { id: DashboardWidgetId; span: "full" | "half" }[] {
  const enabled = layout.widgets.filter((w) => w.enabled);
  const result: { id: DashboardWidgetId; span: "full" | "half" }[] = [];
  for (let i = 0; i < enabled.length; i++) {
    const { id } = enabled[i];
    if (DASHBOARD_WIDGETS[id].width === "half") {
      const next = enabled[i + 1];
      if (next && DASHBOARD_WIDGETS[next.id].width === "half") {
        result.push({ id, span: "half" }, { id: next.id, span: "half" });
        i++;
        continue;
      }
    }
    result.push({ id, span: "full" });
  }
  return result;
}
