"use client";

import { useActionState, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { AvatarBadge } from "@/components/AvatarBadge";
import type { Role } from "@/lib/constants";

const EMPTY: LoginState = {};

export type LoginAccount = {
  id: string;
  displayName: string;
  avatarColor: string;
  role: Role;
};

/**
 * Tap-your-name, then password — two views in one component, the
 * SlotEditSheet/TagSelectSheet internal-view-state precedent (one component
 * with a `view` switch, not two components stacked). Family Accounts v1
 * replaced the single shared password with this.
 */
export function LoginForm({ accounts }: { accounts: LoginAccount[] }) {
  const [state, formAction, pending] = useActionState(login, EMPTY);
  const [selected, setSelected] = useState<LoginAccount | null>(null);

  if (!selected) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => setSelected(account)}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 text-left text-base font-semibold text-fg transition-colors active:bg-line"
          >
            <AvatarBadge
              displayName={account.displayName}
              avatarColor={account.avatarColor}
              size={40}
            />
            {account.displayName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          // Names the destination, not the action — the BackLink convention
          // applied here even though this isn't BackLink itself (BackLink
          // navigates between pages; this just switches views in one form).
          className="flex min-h-11 w-fit items-center gap-1 -ml-1 text-sm font-medium text-muted transition-colors hover:text-fg"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          All accounts
        </button>

        <div className="mt-2 flex items-center gap-3">
          <AvatarBadge
            displayName={selected.displayName}
            avatarColor={selected.avatarColor}
            size={40}
          />
          <span className="text-lg font-semibold">{selected.displayName}</span>
        </div>
      </div>

      {/* The actual credential the server checks. */}
      <input type="hidden" name="userId" defaultValue={selected.id} />
      {/* Carries no meaning to the server — verifyPassword only ever checks
          the userId above. This exists purely so a password manager sees a
          normal username+password pair and offers to save/fill it against
          the right account, rather than against whichever account was last
          selected. */}
      <input
        type="hidden"
        name="username"
        autoComplete="username"
        defaultValue={selected.displayName}
      />

      <label className="block text-sm text-muted">
        <span className="mb-1 block">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          // Focused on load so the keyboard is already up on a phone.
          autoFocus
          required
          aria-describedby={state.error ? "login-error" : undefined}
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </label>

      {state.error && (
        <p
          id="login-error"
          // role="alert" so a screen reader announces the failure rather than
          // leaving someone wondering why nothing happened.
          role="alert"
          className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
