"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AvatarBadge } from "@/components/AvatarBadge";
import { logout } from "@/app/actions/auth";
import type { Role } from "@/lib/constants";

/** "Parent", not "parent" — the identity row shows a human label, the
 * database keeps the lowercase vocabulary value. "Device" is included for
 * completeness even though device-role sign-in doesn't exist until Phase 4;
 * a role this menu doesn't recognize would be worse than an unused entry. */
const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  parent: "Parent",
  kid: "Kid",
  device: "Device",
};

/**
 * The header's identity control — a tappable avatar that opens a small sheet
 * showing who's signed in, with Sign out. Replaces the old SignOutButton.
 *
 * Not built on ActionSheet, deliberately: ActionSheet's `items` are all
 * clickable action rows with no slot for a leading, non-interactive block
 * (avatar + name + role) — and an identity row rendered as a fake "action"
 * with no real onClick would look tappable when it isn't, which is its own
 * violation (DESIGN.md: "tappable looks tappable"). The dialog chrome below
 * (backdrop, rounded card, safe-area padding, Escape-to-close) is the same
 * shape ActionSheet/TagSelectSheet already use, so it still reads as the
 * one house sheet rather than a one-off.
 *
 * Settings and Manage Family are Phase 3b of the Family Accounts plan —
 * deliberately not rendered here yet, not even disabled, per the house rule
 * that a visible control should do something real.
 */
export function UserMenu({
  displayName,
  avatarColor,
  role,
}: {
  displayName: string;
  avatarColor: string;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  // The overlay below is portaled to document.body (see the comment on the
  // portal call for why), and a portal target only exists in the browser —
  // so this needs to know once hydration is past, the same mounted-after-
  // hydration discipline `useLastStore`/`useToday` use for browser-only
  // values. `useSyncExternalStore` rather than a plain `useState` +
  // `useEffect(() => setMounted(true))`: the latter is exactly the
  // setState-in-an-effect shape this project's lint (and React's own docs)
  // steer away from, since it's a second render forced from inside the
  // first one. `useSyncExternalStore`'s third argument is what the server
  // render and first client render both see (`false`, so they agree — no
  // hydration mismatch), and React itself re-checks the real snapshot
  // (`true`) right after mount without a manual `setState` call. In
  // practice the overlay can never actually render before this is `true`
  // anyway (`open` starts `false` and only flips via a post-hydration
  // click), but gating on `mounted` too makes that safety explicit rather
  // than incidental.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const overlay = (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className="relative flex w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-sm md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-1 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-3 px-1 pb-4">
          <AvatarBadge displayName={displayName} avatarColor={avatarColor} size={48} />
          <div>
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-sm text-muted">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        {/* A plain form pointed at the Server Action, same as the old
            SignOutButton — no client JavaScript required for this to
            work, the browser just submits it. */}
        <form action={logout} className="border-t border-line pt-2">
          <button
            type="submit"
            className="flex min-h-14 w-full items-center rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="ml-auto">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Signed in as ${displayName}. Open account menu.`}
        className="flex h-11 w-11 items-center justify-center rounded-full transition-opacity active:opacity-80"
      >
        <AvatarBadge displayName={displayName} avatarColor={avatarColor} size={40} />
      </button>

      {/* Portaled to document.body rather than rendered in place: the
          header (`(app)/layout.tsx`) carries `backdrop-blur`, and per the
          CSS spec an element with `backdrop-filter` becomes the containing
          block for its `position: fixed` descendants. Left in place, this
          overlay's `fixed inset-0` would resolve against the 72px header
          box instead of the viewport — the identity row and close button
          end up rendered above the visible screen, with only "Sign out"
          showing, painted over the header brand. A portal escapes that
          containing block entirely. This is the only sheet in the app
          under such an ancestor (every other sheet renders under `<main>`,
          which has no `backdrop-filter`) — if this portal ever looks like
          an inconsistency worth "cleaning up," it isn't; removing it
          reintroduces this bug. */}
      {open && mounted && createPortal(overlay, document.body)}
    </div>
  );
}
