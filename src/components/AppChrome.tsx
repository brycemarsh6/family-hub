"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HamburgerButton } from "@/components/HamburgerButton";
import type { DrawerUser } from "@/components/NavDrawer";
import { MarsheeWordmark } from "@/components/MarsheeWordmark";
import { HAMBURGER_ROW_HEIGHT_PX, showsWordmarkHeader } from "@/lib/appChrome";

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
 */
export function AppChrome({
  user,
  children,
}: {
  user: DrawerUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const wordmark = showsWordmarkHeader(pathname);

  return (
    <>
      {wordmark ? (
        /*
          This header only exists on the dashboard and /login now. Its
          height is no longer a measured fact anything positions against
          (the old `APP_HEADER_HEIGHT_PX` and the bottom tab bar's constant
          are gone). What other files position against is the floating
          hamburger's row, `HAMBURGER_ROW_HEIGHT_PX` /
          `useHamburgerRowHeight` in `src/lib/appChrome.ts`, which carries
          the dependents list. Still on the OLD constants until mission-23/C4
          moves them: `CalendarHeader.tsx`, `ScheduleView.tsx`,
          `TimelineGrid.tsx`, `CalendarViews.tsx`, `RecipeList.tsx`,
          `AddItemBar.tsx`, `FloatingAddButton.tsx` and
          `(app)/calendar/loading.tsx`.
        */
        <header className="print:hidden sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
            {user && <HamburgerButton user={user} />}
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
        user && <HamburgerButton user={user} floating />
      )}

      {/* The bottom padding keeps the last row of a page clear of the home
          indicator and any fixed bottom control. The top padding on
          non-wordmark pages is the hamburger row: the safe-area inset (a
          device fact the constant can't know) plus the button and its gap. */}
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] print:pb-0 ${
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
}
