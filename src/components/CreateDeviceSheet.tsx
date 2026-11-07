"use client";

import { useEffect, useState, useTransition } from "react";
import { createDeviceLogin } from "@/app/actions/users";
import type { PersonInfo } from "@/lib/personInfo";
import { DEVICE_DISPLAY_NAME_DEFAULT } from "@/lib/constants";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * "Set up a tablet login" (mission 39): the same bones as CreatePersonSheet,
 * minus the role and account choices: a tablet login is always role
 * "device" and always has a password, so the whole sheet is a name
 * (prefilled "Tablet"), a password and a confirm.
 */
export function CreateDeviceSheet({
  onCreated,
  onClose,
}: {
  onCreated: (person: PersonInfo) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(DEVICE_DISPLAY_NAME_DEFAULT);
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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Those two passwords don't match.");
      return;
    }

    startTransition(async () => {
      const result = await createDeviceLogin(name, password);
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
        aria-label="Set up a tablet login"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Set up a tablet login</h2>
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
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            />
          </label>
          <label className="block text-sm text-muted">
            <span className="mb-1 block">Tablet password</span>
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
            <span className="mb-1 block">Confirm</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            />
          </label>
          <p className="text-sm text-muted">
            The tablet can check off habits and tasks for anyone, manage groceries and the
            pantry, set the week&apos;s meals, and add recipes. It can&apos;t change people,
            goals, habits or the dashboard. Only an admin can rename it or change its
            password.
          </p>
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
          disabled={pending || !password || !confirmPassword}
          className="mt-4 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}
