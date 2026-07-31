import { Package, ShoppingCart, Home, Hourglass, ChefHat } from "lucide-react";

// The Kitchen branch's own tabs — shown only while inside /kitchen/*, not on
// the top-level dashboard. Listed once here so the desktop top bar and the
// phone's bottom tab bar can never disagree about what exists.
//
// Other branches (calendar, chores, lists...) will each get their own file
// like this one, plus their own layout, when they're actually built.

export const KITCHEN_NAV_ITEMS = [
  { href: "/kitchen/inventory", label: "Inventory", icon: Package },
  { href: "/kitchen/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/kitchen", label: "Home", icon: Home },
  { href: "/kitchen/expiring", label: "Expiring", icon: Hourglass },
  { href: "/kitchen/cooking", label: "Cooking", icon: ChefHat },
] as const;

export type KitchenNavItem = (typeof KITCHEN_NAV_ITEMS)[number];
