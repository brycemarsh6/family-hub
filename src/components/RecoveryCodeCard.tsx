"use client";

import { useState, useTransition } from "react";
import { makeNewRecoveryCode } from "@/app/actions/recoveryCode";
import { RecoveryCodeReveal } from "@/components/RecoveryCodeReveal";
import { CODE_CARD_WORDS } from "@/lib/setupVocabulary";

/**
 * The admin's Settings card for the family recovery code: whether one is
 * saved, and a button to make a new one (which shows once, then is gone).
 * No password check first: a signed-in admin can already reset anyone's
 * password in Manage family.
 */
export function RecoveryCodeCard({ hasCode }: { hasCode: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(hasCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function make() {
    setError(null);
    startTransition(async () => {
      const result = await makeNewRecoveryCode();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCode(result.recoveryCode);
      setSaved(true);
    });
  }

  if (code) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        <RecoveryCodeReveal
          title={CODE_CARD_WORDS.revealTitle}
          intro={CODE_CARD_WORDS.revealIntro}
          code={code}
          continueLabel={CODE_CARD_WORDS.done}
          onContinue={() => setCode(null)}
          pending={false}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        {CODE_CARD_WORDS.title}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            saved ? "bg-accent-soft text-fg" : "bg-surface-2 text-muted"
          }`}
        >
          {saved ? CODE_CARD_WORDS.saved : CODE_CARD_WORDS.none}
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted">
        {CODE_CARD_WORDS.help}
        {saved && ` ${CODE_CARD_WORDS.helpReplace}`}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={make}
        disabled={pending}
        className={`mt-3 min-h-12 w-full rounded-xl text-base font-semibold transition-opacity active:opacity-80 disabled:opacity-50 ${
          saved ? "border border-line bg-surface text-fg" : "bg-accent text-accent-fg"
        }`}
      >
        {pending ? CODE_CARD_WORDS.making : saved ? CODE_CARD_WORDS.makeNew : CODE_CARD_WORDS.make}
      </button>
    </div>
  );
}
