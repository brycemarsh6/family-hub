import { cleanWidgetOptions, type DashboardWidgetOptions } from "@/lib/dashboardWidgetOptions";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_KINDS,
  MAX_DASHBOARD_WIDGETS,
  MAX_WIDGET_ITEMS,
  WIDGET_SIZES,
  isPickableWidget,
  type DashboardWidgetKind,
  type WidgetSize,
} from "@/lib/dashboardWidgets";

// Pure logic for one person's dashboard layout: turning any stored value
// into a safe layout, and the small edits the Customize sheet makes. No
// "use client", no server-only, no `db` import, so it runs in the page, in
// the save action and in the browser. parseDashboardLayout is the only
// reader of the stored JSON: whatever is in the database (or arrives from a
// client) is a claim, never trusted until it has been through here.
//
// Layout v2 is a list of widget instances: each has its own `uid`, a `kind`
// (a kind may appear more than once) and a `size`. A saved v1 layout (an id
// and an on/off switch per widget) is upgraded on read, so nothing is
// migrated in the database. The upgrade cases are pinned in
// dashboardLayoutUpgrade.test.ts.

export type DashboardWidget = {
  /** Names this one instance: unique inside a layout, `[A-Za-z0-9_-]`, at most 40 characters. */
  uid: string;
  kind: DashboardWidgetKind;
  size: WidgetSize;
  /** The ids the person picked, in picked order; only `habits` and `goals` carry it. Shape only: the page checks the ids are theirs. */
  items?: string[];
  /** Per-widget settings; only `calendar` carries them. Always cleaned, so a stored key outside the kind's options never survives. */
  options?: DashboardWidgetOptions;
};

export type DashboardLayout = {
  version: 2;
  widgets: DashboardWidget[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 2,
  widgets: [
    { uid: "calendar", kind: "calendar", size: "l" },
    ...DASHBOARD_WIDGET_KINDS.filter((kind) => kind !== "calendar").map((kind) => ({
      uid: kind,
      kind,
      size: DASHBOARD_WIDGETS[kind].defaultSize,
    })),
  ],
};

const UID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

function isWidgetKind(value: unknown): value is DashboardWidgetKind {
  return typeof value === "string" && (DASHBOARD_WIDGET_KINDS as readonly string[]).includes(value);
}

function isWidgetSize(value: unknown): value is WidgetSize {
  return typeof value === "string" && (WIDGET_SIZES as readonly string[]).includes(value);
}

/** The kind itself when free, else `kind-2`, `kind-3`, ...: the smallest free one. The one uid rule for the parser's repair and Add. */
export function nextWidgetUid(taken: Iterable<string>, kind: DashboardWidgetKind): string {
  const used = new Set(taken);
  if (!used.has(kind)) return kind;
  let n = 2;
  while (used.has(`${kind}-${n}`)) n++;
  return `${kind}-${n}`;
}

/** `size` if the kind allows it, else the allowed size nearest to it in WIDGET_SIZES order (a tie goes to the smaller). */
function snapSize(kind: DashboardWidgetKind, size: WidgetSize): WidgetSize {
  const { sizes } = DASHBOARD_WIDGETS[kind];
  if (sizes.includes(size)) return size;
  const at = WIDGET_SIZES.indexOf(size);
  let best = sizes[0];
  for (const candidate of sizes) {
    if (Math.abs(WIDGET_SIZES.indexOf(candidate) - at) < Math.abs(WIDGET_SIZES.indexOf(best) - at)) best = candidate;
  }
  return best;
}

/** Unique non-empty strings, in order, at most MAX_WIDGET_ITEMS; null when the value is not a non-empty list of them. */
function cleanItems(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const items = [...new Set(raw.filter((item): item is string => typeof item === "string" && item !== ""))];
  return items.length === 0 ? null : items.slice(0, MAX_WIDGET_ITEMS);
}

function defaultLayout(): DashboardLayout {
  return { version: 2, widgets: DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => ({ ...w })) };
}

/** The kinds v1's registry rendered half width; every other kind rendered full. Frozen: v1 is history. */
/** The seven kinds v1's registry had. Frozen: a v1 layout upgrades to what W1 made of it, so the repair never adds `calendar`. */
const V1_KINDS: readonly DashboardWidgetKind[] = ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"];

const V1_HALF_KINDS: readonly DashboardWidgetKind[] = ["inventory", "grocery"];

/**
 * A saved v1 layout to v2, with the repair v1's own parser did: unknown ids
 * dropped, duplicates removed (first wins), and registry ids missing from the
 * stored row added switched on, directly after the nearest id before it in
 * V1_KINDS that is already in the list (at the start if none
 * is). Then the switched-off widgets go and the rest are sized by v1's
 * pairing rule, so the dashboard looks as it did: two consecutive switched-on
 * half widgets (inventory, grocery) become Small, a half widget with no half
 * neighbour (which v1 drew full width) becomes Medium, and every other kind
 * takes its default size.
 */
function upgradeV1(entries: unknown[]): DashboardLayout {
  type V1 = { kind: DashboardWidgetKind; enabled: boolean; items: string[] | null };
  const seen = new Set<DashboardWidgetKind>();
  const old: V1[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, enabled, items } = entry as { id?: unknown; enabled?: unknown; items?: unknown };
    if (!isWidgetKind(id) || !V1_KINDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    old.push({
      kind: id,
      enabled: typeof enabled === "boolean" ? enabled : true,
      items: isPickableWidget(id) ? cleanItems(items) : null,
    });
  }
  V1_KINDS.forEach((kind, index) => {
    if (seen.has(kind)) return;
    const before = V1_KINDS.slice(0, index).reverse().find((other) => seen.has(other));
    const at = before === undefined ? 0 : old.findIndex((w) => w.kind === before) + 1;
    old.splice(at, 0, { kind, enabled: true, items: null });
    seen.add(kind);
  });

  const isHalf = (kind: DashboardWidgetKind) => V1_HALF_KINDS.includes(kind);
  const on = old.filter((w) => w.enabled);
  const widgets: DashboardWidget[] = [];
  for (let i = 0; i < on.length; i++) {
    const { kind, items } = on[i];
    const carry = items ? { items } : {};
    if (isHalf(kind)) {
      const next = on[i + 1];
      if (next && isHalf(next.kind)) {
        widgets.push({ uid: kind, kind, size: "s", ...carry });
        widgets.push({ uid: next.kind, kind: next.kind, size: "s", ...(next.items ? { items: next.items } : {}) });
        i++;
      } else {
        widgets.push({ uid: kind, kind, size: "m", ...carry });
      }
      continue;
    }
    widgets.push({ uid: kind, kind, size: DASHBOARD_WIDGETS[kind].defaultSize, ...carry });
  }
  return { version: 2, widgets };
}

function parseV2(entries: unknown[]): DashboardLayout {
  const taken = new Set<string>();
  const widgets: DashboardWidget[] = [];
  for (const entry of entries) {
    if (widgets.length >= MAX_DASHBOARD_WIDGETS) break;
    if (typeof entry !== "object" || entry === null) continue;
    const { uid, kind, size, items, options } = entry as {
      uid?: unknown;
      kind?: unknown;
      size?: unknown;
      items?: unknown;
      options?: unknown;
    };
    if (!isWidgetKind(kind)) continue;
    const goodUid = typeof uid === "string" && UID_PATTERN.test(uid) && !taken.has(uid);
    const finalUid = goodUid ? uid : nextWidgetUid(taken, kind);
    taken.add(finalUid);
    const picked = isPickableWidget(kind) ? cleanItems(items) : null;
    const kept = cleanWidgetOptions(kind, options);
    widgets.push({
      uid: finalUid,
      kind,
      size: isWidgetSize(size) ? snapSize(kind, size) : DASHBOARD_WIDGETS[kind].defaultSize,
      ...(picked ? { items: picked } : {}),
      ...(kept ? { options: kept } : {}),
    });
  }
  return { version: 2, widgets };
}

/**
 * Any stored value to a safe layout. Never throws. Accepts a JSON string or
 * an already-parsed object; anything unusable, and any version but 1 or 2,
 * gives the default. Version 1 is upgraded (see upgradeV1). Version 2 keeps
 * its entries in order: unknown kinds are dropped, a size the kind does not
 * allow snaps to the nearest allowed one, a missing size gets the kind's
 * default, a bad or repeated uid is replaced, and at most
 * MAX_DASHBOARD_WIDGETS are kept. Kinds missing from a v2 layout are NOT
 * added back, because removing a widget is deliberate; an empty list stays
 * empty.
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
  if (!Array.isArray(obj.widgets)) return defaultLayout();
  if (obj.version === 1) return upgradeV1(obj.widgets);
  if (obj.version === 2) return parseV2(obj.widgets);
  return defaultLayout();
}

export function serializeDashboardLayout(layout: DashboardLayout): string {
  return JSON.stringify(layout);
}

/** A new widget of `kind` at the end, with the next free uid; the size snaps to one the kind allows. At the cap, the layout is returned unchanged. */
export function addWidget(layout: DashboardLayout, kind: DashboardWidgetKind, size: WidgetSize): DashboardLayout {
  if (layout.widgets.length >= MAX_DASHBOARD_WIDGETS) return layout;
  const uid = nextWidgetUid(layout.widgets.map((w) => w.uid), kind);
  return { version: 2, widgets: [...layout.widgets.map((w) => ({ ...w })), { uid, kind, size: snapSize(kind, size) }] };
}

/** The layout without the widget `uid`. An unknown uid changes nothing. Returns a new layout. */
export function removeWidget(layout: DashboardLayout, uid: string): DashboardLayout {
  return { version: 2, widgets: layout.widgets.filter((w) => w.uid !== uid).map((w) => ({ ...w })) };
}

/** One widget at a new size (snapped to a size its kind allows). Returns a new layout. */
export function resizeWidget(layout: DashboardLayout, uid: string, size: WidgetSize): DashboardLayout {
  return {
    version: 2,
    widgets: layout.widgets.map((w) => (w.uid === uid ? { ...w, size: snapSize(w.kind, size) } : { ...w })),
  };
}

/**
 * Replace the picked items of one `habits` or `goals` widget (cleaned the way
 * the parser cleans them); an empty list removes the field, which means
 * "nothing picked". Any other widget is left alone. Returns a new layout.
 */
export function setWidgetItems(layout: DashboardLayout, uid: string, items: string[]): DashboardLayout {
  const picked = cleanItems(items);
  return {
    version: 2,
    widgets: layout.widgets.map((w) => {
      if (w.uid !== uid || !isPickableWidget(w.kind)) return { ...w };
      const next = { ...w };
      delete next.items;
      return picked ? { ...next, items: picked } : next;
    }),
  };
}

/**
 * Merge `patch` into one widget's options, cleaned the way the parser cleans
 * them, so a bad value or a key the kind does not have is dropped. An unknown
 * uid changes nothing, and a widget whose kind has no options stays without
 * any. Returns a new layout.
 */
export function setWidgetOptions(layout: DashboardLayout, uid: string, patch: DashboardWidgetOptions): DashboardLayout {
  return {
    version: 2,
    widgets: layout.widgets.map((w) => {
      if (w.uid !== uid) return { ...w };
      const next = { ...w };
      delete next.options;
      const merged = cleanWidgetOptions(w.kind, { ...w.options, ...patch });
      return merged ? { ...next, options: merged } : next;
    }),
  };
}

/**
 * The layout with its widgets in the order `uids` gives (a drag in Customize,
 * decision 140). Uids that are not in the layout are ignored and widgets the
 * list forgot keep their relative order at the end, so a stale drop can never
 * lose a widget.
 */
export function reorderWidgets(layout: DashboardLayout, uids: string[]): DashboardLayout {
  const rank = (uid: string) => {
    const index = uids.indexOf(uid);
    return index === -1 ? uids.length : index;
  };
  const widgets = layout.widgets.map((w) => ({ ...w })).sort((a, b) => rank(a.uid) - rank(b.uid));
  return { version: 2, widgets };
}
