"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { createPerson } from "@/app/actions/users";
import type { PersonInfo } from "@/lib/personInfo";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * "Add a person" — name, role, and account-vs-profile in one sheet (no
 * internal view state machine needed, unlike PersonManageSheet: every
 * field here is part of the same one decision, not a drill-down into a
 * sub-task). A password field only appears once "Account" is chosen —
 * a profile has no password at all, same distinction createPerson itself
 * makes (password omitted = profile).
 */
export function CreatePersonSheet({
  onCreated,
  onClose,
}: {
  onCreated: (person: PersonInfo) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("kid");
  const [wantsAccount, setWantsAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give this person a name.");
      return;
    }
    if (wantsAccount) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError("Those two passwords don't match.");
        return;
      }
    }

    startTransition(async () => {
      const result = await createPerson(trimmedName, role, wantsAccount ? password : null);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onCreated(result.person);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a person"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a person</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="block text-sm text-muted">
            <span className="mb-1 block">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoFocus
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm text-muted">Role</span>
            <div className="flex flex-col gap-1">
              {ASSIGNABLE_ROLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-surface px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
                >
                  {ROLE_LABELS[option]}
                  {role === option && (
                    <Check aria-hidden="true" size={18} className="text-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm text-muted">Can they sign in?</span>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setWantsAccount(false)}
                className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-surface px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
              >
                <span>
                  Profile only
                  <span className="block text-xs font-normal text-muted">
                    No password — can&apos;t sign in yet
                  </span>
                </span>
                {!wantsAccount && (
                  <Check aria-hidden="true" size={18} className="shrink-0 text-accent" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setWantsAccount(true)}
                className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-surface px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
              >
                <span>
                  Account
                  <span className="block text-xs font-normal text-muted">
                    Set a password so they can sign in
                  </span>
                </span>
                {wantsAccount && (
                  <Check aria-hidden="true" size={18} className="shrink-0 text-accent" />
                )}
              </button>
            </div>
          </div>

          {wantsAccount && (
            <>
              <label className="block text-sm text-muted">
                <span className="mb-1 block">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
                />
              </label>
              <label className="block text-sm text-muted">
                <span className="mb-1 block">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !name.trim()}
          className="mt-4 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add person"}
        </button>
      </div>
    </div>
  );
}
