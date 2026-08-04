"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const EMPTY: LoginState = {};

/**
 * The password box.
 *
 * `useActionState` is React's way of running a Server Action from a form and
 * getting a value back to render — here, the "wrong password" message. It also
 * hands us a `pending` flag while the request is in flight, so the button can
 * disable itself instead of being tapped five times on a slow phone.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, EMPTY);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <label className="block text-sm text-muted">
        <span className="mb-1 block">Family password</span>
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
