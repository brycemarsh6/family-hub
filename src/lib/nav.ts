import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Home,
  Hourglass,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  ShoppingCart,
  Target,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// The drawer's one destination list: every page the side drawer links to,
// in the order it shows them. Sections carry an optional heading (Kitchen);
// the footer items (Profile, Settings) sit below them, above the identity
// row and Sign out.
export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { heading: string | null; items: readonly NavItem[] };

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    heading: null,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/routines", label: "Routines", icon: ListChecks },
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
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const NAV_ITEMS: readonly NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...NAV_FOOTER_ITEMS,
];

/**
 * The href of the drawer row to light for `pathname`: the longest matching
 * href wins (a match is equal, or `pathname` starts with `href + "/"`), so
 * `/settings/family` lights Settings. "/" matches only exactly, otherwise it
 * would match everything. Null when nothing matches (for example `/login`).
 */
export function activeNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of NAV_ITEMS) {
    const matches =
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}


// OLD bottom tab bar list, kept only until HubNav.tsx stops importing it.
// The app's one nav bar — a single fixed tab per branch, the same on every
// page. It doesn't drill into a branch's own sub-pages (Inventory, Shopping,
// and so on for Kitchen); that's the job of the branch's own landing page
// (e.g. src/app/kitchen/page.tsx). Home sits in the middle.
//
// Calendar, Chores and Lists are placeholder pages for now; the tabs exist
// ahead of the features so the shape of the hub is visible.
export const HUB_NAV_ITEMS = [
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/", label: "Home", icon: Home },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/lists", label: "Lists", icon: ClipboardList },
] as const;

export type HubNavItem = (typeof HUB_NAV_ITEMS)[number];
