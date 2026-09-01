"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { TitleSheet } from "@/components/TitleSheet";
import { RadioSheet } from "@/components/RadioSheet";
import {
  updateMyName,
  updateMyAvatarColor,
  changeMyPassword,
} from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import {
  AVATAR_COLORS,
  avatarColorHex,
  ROLE_LABELS,
  type AvatarColor,
  type Role,
} from "@/lib/constants";

/** A capitalized color name for display — "amber", not "Amber", is how the
 * palette stores it (AVATAR_COLORS in constants.ts). */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Everyone's own settings: rename, pick an avatar colour, change password.
 * The first two are the house "tap a row, get a sheet" pattern (TitleSheet,
 * RadioSheet); password is a plain form per the C3 contract — it's
 * keyboard entry, not a count, so the QuantityStepper rule doesn't apply,
 * and a form with three real fields doesn't fit the single-field TitleSheet
 * shape anyway.
 */
export function SettingsForm({
  displayName: initialDisplayName,
  avatarColor: initialAvatarColor,
  role,
}: {
  displayName: string;
  avatarColor: string;
  role: Role;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarColor, setAvatarColor] = useState(initialAvatarColor);

  const [renameOpen, setRenameOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRename(newName: string) {
    setNameError(null);
    startTransition(async () => {
      const result = await updateMyName(newName);
      if (result.error) {
        setNameError(result.error);
        return;
      }
      setDisplayName(newName.trim());
      setRenameOpen(false);
    });
  }

  function handleColorChange(color: AvatarColor) {
    setColorError(null);
    startTransition(async () => {
      const result = await updateMyAvatarColor(color);
      if (result.error) {
        setColorError(result.error);
        return;
      }
      setAvatarColor(color);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <AvatarBadge displayName={displayName} avatarColor={avatarColor} size={48} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{displayName}</p>
          <p className="text-sm text-muted">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setRenameOpen(true)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left transition-colors active:bg-surface-2"
        >
          <span>
            <span className="block text-sm text-muted">Display name</span>
            <span className="block text-base font-medium">{displayName}</span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        </button>

        <button
          type="button"
          onClick={() => setColorOpen(true)}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left transition-colors active:bg-surface-2"
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-6 w-6 shrink-0 rounded-full"
              style={{ backgroundColor: avatarColorHex(avatarColor) }}
            />
            <span>
              <span className="block text-sm text-muted">Avatar colour</span>
              <span className="block text-base font-medium">{capitalize(avatarColor)}</span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        </button>
        {colorError && (
          <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
            {colorError}
          </p>
        )}
      </div>

      <ChangePasswordForm />

      {renameOpen && (
        <TitleSheet
          heading="Your name"
          initialValue={displayName}
          submitLabel="Save"
          pending={pending}
          error={nameError}
          onSubmit={handleRename}
          onClose={() => setRenameOpen(false)}
        />
      )}

      {colorOpen && (
        <RadioSheet
          title="Avatar colour"
          selected={avatarColor as AvatarColor}
          onSelect={handleColorChange}
          onClose={() => setColorOpen(false)}
          options={AVATAR_COLORS.map((c) => ({
            value: c.name,
            label: capitalize(c.name),
            leading: (
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-full"
                style={{ backgroundColor: c.hex }}
              />
            ),
          }))}
        />
      )}
    </div>
  );
}

/**
 * The one self-service action that needs proof of who's asking, not just a
 * valid session — changeMyPassword requires the current password. A plain
 * form (real keyboard entry), not a sheet: this isn't a "pick one of a few
 * things" choice.
 */
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Those two new passwords don't match.");
      return;
    }

    startTransition(async () => {
      const result = await changeMyPassword(currentPassword, newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <h2 className="text-base font-semibold">Change password</h2>

      <label className="block text-sm text-muted">
        <span className="mb-1 block">Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </label>

      <label className="block text-sm text-muted">
        <span className="mb-1 block">New password</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </label>

      <label className="block text-sm text-muted">
        <span className="mb-1 block">Confirm new password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </label>

      {/* Wrong current password / a typo is a user mistake, not a
          destructive or urgent state — warn, not danger, per DESIGN.md's
          error-color rule (the login page's own wrong-password error is
          the same amber). */}
      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
