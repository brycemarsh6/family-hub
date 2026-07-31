// The app's main sections. Listed once here so the top bar and the phone's
// bottom tab bar can never disagree about what exists.
//
// As the family hub grows (calendar, chores, recipes...), new sections get
// added to this list.

export const NAV_ITEMS = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/groceries", label: "Groceries", emoji: "🛒" },
  { href: "/pantry", label: "Inventory", emoji: "🥫" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
