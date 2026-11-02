"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import type { DrawerUser } from "@/components/NavList";

// Tailwind's `lg` breakpoint, the width where the pinned menu appears. Tailwind
// has no JS constant for it, so it is written out here.
const PINNED_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * The one button that opens the side drawer. Two looks, same behavior:
 *   - in the dashboard's wordmark header, a plain button beside the logo;
 *   - `floating`, on every other page: pinned to the top-left of the content
 *     column over the page, which is why AppChrome reserves a row for it
 *     (DESIGN.md "unoccluded targets"). Only this one carries
 *     `data-floating-menu-button`, the hook `useHamburgerRowHeight` measures
 *     (src/lib/appChrome.ts) — the in-header one must not, or the hook would
 *     report the header's height as a reserved row.
 *
 * `pinned` means the side menu is pinned open at `lg` (PinnedNav). The floating
 * button then turns `lg:invisible`, NOT unrendered: it keeps its box, so the
 * reserved row and `useHamburgerRowHeight`'s measurement stay as they are. The
 * in-header one has nothing measuring it, so it is `lg:hidden`.
 *
 * While `pinned`, a drawer left open when the window grows to `lg` is closed,
 * so a modal drawer never sits over the pinned menu (one navigation surface).
 *
 * Owns the open state and renders the drawer, so there is exactly one
 * drawer on screen: AppChrome renders one or the other button, never both.
 */
export function HamburgerButton({
  user,
  floating = false,
  pinned = false,
}: {
  user: DrawerUser;
  floating?: boolean;
  pinned?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Close from the change listener, not the effect body: the drawer is already
  // closed on mount, and setState in an effect body is a lint error.
  useEffect(() => {
    if (!pinned) return;
    const query = window.matchMedia(PINNED_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [pinned]);

  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Menu"
      aria-expanded={open}
      aria-controls="app-nav-drawer"
      {...(floating ? { "data-floating-menu-button": "" } : {})}
      className={
        floating
          ? `pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface/90 shadow-sm backdrop-blur transition-opacity active:opacity-80${pinned ? " lg:invisible" : ""}`
          : `flex h-12 w-12 items-center justify-center rounded-full transition-colors active:bg-surface-2${pinned ? " lg:hidden" : ""}`
      }
    >
      <Menu aria-hidden="true" size={24} />
    </button>
  );

  return (
    <>
      {floating ? (
        // Aligned to the content column's left edge, not the raw viewport
        // edge, the same way FloatingAddButton is: on a wide window the page
        // sits in a centered max-w-3xl column and a viewport-edge button
        // would strand out in the margin. The wrapper ignores pointer events
        // so only the button itself catches taps.
        // `left-[var(--app-nav-width,0px)]` starts it at the pinned menu's right
        // edge (AppChrome sets the variable; unset it is 0, the old inset-x-0).
        // The button's h-12 plus the 0.5rem top offset below make up
        // HAMBURGER_ROW_HEIGHT_PX in src/lib/appChrome.ts: change either here
        // and update that constant, then check the dependents listed there.
        <div
          className="print:hidden pointer-events-none fixed right-0 left-[var(--app-nav-width,0px)] z-50 flex justify-center"
          style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <div className="w-full max-w-3xl px-4">{button}</div>
        </div>
      ) : (
        button
      )}
      <NavDrawer open={open} onClose={() => setOpen(false)} user={user} />
    </>
  );
}
