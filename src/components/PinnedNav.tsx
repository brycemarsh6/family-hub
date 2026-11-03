"use client";

import { NavList, type DrawerUser } from "@/components/NavList";
import { pinnedNavWidthPx } from "@/lib/appChrome";
import type { NavMode } from "@/lib/navMode";

/**
 * The side menu pinned open on wide screens (`lg` and up), for people whose
 * Menu style setting is "icons only" (`rail`) or "icons + names" (`sidebar`).
 * Below `lg` it is `hidden` and the floating hamburger plus `NavDrawer` do
 * the job, exactly as before. Its width is `NAV_RAIL_WIDTH_PX` or
 * `NAV_SIDEBAR_WIDTH_PX` from `src/lib/appChrome.ts`; AppChrome sets
 * `--app-nav-width` from the same numbers.
 *
 * Import this only from `AppChrome` (a client component). `appChrome.ts` is
 * `"use client"`, so its constants would arrive as client references inside a
 * Server Component.
 */
export function PinnedNav({
  mode,
  user,
}: {
  mode: Exclude<NavMode, "hamburger">;
  user: DrawerUser;
}) {
  const rail = mode === "rail";

  return (
    <aside
      aria-label="Menu"
      className="hidden lg:flex sticky top-0 h-dvh shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-3 print:hidden"
      style={{
        width: pinnedNavWidthPx(mode),
        paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      <NavList user={user} compact={rail} onNavigate={() => {}} />
    </aside>
  );
}
