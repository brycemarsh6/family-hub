"use client";

// "use client" means this component runs in the browser as well as on the
// server. We need that here because it uses `usePathname()` to know which page
// you're currently on, so it can highlight the right tab.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_NAV_ITEMS } from "@/lib/nav";

/** Is `href` the page we're currently looking at? */
function isActive(pathname: string, href: string) {
  // "/" is a prefix of every path, so it only ever counts on an exact match —
  // otherwise the Home tab would light up everywhere.
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The app's one nav bar, fixed along the bottom of the screen at every size —
 * one tab per branch. Rendered once, from the root layout, so it's the same
 * on every page instead of swapping contents as you move around the app.
 */
export function HubBottomNav() {
  const pathname = usePathname();

  // Nothing to navigate to until you're signed in, and a row of tabs that all
  // bounce you back to the password box would just be noise.
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Sections"
      className="print:hidden fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur"
      // Keeps the bar clear of the home indicator on iPhones.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl">
        {HUB_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <item.icon aria-hidden="true" size={24} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
