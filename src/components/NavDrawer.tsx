"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { NavList } from "@/components/NavList";
import type { Role } from "@/lib/constants";

export type DrawerUser = {
  displayName: string;
  avatarColor: string;
  role: Role;
};

/**
 * The app's one navigation surface on phones: a left-hand drawer around
 * `NavList` (every destination from `src/lib/nav.ts`, plus Profile, Settings,
 * who you are and Sign out). Opened by `HamburgerButton`, which owns `open`.
 * Its list never changes as you move around, only which row is lit.
 */
export function NavDrawer({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: DrawerUser;
}) {
  // The overlay below is portaled to document.body, and a portal target only
  // exists in the browser — so this needs to know once hydration is past.
  // `useSyncExternalStore` rather than `useState` + `useEffect(setMounted)`:
  // the server render and first client render both see `false` (no hydration
  // mismatch) and React re-checks the real snapshot (`true`) after mount
  // without a setState-in-an-effect (which this project's lint steers away
  // from). Same discipline `useLastStore`/`useToday` use.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const overlay = (
    <div className="print:hidden fixed inset-0 z-[60] flex">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside
        id="app-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="relative flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto bg-surface p-3 shadow-lg"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          paddingLeft: "calc(0.75rem + env(safe-area-inset-left))",
        }}
      >
        <NavList user={user} onNavigate={onClose} />
      </aside>
    </div>
  );

  // Portaled to document.body rather than rendered in place: the wordmark
  // header carries `backdrop-blur`, and per the CSS spec an element with
  // `backdrop-filter` becomes the containing block for its `position: fixed`
  // descendants. Left in place, this overlay's `fixed inset-0` would resolve
  // against the header box instead of the viewport — the drawer renders above
  // the visible screen, clipped to a sliver. The floating hamburger's pill
  // has `backdrop-blur` too. A portal escapes that containing block entirely.
  // If this portal ever looks like an inconsistency worth "cleaning up", it
  // isn't; removing it reintroduces this bug.
  return open && mounted ? createPortal(overlay, document.body) : null;
}
