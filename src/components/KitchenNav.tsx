"use client";

// "use client" means this component runs in the browser as well as on the
// server. We need that here because it uses `usePathname()` to know which page
// you're currently on, so it can highlight the right tab.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KITCHEN_NAV_ITEMS } from "@/lib/nav";

/** Is `href` the page we're currently looking at? */
function isActive(pathname: string, href: string) {
  // "/" and "/kitchen" are both prefixes of every page below them, so each
  // only counts on an exact match — otherwise Home or Kitchen would light up
  // on every page in the branch, which is the same bug either way.
  if (href === "/" || href === "/kitchen") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The fixed tab bar along the bottom of the screen — where your thumb already
 * is on a phone, and where the wall tablet's is too. Same bar at every screen
 * size; on wide screens the tabs stay centred in the same max-w-3xl column the
 * page content uses, rather than stretching across the whole display.
 */
export function KitchenBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Kitchen"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur"
      // Keeps the bar clear of the home indicator on iPhones.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl">
        {KITCHEN_NAV_ITEMS.map((item) => {
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
