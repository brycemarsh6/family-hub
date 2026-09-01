"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import {
  renamePerson,
  setPersonAvatarColor,
  resetPassword,
  reactivatePerson,
  upgradeProfileToAccount,
} from "@/app/actions/users";
import { setRole, deactivatePerson } from "@/app/actions/usersRoles";
import type { PersonInfo } from "@/lib/personInfo";
import {
  AVATAR_COLORS,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type Role,
  type AvatarColor,
} from "@/lib/constants";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

type View =
  | "menu"
  | "rename"
  | "avatarColor"
  | "role"
  | "resetPassword"
  | "upgradeAccount"
  | "deactivateConfirm";

/**
 * The per-person action sheet on Manage Family. One sheet with an internal
 * `view` state machine — the same pattern TagSelectSheet already
 * established — rather than stacking a separate ActionSheet/TitleSheet/
 * ConfirmSheet on top of each other, so there's never more than one
 * Escape-key listener alive at once.
 *
 * The two guards that can make a write fail (self-targeting, the last
 * active admin) live on the server, not here — this sheet just doesn't
 * *offer* the self-targeting ones in the first place (see `isSelf` below);
 * the last-admin guard can still surface as a real inline error, which is
 * the honest outcome for a case this sheet can't cheaply predict without
 * a second round trip for every render.
 */
export function PersonManageSheet({
  person,
  isSelf,
  onUpdated,
  onClose,
}: {
  person: PersonInfo;
  isSelf: boolean;
  onUpdated: (person: PersonInfo) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("menu");
  const [renameValue, setRenameValue] = useState(person.displayName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (view === "menu") onClose();
        else setView("menu");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, view]);

  function backToMenu() {
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setView("menu");
  }

  function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await renamePerson(person.id, trimmed);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  function handleAvatarColor(color: AvatarColor) {
    setError(null);
    startTransition(async () => {
      const result = await setPersonAvatarColor(person.id, color);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  function handleRoleChange(nextRole: Role) {
    setError(null);
    startTransition(async () => {
      const result = await setRole(person.id, nextRole);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  function validatePasswordFields(): boolean {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return false;
    }
    if (password !== confirmPassword) {
      setError("Those two passwords don't match.");
      return false;
    }
    return true;
  }

  function handleResetPassword() {
    setError(null);
    if (!validatePasswordFields()) return;
    startTransition(async () => {
      const result = await resetPassword(person.id, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  function handleUpgradeAccount() {
    setError(null);
    if (!validatePasswordFields()) return;
    startTransition(async () => {
      const result = await upgradeProfileToAccount(person.id, password);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivatePerson(person.id);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  function handleDeactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivatePerson(person.id);
      if (result.error || !result.person) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onUpdated(result.person);
      onClose();
    });
  }

  // Rendered on its own, not alongside the sheet chrome below — reuses the
  // house ConfirmSheet component exactly as the C3 contract asks, and
  // swapping the whole return here (rather than layering it on top) is
  // what keeps this a single visible modal at a time, same rule as the
  // `view` state machine below.
  if (view === "deactivateConfirm") {
    return (
      <ConfirmSheet
        title={`Deactivate ${person.displayName}?`}
        message={`${person.displayName} won't be able to sign in. Everything they've done stays.`}
        confirmLabel="Deactivate"
        pending={pending}
        onConfirm={handleDeactivate}
        onCancel={backToMenu}
      />
    );
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
        aria-label={person.displayName}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          {view !== "menu" ? (
            <button
              type="button"
              onClick={backToMenu}
              className="-ml-1 flex min-h-11 items-center gap-1 text-lg font-semibold"
            >
              <ChevronLeft aria-hidden="true" size={20} />
              {person.displayName}
            </button>
          ) : (
            <h2 className="text-lg font-semibold">{person.displayName}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {view === "menu" && (
          <div className="flex flex-col gap-1">
            <MenuRow label="Rename" onClick={() => setView("rename")} />
            <MenuRow label="Avatar colour" onClick={() => setView("avatarColor")} />
            {/* setRole refuses a self-targeted change on the server
                (usersRoles.ts) — not offered here for the same reason. */}
            {!isSelf && <MenuRow label="Change role" onClick={() => setView("role")} />}
            {person.hasAccount ? (
              <MenuRow label="Reset password" onClick={() => setView("resetPassword")} />
            ) : (
              <MenuRow
                label="Upgrade profile to account"
                onClick={() => setView("upgradeAccount")}
              />
            )}
            {/* deactivatePerson also refuses a self-targeted deactivation
                on the server — not offered here for the same reason. */}
            {!isSelf &&
              (person.deactivatedAt ? (
                <MenuRow label="Reactivate" onClick={handleReactivate} />
              ) : (
                <MenuRow
                  label="Deactivate"
                  destructive
                  onClick={() => setView("deactivateConfirm")}
                />
              ))}
          </div>
        )}

        {view === "rename" && (
          <div className="flex flex-col gap-4">
            <label className="block text-sm text-muted">
              <span className="mb-1 block">Name</span>
              <input
                type="text"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRename();
                }}
                autoComplete="off"
                autoFocus
                className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
              />
            </label>
            <ErrorBlock error={error} />
            <button
              type="button"
              onClick={handleRename}
              disabled={pending || !renameValue.trim()}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {view === "avatarColor" && (
          <div className="flex flex-col gap-1">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => handleAvatarColor(color.name)}
                disabled={pending}
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                  {capitalize(color.name)}
                </span>
                {person.avatarColor === color.name && (
                  <Check aria-hidden="true" size={18} className="text-accent" />
                )}
              </button>
            ))}
            <ErrorBlock error={error} />
          </div>
        )}

        {view === "role" && (
          <div className="flex flex-col gap-1">
            {ASSIGNABLE_ROLES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleRoleChange(option)}
                disabled={pending}
                className="flex min-h-12 items-center justify-between rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                {ROLE_LABELS[option]}
                {person.role === option && (
                  <Check aria-hidden="true" size={18} className="text-accent" />
                )}
              </button>
            ))}
            <ErrorBlock error={error} />
          </div>
        )}

        {(view === "resetPassword" || view === "upgradeAccount") && (
          <div className="flex flex-col gap-4">
            <label className="block text-sm text-muted">
              <span className="mb-1 block">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                autoFocus
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
            <ErrorBlock error={error} />
            <button
              type="button"
              onClick={view === "resetPassword" ? handleResetPassword : handleUpgradeAccount}
              disabled={pending}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
            >
              {pending
                ? "Saving…"
                : view === "resetPassword"
                  ? "Reset password"
                  : "Create account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({
  label,
  onClick,
  destructive,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between rounded-xl px-3 text-left text-base font-medium transition-colors active:bg-surface-2 ${
        destructive ? "text-danger" : "text-fg"
      }`}
    >
      {label}
      <ChevronRight aria-hidden="true" size={18} className="shrink-0 opacity-60" />
    </button>
  );
}

function ErrorBlock({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
      {error}
    </p>
  );
}
