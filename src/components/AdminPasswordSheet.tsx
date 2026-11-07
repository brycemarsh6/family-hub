"use client";

import { useActionState, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { logoutWithAdminPassword, type LoginState } from "@/app/actions/auth";

const EMPTY: LoginState = {};

/**
 * The tablet's Sign out: a row that looks like the normal one, but opens a
 * sheet asking for an admin's password first (mission 39, C4). Only Settings
 * shows this, and only for a device login; the action checks that itself.
 * On success the action signs out and redirects, so nothing here closes the
 * sheet on purpose.
 */
export function AdminPasswordSheet() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
      >
        <LogOut aria-hidden="true" size={22} className="shrink-0 text-muted" />
        Sign out
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <AdminPasswordForm onCancel={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

/** Its own component so closing the sheet unmounts it and clears any error. */
function AdminPasswordForm({ onCancel }: { onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(logoutWithAdminPassword, EMPTY);

  return (
    <form
      action={formAction}
      role="dialog"
      aria-modal="true"
      aria-label="Sign the tablet out?"
      className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <h2 className="mb-2 text-lg font-semibold">Sign the tablet out?</h2>

      <label className="block text-sm text-muted">
        <span className="mb-1 block">Admin password</span>
        <input
          type="password"
          name="password"
          autoComplete="off"
          autoFocus
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
        >
          {state.error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 flex-1 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Sign out"}
        </button>
      </div>
    </form>
  );
}
