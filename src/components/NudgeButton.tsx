"use client";

import { useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { nudge } from "@/app/actions/habitNudges";

/**
 * The "Nudge" pill on the stats page (decision 97). One nudge per person,
 * habit and day is enforced on the server; after a tap, or when the page loads
 * with the nudge already sent, it reads "Nudged" with a check and stays off
 * (the server's day ends at Denver midnight, when the page reads it fresh).
 */
export function NudgeButton({
  habitId,
  toUserId,
  toName,
  alreadyNudged,
}: {
  habitId: string;
  toUserId: string;
  toName: string;
  alreadyNudged: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nudged = alreadyNudged || sent;

  function send() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await nudge(habitId, toUserId);
        if (result.error) setError(result.error);
        else setSent(true);
      } catch {
        setError("Couldn't send that. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={send}
        disabled={nudged || pending}
        aria-label={nudged ? `Nudged ${toName}` : `Nudge ${toName}`}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {nudged ? <Check aria-hidden="true" size={18} /> : <Bell aria-hidden="true" size={18} />}
        {nudged ? "Nudged" : "Nudge"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
