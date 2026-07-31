import {
  Package,
  ShoppingCart,
  Home,
  Hourglass,
  ChefHat,
  CalendarDays,
  ListChecks,
  ClipboardList,
} from "lucide-react";

// The hub's top-level tabs — one per branch, shown on the dashboard and on any
// branch that doesn't yet have a nav of its own. Home sits in the middle so
// it's in the same place in both bars.
//
// Calendar, Chores and Lists are placeholder pages for now; the tabs exist
// ahead of the features so the shape of the hub is visible, the same call we
// made for Kitchen's Expiring and Cooking tabs.
export const HUB_NAV_ITEMS = [
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/", label: "Home", icon: Home },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/lists", label: "Lists", icon: ClipboardList },
] as const;

export type HubNavItem = (typeof HUB_NAV_ITEMS)[number];

// The Kitchen branch's own tabs — shown only while inside /kitchen/*, not on
// the top-level dashboard. Listed once here so the desktop top bar and the
// phone's bottom tab bar can never disagree about what exists.
//
// Other branches (calendar, chores, lists...) will each get their own file
// like this one, plus their own layout, when they're actually built.

export const KITCHEN_NAV_ITEMS = [
  { href: "/kitchen/inventory", label: "Inventory", icon: Package },
  { href: "/kitchen/shopping", label: "Shopping", icon: ShoppingCart },
  // Home is the way out of the branch entirely, to the dashboard — the same
  // place the logo goes. It deliberately isn't /kitchen: two things labelled
  // "home" landing somewhere different is exactly the confusion we hit before.
  { href: "/", label: "Home", icon: Home },
  { href: "/kitchen/expiring", label: "Expiring", icon: Hourglass },
  { href: "/kitchen/cooking", label: "Cooking", icon: ChefHat },
] as const;

export type KitchenNavItem = (typeof KITCHEN_NAV_ITEMS)[number];
