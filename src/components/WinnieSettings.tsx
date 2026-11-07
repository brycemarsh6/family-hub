"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { sendWinnieTestEvent } from "@/app/actions/winnie";

/**
 * The admin-only "Winnie" section on /settings: one button that sends a test
 * event to Winnie's webhook. A one-shot send, so plain state rather than an
 * optimistic update. "Accepted" means Winnie's end said yes, not that the
 * message has shown up in her chat, and the line says so.
 */
export function WinnieSettings() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendTest() {
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await sendWinnieTestEvent();
      if (result.ok) {
        setMessage(
          `Winnie accepted the test (event ${result.eventId.slice(0, 4)}…). Check her chat to confirm it arrived.`,
        );
      } else {
        setError(result.error);
      }
    } catch {
      setError("Couldn't send the test. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Winnie</h2>

      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-base font-medium">Send a test message to Winnie</p>
        <p className="mt-1 text-sm text-muted">Shows in Winnie&apos;s chat between 9 AM and 9 PM.</p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={sendTest}
            disabled={sending}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
          >
            <Send size={20} aria-hidden="true" />
            {sending ? "Sending…" : "Send test to Winnie"}
          </button>
        </div>
        {message && (
          <p role="status" className="mt-2 text-sm text-muted">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-warn">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
