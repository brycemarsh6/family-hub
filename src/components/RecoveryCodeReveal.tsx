"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { REVEAL_WORDS } from "@/lib/setupVocabulary";

/**
 * A recovery code, shown once: the code large in a card, a Copy button, the
 * "won't be shown again" warning, and an "I saved my code" tick that must be
 * set before the primary button works. Used by setup, by the sign-in reset
 * and by the Settings card, so all three look and behave the same.
 */
export function RecoveryCodeReveal({
  title,
  intro,
  code,
  warning = "It won't be shown again.",
  continueLabel,
  onContinue,
  pending,
}: {
  title: string;
  intro: string;
  code: string;
  /** The warning line; every use says the code won't be shown again. */
  warning?: string;
  continueLabel: string;
  onContinue: () => void;
  pending: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(REVEAL_WORDS.copyFailed);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-fg">{title}</h2>
        <p className="mt-1 text-base text-muted">{intro}</p>
      </div>

      <p
        className="rounded-xl border border-line bg-surface px-2 py-4 text-center font-mono text-xl font-bold tracking-wider text-fg"
        aria-label={title}
      >
        {code}
      </p>

      <button
        type="button"
        onClick={copy}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
      >
        {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
        {copied ? REVEAL_WORDS.copied : REVEAL_WORDS.copy}
      </button>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">{warning}</p>

      <label className="flex min-h-12 items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="h-6 w-6 shrink-0 accent-accent"
        />
        {REVEAL_WORDS.saved}
      </label>

      <button
        type="button"
        onClick={onContinue}
        disabled={!saved || pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {continueLabel}
      </button>
    </div>
  );
}
