import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Hourglass,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  ShoppingCart,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// The drawer's one destination list: every page the side drawer links to,
// in the order it shows them. Sections carry an optional heading (Kitchen);
// the footer item (Settings) sits below them, above the Send feedback button
// (a button, not a destination, so it is not in this list).
export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { heading: string | null; items: readonly NavItem[] };

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    heading: null,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/habits", label: "Habits & Chores", icon: ListChecks },
      { href: "/plans", label: "Plans & Goals", icon: Target },
      { href: "/lists", label: "Lists", icon: ClipboardList },
    ],
  },
  {
    heading: "Kitchen",
    items: [
      { href: "/kitchen/cooking/recipes", label: "Recipes", icon: BookOpen },
      { href: "/kitchen/cooking/meal-plan", label: "Meal Plan", icon: UtensilsCrossed },
      { href: "/kitchen/shopping", label: "Shopping", icon: ShoppingCart },
      { href: "/kitchen/inventory", label: "Inventory", icon: Package },
      { href: "/kitchen/expiring", label: "Expiring", icon: Hourglass },
    ],
  },
];

export const NAV_FOOTER_ITEMS: readonly NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export const NAV_ITEMS: readonly NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...NAV_FOOTER_ITEMS,
];

/**
 * The href of the drawer row to light for `pathname`: the longest matching
 * href wins (a match is equal, or `pathname` starts with `href + "/"`), so
 * `/settings/family` and `/profile` light Settings. "/" matches only exactly, otherwise it
 * would match everything. Null when nothing matches (for example `/login`).
 */
export function activeNavHref(pathname: string): string | null {
  // Profile lives behind the account card at the top of Settings, so it has
  // no row of its own and lights Settings instead.
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "/settings";
  let best: string | null = null;
  for (const { href } of NAV_ITEMS) {
    const matches =
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

