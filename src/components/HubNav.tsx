"use client";

// "use client" means this component runs in the browser as well as on the
// server. We need that here because it uses `usePathname()` to know which page
// you're currently on, so it can highlight the right tab.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HUB_NAV_ITEMS } from "@/lib/nav";

/** A click the browser should keep handling itself — a new tab, a new
 * window, a download. Covers the same modifier-key and middle-click cases
 * Next's own `isModifiedEvent` does (node_modules/next/dist/client/app-dir/
 * link.js:47-52, read in this tree per AGENTS.md) — `button === 1` here is
 * the same middle button as Next's `which === 2`. It does NOT also mirror
 * Next's `target && target !== '_self'` check, since no nav `<Link>` here
 * ever sets `target` — inert today, but worth knowing precisely rather than
 * assuming full parity if one ever does. Without this, the re-tap's
 * `preventDefault` would swallow a cmd-click on the active tab and make it
 * the one tab in the app you can't open in a new tab. */
function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.nativeEvent.button === 1
  );
}

/** Which tab lights up? Prefix-based on purpose — every page below a branch
 * belongs to that branch. NOT the predicate for "this tap goes nowhere": see
 * `atTabRoot` below. */
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
  const router = useRouter();

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
          // Two different questions, and they need two different predicates
          // (mission-12/C3, found by both gates). `isActive` is PREFIX-based
          // by construction, so it is true on the ~20 pages BELOW a tab as
          // well as on the tab's own — right for "which tab lights up",
          // wrong for "does this tap go anywhere". Tapping Kitchen from
          // /kitchen/inventory is a REAL navigation; treating it as a re-tap
          // discarded the entry the user was standing on, so Back landed on
          // /kitchen again with the Inventory entry gone — the same dead
          // press this gesture exists to remove, one level down.
          const active = isActive(pathname, item.href);
          // Pathname only, deliberately: a paged calendar (/calendar?date=…)
          // is still this tab's own page, and its re-tap is still a refresh.
          const atTabRoot = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              // Re-tapping the page you're already on does not navigate at
              // all. `preventDefault` stops the browser AND Next, whose Link
              // returns early on `defaultPrevented`
              // (node_modules/next/dist/client/app-dir/link.js:319, read in
              // this tree per AGENTS.md) — so nothing is pushed and nothing
              // is REPLACED either, and `router.refresh()` restores what the
              // tap used to do: refetch. Suppressing the navigation also
              // suppressed the scroll-to-top a real navigation gives for
              // free, so `window.scrollTo({ top: 0 })` restores that too,
              // unconditionally — re-tapping while already at the top is
              // harmless, and tapping the active tab to jump back to the top
              // is a near-universal iOS idiom, on an app that's a
              // home-screen PWA on the family's iPhones (mission-12/C5). On
              // an iOS home-screen install there's no address bar and no
              // reload button either, so this re-tap is the only manual
              // refresh gesture the app has at all (mission-11/C5).
              //
              // It refreshes in place rather than resetting the view, and
              // that loses nothing: the Calendar's own Today circle is
              // already the control for "take me back to today".
              //
              // Modified clicks (cmd/ctrl/shift/alt, middle button) are left
              // alone, so cmd-clicking a tab still opens a new tab the way it
              // does on every other page — the same clicks Next's own
              // `isModifiedEvent` hands back to the browser (link.js:47-52).
              onClick={
                atTabRoot
                  ? (event) => {
                      if (isModifiedClick(event)) return;
                      event.preventDefault();
                      router.refresh();
                      window.scrollTo({ top: 0 });
                    }
                  : undefined
              }
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
