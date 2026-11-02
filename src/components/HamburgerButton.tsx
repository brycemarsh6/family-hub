"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { NavDrawer, type DrawerUser } from "@/components/NavDrawer";

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
 * Owns the open state and renders the drawer, so there is exactly one
 * drawer on screen: AppChrome renders one or the other button, never both.
 */
export function HamburgerButton({
  user,
  floating = false,
}: {
  user: DrawerUser;
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);

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
          ? "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface/90 shadow-sm backdrop-blur transition-opacity active:opacity-80"
          : "flex h-12 w-12 items-center justify-center rounded-full transition-colors active:bg-surface-2"
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
        // The button's h-12 plus the 0.5rem top offset below make up
        // HAMBURGER_ROW_HEIGHT_PX in src/lib/appChrome.ts: change either here
        // and update that constant, then check the dependents listed there.
        <div
          className="print:hidden pointer-events-none fixed inset-x-0 z-50 flex justify-center"
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
