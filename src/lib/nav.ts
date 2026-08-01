import { ChefHat, CalendarDays, Home, ListChecks, ClipboardList } from "lucide-react";

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
