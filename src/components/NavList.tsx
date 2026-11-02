"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import {
  NAV_FOOTER_ITEMS,
  NAV_SECTIONS,
  activeNavHref,
  type NavItem,
} from "@/lib/nav";

export type DrawerUser = {
  displayName: string;
  avatarColor: string;
  role: Role;
};

/** A click the browser should keep handling itself — a new tab, a new
 * window, a download. Covers the same modifier-key and middle-click cases
 * Next's own `isModifiedEvent` does (node_modules/next/dist/client/app-dir/
 * link.js:47-52, read in this tree per AGENTS.md) — `button === 1` here is
 * the same middle button as Next's `which === 2`. It does NOT also mirror
 * Next's `target && target !== '_self'` check, since no nav `<Link>` here
 * ever sets `target` — inert today, but worth knowing precisely rather than
 * assuming full parity if one ever does. Without this, the re-tap's
 * `preventDefault` would swallow a cmd-click on the current row and make it
 * the one row in the app you can't open in a new tab. */
function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.nativeEvent.button === 1
  );
}

const ROW_CLASS =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-base transition-colors active:bg-surface-2";

// The icons-only rail: a centered 48px square per destination.
const COMPACT_ROW_CLASS =
  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors active:bg-surface-2";

/**
 * The navigation list itself: every destination from `src/lib/nav.ts`, with
 * Profile, Settings, who you are and Sign out at the bottom. Shared by
 * `NavDrawer` (which closes itself through `onNavigate`) and `PinnedNav` (which
 * has nothing to close). `compact` is the icons-only rail. Renders a fragment
 * so the parent `<aside>` keeps its own flex column and `mt-auto` footer.
 */
export function NavList({
  user,
  compact = false,
  onNavigate,
}: {
  user: DrawerUser;
  compact?: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = activeNavHref(pathname);

  function renderRow(item: NavItem) {
    const active = item.href === activeHref;
    // Two different questions, and they need two different predicates
    // (mission-12/C3, found by both gates). `active` is the lit row, and
    // /settings/family lights Settings; "does this tap go anywhere" is exact
    // equality with the row's href. Tapping Settings from /settings/family is
    // a REAL navigation; treating it as a re-tap would discard the entry the
    // user was standing on. Pathname only, deliberately: a paged calendar
    // (/calendar?date=…) is still this row's own page, and its re-tap is
    // still a refresh.
    const atRowRoot = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        // Every row closes the drawer from its own click, never from an
        // effect watching `usePathname` (setState-in-an-effect, and the
        // drawer would stay open for a navigation that never changes the
        // path).
        //
        // Re-tapping the page you're already on does not navigate at all.
        // `preventDefault` stops the browser AND Next, whose Link returns
        // early on `defaultPrevented` (node_modules/next/dist/client/app-dir/
        // link.js:319, read in this tree per AGENTS.md) — so nothing is
        // pushed and nothing is REPLACED either, and `router.refresh()`
        // restores what the tap used to do: refetch. Suppressing the
        // navigation also suppressed the scroll-to-top a real navigation
        // gives for free, so `window.scrollTo({ top: 0 })` restores that
        // too. On an iOS home-screen install there's no address bar and no
        // reload button, so this re-tap is the only manual refresh gesture
        // the app has at all (mission-11/C5).
        //
        // Modified clicks (cmd/ctrl/shift/alt, middle button) are left alone,
        // so cmd-clicking a row still opens a new tab like everywhere else.
        onClick={(event) => {
          if (atRowRoot && !isModifiedClick(event)) {
            event.preventDefault();
            router.refresh();
            window.scrollTo({ top: 0 });
          }
          onNavigate();
        }}
        aria-current={active ? "page" : undefined}
        aria-label={compact ? item.label : undefined}
        className={`${compact ? COMPACT_ROW_CLASS : ROW_CLASS} ${active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-fg"}`}
      >
        <item.icon aria-hidden="true" size={22} />
        {!compact && item.label}
      </Link>
    );
  }

  return (
    <>
      <nav aria-label="Sections" className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
        {NAV_SECTIONS.map((section) => (
          <div
            key={section.heading ?? "main"}
            className={`flex flex-col gap-1 ${compact ? "items-center" : ""}`}
          >
            {section.heading &&
              (compact ? (
                <div aria-hidden="true" className="mb-1 w-8 border-t border-line" />
              ) : (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {section.heading}
                </p>
              ))}
            {section.items.map(renderRow)}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <div
          className={`flex flex-col gap-1 border-t border-line pt-2 ${compact ? "items-center" : ""}`}
        >
          {NAV_FOOTER_ITEMS.map(renderRow)}
        </div>

        {compact ? (
          <div
            role="img"
            aria-label={user.displayName}
            className="flex justify-center border-t border-line pt-3"
          >
            <AvatarBadge displayName={user.displayName} avatarColor={user.avatarColor} size={40} />
          </div>
        ) : (
          <div className="flex items-center gap-3 border-t border-line px-3 pt-3">
            <AvatarBadge
              displayName={user.displayName}
              avatarColor={user.avatarColor}
              size={40}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{user.displayName}</p>
              <p className="text-sm text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        )}

        {/* A plain form pointed at the Server Action, same as the old
            account sheet: no client JavaScript required for this to work,
            the browser just submits it. */}
        <form action={logout} className={compact ? "flex justify-center" : undefined}>
          {compact ? (
            <button type="submit" aria-label="Sign out" className={`${COMPACT_ROW_CLASS} text-fg`}>
              <LogOut aria-hidden="true" size={22} />
            </button>
          ) : (
            <button type="submit" className={`${ROW_CLASS} font-medium text-fg`}>
              <LogOut aria-hidden="true" size={22} />
              Sign out
            </button>
          )}
        </form>
      </div>
    </>
  );
}
