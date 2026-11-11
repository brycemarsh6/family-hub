"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import { NavList } from "@/components/NavList";
import type { NavMode } from "@/lib/navMode";

// Tailwind's `lg` breakpoint, where this menu appears (HamburgerButton keeps
// the same literal). Written out because Tailwind has no JS constant for it.
const PINNED_MEDIA_QUERY = "(min-width: 1024px)";

// Distinct from NavDrawer's default id, so the phone hamburger's drawer and
// this rail's drawer can never put the same id on two elements at once.
const RAIL_DRAWER_ID = "app-nav-rail-drawer";

// Same look as a rail row (NavList's COMPACT_ROW_CLASS).
const RAIL_BUTTON_CLASS =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors active:bg-surface-2";

/**
 * The side menu pinned open on wide screens (`lg` and up), for people whose
 * Menu style setting is "icons only" (`rail`) or "icons + names" (`sidebar`).
 * Below `lg` it is `hidden` and the floating hamburger plus `NavDrawer` do
 * the job, exactly as before. Its width is `NAV_RAIL_WIDTH` or
 * `NAV_SIDEBAR_WIDTH` from `src/lib/appChrome.ts` (px, so it stays Normal
 * size at every Text size); AppChrome sets `--app-nav-width-lg` from the same
 * numbers and the aside reads it, so the aside and the fixed bars always agree.
 * In sidebar mode the rail body is rendered too, shown only while the month
 * panel marker is on the page (AppChrome narrows `--app-nav-width-lg` then).
 *
 * In rail mode the first item is a menu button that opens the same `NavDrawer`
 * (with names) over the page, for touch screens that have no hover. This
 * component owns that open state. The drawer is closed if the window shrinks
 * below `lg`, where the hamburger takes over, so only one drawer exists.
 *
 * Import this only from `AppChrome` (a client component). `appChrome.ts` is
 * `"use client"`, so its constants would arrive as client references inside a
 * Server Component.
 */
export function PinnedNav({
  mode,
  onSendFeedback,
}: {
  mode: Exclude<NavMode, "hamburger">;
  onSendFeedback: () => void;
}) {
  const rail = mode === "rail";
  const [open, setOpen] = useState(false);

  // Close from the change listener, not the effect body (setState in an
  // effect body is a lint error): the drawer is already closed on mount.
  useEffect(() => {
    const query = window.matchMedia(PINNED_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const railBody = (
    <>
      <div data-text-size-reset className="flex flex-1 flex-col">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Show menu names"
            title="Show menu names"
            aria-expanded={open}
            aria-controls={RAIL_DRAWER_ID}
            className={RAIL_BUTTON_CLASS}
          >
            <Menu aria-hidden="true" size={22} />
          </button>
        </div>
        <div aria-hidden="true" className="mx-auto my-0.5 w-8 border-t border-line" />
        <NavList compact onNavigate={() => {}} onSendFeedback={onSendFeedback} />
      </div>
      <NavDrawer
        open={open}
        onClose={() => setOpen(false)}
        onSendFeedback={onSendFeedback}
        id={RAIL_DRAWER_ID}
      />
    </>
  );

  return (
    <aside
      aria-label="Menu"
      className="hidden lg:flex sticky top-0 h-dvh shrink-0 flex-col overflow-y-auto border-r border-line bg-surface print:hidden"
      style={{
        width: "var(--app-nav-width-lg)",
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "calc(12px + env(safe-area-inset-top))",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      {/* mission-58 follow-up: the menu stays Normal size at every Text size.
          data-text-size-reset (globals.css) cancels the root font size and the
          icon zoom for everything inside. The padding stays on the aside, in
          px, so env(safe-area-inset-*) is not scaled by that zoom. */}
      {/* mission-72: while a page holds `data-month-panel="open"` (the Calendar's
          month panel), a pinned Sidebar draws as the icon rail. Both bodies are
          rendered and CSS picks one; `navMode` never changes. The variant
          classes are written out whole because Tailwind only finds literal
          strings. docs/structure/layout.md, "The month panel marker". */}
      {rail ? (
        railBody
      ) : (
        <>
          <div data-text-size-reset className="flex flex-1 flex-col [body:has([data-month-panel=open])_&]:hidden">
            <NavList compact={false} onNavigate={() => {}} onSendFeedback={onSendFeedback} />
          </div>
          <div className="hidden flex-1 flex-col [body:has([data-month-panel=open])_&]:flex">{railBody}</div>
        </>
      )}
    </aside>
  );
}
