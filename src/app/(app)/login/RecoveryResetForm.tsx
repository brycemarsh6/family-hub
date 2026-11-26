"use client";

import { useState, useTransition } from "react";
import { login, resetPasswordWithRecoveryCode } from "@/app/actions/auth";
import { RecoveryCodeReveal } from "@/components/RecoveryCodeReveal";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { RECOVERY_WORDS } from "@/lib/setupVocabulary";

const FIELD = "min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none";

/**
 * An admin who forgot their password: the family's recovery code plus a new
 * password. On success the code is replaced, so the new one is shown once;
 * Continue signs in with the password just chosen.
 */
export function RecoveryResetForm({ userId }: { userId: string }) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorLine = error && (
    <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
      {error}
    </p>
  );

  if (newCode) {
    return (
      <div className="flex flex-col gap-4">
        <RecoveryCodeReveal
          title={RECOVERY_WORDS.newCodeTitle}
          intro={RECOVERY_WORDS.newCodeIntro}
          code={newCode}
          warning={RECOVERY_WORDS.newCodeWarning}
          continueLabel={RECOVERY_WORDS.continue}
          pending={pending}
          onContinue={() =>
            startTransition(async () => {
              const form = new FormData();
              form.set("userId", userId);
              form.set("password", newPassword);
              // On success `login` redirects, so nothing after it runs.
              const result = await login({}, form);
              if (result.error) setError(result.error);
            })
          }
        />
        {errorLine}
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordWithRecoveryCode({
        userId,
        code,
        newPassword,
        newPasswordAgain,
      });
      if ("error" in result) setError(result.error);
      else setNewCode(result.recoveryCode);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{RECOVERY_WORDS.resetTitle}</h2>
        <p className="mt-1 text-base text-muted">{RECOVERY_WORDS.resetIntro}</p>
      </div>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{RECOVERY_WORDS.codeLabel}</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={RECOVERY_WORDS.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          className={FIELD}
        />
      </label>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{RECOVERY_WORDS.newPasswordLabel}</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={FIELD}
        />
      </label>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{RECOVERY_WORDS.newPasswordAgainLabel}</span>
        <input
          type="password"
          value={newPasswordAgain}
          onChange={(event) => setNewPasswordAgain(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={FIELD}
        />
      </label>
      {errorLine}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? RECOVERY_WORDS.setting : RECOVERY_WORDS.setPassword}
      </button>
    </form>
  );
}
