import { BookOpen, CalendarDays, House, ListChecks, Package, ShoppingCart, Target, UtensilsCrossed } from "lucide-react";
import type { ComponentType } from "react";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import type { DashboardWidgetKind, WidgetSize } from "@/lib/dashboardWidgets";

/** The same Lucide icon each real tile draws in its header. */
const KIND_ICONS: Record<DashboardWidgetKind, ComponentType<{ size?: number; className?: string; "aria-hidden"?: "true" }>> = {
  todayMeals: UtensilsCrossed,
  calendar: CalendarDays,
  habits: ListChecks,
  chores: House,
  goals: Target,
  inventory: Package,
  grocery: ShoppingCart,
  recipes: BookOpen,
};

/** Shape follows the size: Small a narrow square, Medium 2:1, Large a taller square as wide as Medium, Extra large 2:1 and wider. */
const SHAPES: Record<WidgetSize, string> = {
  s: "aspect-square w-[88px]",
  m: "aspect-[2/1] w-44",
  l: "aspect-square w-44",
  xl: "aspect-[2/1] w-56",
};

/** How many neutral placeholder lines each size draws under the header. */
const LINES: Record<WidgetSize, string[]> = {
  s: ["w-3/4"],
  m: ["w-3/4", "w-1/2"],
  l: ["w-full", "w-3/4", "w-1/2"],
  xl: ["w-full", "w-3/4", "w-1/2"],
};

/**
 * A drawn miniature of a widget at one size, for the Customize gallery. It is
 * not live data: the kind's icon and name plus a few neutral placeholder
 * lines, so a person can see how much room each size takes. Decorative only
 * (`aria-hidden`); the button around it carries the accessible name.
 */
export default function DashboardWidgetPreview({ kind, size }: { kind: DashboardWidgetKind; size: WidgetSize }) {
  const Icon = KIND_ICONS[kind];
  return (
    <div
      aria-hidden="true"
      className={`flex flex-col gap-1.5 overflow-hidden rounded-xl border border-line bg-surface-2 p-2.5 ${SHAPES[size]}`}
    >
      <div className={`flex gap-1.5 text-muted ${size === "s" ? "flex-col items-start" : "items-center"}`}>
        <Icon aria-hidden="true" size={14} className="shrink-0" />
        <span className="truncate text-xs font-semibold">{DASHBOARD_WIDGETS[kind].label}</span>
      </div>
      {LINES[size].map((width, i) => (
        <div key={i} className={`h-1.5 rounded-full bg-line ${width}`} />
      ))}
    </div>
  );
}
