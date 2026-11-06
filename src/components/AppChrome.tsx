"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HamburgerButton } from "@/components/HamburgerButton";
import type { DrawerUser } from "@/components/NavList";
import { MarsheeWordmark } from "@/components/MarsheeWordmark";
import { PinnedNav } from "@/components/PinnedNav";
import {
  HAMBURGER_ROW_HEIGHT_PX,
  pinnedNavWidthPx,
  showsWordmarkHeader,
} from "@/lib/appChrome";
import type { NavMode } from "@/lib/navMode";

/**
 * Everything around a page: the chrome the root layout used to inline. The
 * dashboard and /login get the Marshee wordmark header (with the hamburger
 * beside it when signed in); every other page gets only the floating
 * hamburger, and `<main>` reserves a row for it so the button never covers
 * page content (DESIGN.md "unoccluded targets"). A client component because
 * which of the two it renders depends on `usePathname()`.
 *
 * `user` is null on /login (nobody to open a menu for), so no drawer exists
 * there.
 *
 * `navMode` is the person's Menu style. When it is "rail" or "sidebar" the
 * whole page sits beside a `PinnedNav` at `lg` and up, and `--app-nav-width`
 * (that menu's width, from `pinnedNavWidthPx`) is set at `lg` only, for the
 * fixed bars to use as their left edge: HamburgerButton's floating wrapper,
 * AddItemBar and FloatingAddButton. Below `lg` the variable is unset (their
 * fallback is 0), so phones and upright tablets are unchanged. The floating
 * hamburger stays rendered when pinned (`lg:invisible`) so its reserved row
 * and `useHamburgerRowHeight` keep working.
 */
export function AppChrome({
  user,
  navMode,
  children,
}: {
  user: DrawerUser | null;
  navMode: NavMode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const wordmark = showsWordmarkHeader(pathname);
  const pinnedMode = user && navMode !== "hamburger" ? navMode : null;

  const page = (
    <>
      {wordmark ? (
        /*
          This header only exists on the dashboard and /login. What other
          files position against is the floating hamburger's row,
          `HAMBURGER_ROW_HEIGHT_PX` / `useHamburgerRowHeight` in
          `src/lib/appChrome.ts`, which carries the dependents list.
        */
        <header className="print:hidden sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
            {user && <HamburgerButton user={user} pinned={pinnedMode !== null} />}
            {/* The wordmark alone, in brand Sage — no icon tile beside it.
                The mark and the word say the same thing, so showing both in
                a 48px-tall bar just crowds it; the tile still carries the
                brand on the home screen and the browser tab, where there's
                no room for a word. */}
            <Link href="/" className="flex min-h-12 items-center">
              <MarsheeWordmark className="h-10 w-auto text-brand-sage" />
            </Link>
          </div>
        </header>
      ) : (
        user && <HamburgerButton user={user} floating pinned={pinnedMode !== null} />
      )}

      {/* The bottom padding keeps the last row of a page clear of the home
          indicator and any fixed bottom control. The top padding on
          non-wordmark pages is the hamburger row: the safe-area inset (a
          device fact the constant can't know) plus the button and its gap. A page
          holding a `data-fills-viewport` element (the calendar's hour
          timeline, which already ends at the viewport bottom) drops the
          bottom padding so the document doesn't scroll past it. A page holding
          a `data-fills-width` element (Whole family's columns on an iPad) lifts
          the width cap and fills exactly one screen from `md` up. */}
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] has-[[data-fills-viewport]]:pb-0 has-[[data-fills-width]]:md:h-dvh has-[[data-fills-width]]:md:max-w-none has-[[data-fills-width]]:md:flex-none has-[[data-fills-width]]:md:flex-col has-[[data-fills-width]]:md:pb-3 has-[[data-fills-width]]:md:flex print:pb-0 ${
          wordmark ? "pt-4" : ""
        }`}
        style={
          wordmark
            ? undefined
            : {
                paddingTop: `calc(env(safe-area-inset-top) + ${HAMBURGER_ROW_HEIGHT_PX}px)`,
              }
        }
      >
        {children}
      </main>
    </>
  );

  if (!user || !pinnedMode) return page;

  return (
    // `--app-nav-width-lg` carries the number; the `lg:` class turns it into
    // `--app-nav-width` only at 1024px and up. Below that the variable stays
    // unset and the fixed bars fall back to 0.
    <div
      className="flex flex-1 flex-col lg:flex-row lg:[--app-nav-width:var(--app-nav-width-lg)]"
      style={{ "--app-nav-width-lg": `${pinnedNavWidthPx(pinnedMode)}px` } as React.CSSProperties}
    >
      <PinnedNav mode={pinnedMode} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">{page}</div>
    </div>
  );
}
