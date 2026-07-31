"use client";

// "use client" means this component runs in the browser as well as on the
// server. We need that here because it uses `usePathname()` to know which page
// you're currently on, so it can highlight the right tab.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

/** Is `href` the page we're currently looking at? */
function isActive(pathname: string, href: string) {
  // "/" would otherwise match every page, since every path starts with "/".
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The horizontal links shown in the top bar on tablets and laptops. */
export function TopNavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-medium transition-colors ${
              active
                ? "bg-accent text-accent-fg"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <item.icon aria-hidden="true" size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The fixed tab bar along the bottom of the screen on phones — where your
 * thumb already is. Hidden on larger screens, which use the top bar instead.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur md:hidden"
      // Keeps the bar clear of the home indicator on iPhones.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {NAV_ITEMS.map((item) => {
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
