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
 * The hub's top-level tab bar, fixed along the bottom of the screen — one tab
 * per branch. Built to match Kitchen's bar exactly, so moving between the two
 * levels never feels like the furniture moved.
 */
export function HubBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur"
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
