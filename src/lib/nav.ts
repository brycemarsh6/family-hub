import { Package, ShoppingCart, Home, Hourglass, ChefHat } from "lucide-react";

// The app's main sections. Listed once here so the top bar and the phone's
// bottom tab bar can never disagree about what exists.
//
// As the family hub grows (calendar, chores, recipes...), new sections get
// added to this list.

export const NAV_ITEMS = [
  { href: "/pantry", label: "Inventory", icon: Package },
  { href: "/groceries", label: "Shopping", icon: ShoppingCart },
  { href: "/", label: "Home", icon: Home },
  { href: "/expiring", label: "Expiring", icon: Hourglass },
  { href: "/cooking", label: "Cooking", icon: ChefHat },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
