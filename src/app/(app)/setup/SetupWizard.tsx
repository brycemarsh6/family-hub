"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { login } from "@/app/actions/auth";
import { checkSetupLink, createFamily } from "@/app/actions/setup";
import { RecoveryCodeReveal } from "@/components/RecoveryCodeReveal";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { FAMILY_NAME_MAX } from "@/lib/feedbackForward";
import { DISPLAY_NAME_MAX } from "@/lib/setupGate";
import { SETUP_WORDS, setupStep2Intro } from "@/lib/setupVocabulary";

type LinkState = { code: string; status: "ok" | "bad" | "limited" | "offline" };
type Created = { userId: string; recoveryCode: string };

const FIELD = "min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none";

// The setup code travels after the "#" in the link, so it never reaches the
// server's logs. Browser-only, so it is read with useSyncExternalStore.
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHashCode(): string {
  const raw = window.location.hash.replace(/^#/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function Dots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden="true">
      {[1, 2].map((n) => (
        <span key={n} className={`h-2 w-2 rounded-full ${n === step ? "bg-accent" : "bg-line"}`} />
      ))}
    </div>
  );
}

/**
 * First-run setup: family name, then the first admin's login, then the
 * recovery code shown once. The wizard keeps the password in state so
 * "Continue" can sign in with the existing login action (setup itself sets no
 * cookie; a cookie set here would make /setup 404 mid-wizard).
 */
export function SetupWizard() {
  const code = useSyncExternalStore(subscribeToHash, readHashCode, () => null);
  const [link, setLink] = useState<LinkState | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (code === null || code === "") return;
    let live = true;
    checkSetupLink(code)
      .then((status) => {
        if (live) setLink({ code, status });
      })
      .catch(() => {
        if (live) setLink({ code, status: "offline" });
      });
    return () => {
      live = false;
    };
  }, [code]);

  if (code === null) return null;
  const setupCode: string = code;

  const errorLine = error && (
    <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
      {error}
    </p>
  );

  // The success screen comes first: replaceState below empties the address
  // bar, so the hash no longer says "bad" for a link that just worked.
  if (created) {
    return (
      <div className="mt-6">
        <RecoveryCodeReveal
          title={SETUP_WORDS.codeTitle}
          intro={SETUP_WORDS.codeIntro}
          code={created.recoveryCode}
          warning={SETUP_WORDS.codeWarning}
          continueLabel={SETUP_WORDS.continue}
          pending={pending}
          onContinue={() =>
            startTransition(async () => {
              const form = new FormData();
              form.set("userId", created.userId);
              form.set("password", password);
              // On success `login` redirects, so nothing after it runs.
              const result = await login({}, form);
              if (result.error) setError(result.error);
            })
          }
        />
        {error && <div className="mt-4">{errorLine}</div>}
      </div>
    );
  }

  const status = code === "" ? "bad" : link?.code === code ? link.status : null;

  if (status === null) {
    return <p className="mt-6 text-center text-base text-muted">{SETUP_WORDS.checking}</p>;
  }
  if (status === "bad") {
    return (
      <div className="mt-6 text-center">
        <h2 className="text-xl font-bold">{SETUP_WORDS.badLinkTitle}</h2>
        <p className="mt-2 text-base text-muted">{SETUP_WORDS.badLinkBody}</p>
      </div>
    );
  }
  if (status === "offline") {
    return <p className="mt-6 text-center text-base text-muted">{SETUP_WORDS.linkCheckFailed}</p>;
  }
  if (status === "limited") {
    return <p className="mt-6 text-center text-base text-muted">{SETUP_WORDS.limited}</p>;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFamily({ code: setupCode, familyName, displayName, password, passwordAgain });
      if ("error" in result) {
        setError(result.error);
      } else if ("status" in result) {
        setLink({ code: setupCode, status: result.status });
      } else {
        setCreated(result);
        // The code is already in state; take it out of the address bar and history.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
  }

  if (step === 1) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (familyName.trim()) setStep(2);
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <Dots step={1} />
        <div>
          <h2 className="text-xl font-bold">{SETUP_WORDS.step1Title}</h2>
          <p className="mt-1 text-base text-muted">{SETUP_WORDS.step1Intro}</p>
        </div>
        <label className="block text-sm text-muted">
          <span className="mb-1 block">{SETUP_WORDS.familyLabel}</span>
          <input
            value={familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder={SETUP_WORDS.familyPlaceholder}
            maxLength={FAMILY_NAME_MAX}
            autoFocus
            className={FIELD}
          />
        </label>
        <button
          type="submit"
          disabled={!familyName.trim()}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {SETUP_WORDS.next}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="-ml-1 flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ChevronLeft aria-hidden="true" size={18} />
        {SETUP_WORDS.backToFamily}
      </button>
      <Dots step={2} />
      <div>
        <h2 className="text-xl font-bold">{SETUP_WORDS.step2Title}</h2>
        <p className="mt-1 text-base text-muted">{setupStep2Intro(familyName.trim())}</p>
      </div>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{SETUP_WORDS.nameLabel}</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder={SETUP_WORDS.namePlaceholder}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="name"
          required
          className={FIELD}
        />
      </label>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{SETUP_WORDS.passwordLabel}</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={FIELD}
        />
      </label>
      <label className="block text-sm text-muted">
        <span className="mb-1 block">{SETUP_WORDS.passwordAgainLabel}</span>
        <input
          type="password"
          value={passwordAgain}
          onChange={(event) => setPasswordAgain(event.target.value)}
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
        {pending ? SETUP_WORDS.creating : SETUP_WORDS.create}
      </button>
    </form>
  );
}
