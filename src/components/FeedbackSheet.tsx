"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Check, Send } from "lucide-react";
import { sendFeedback } from "@/app/actions/feedback";
import { captureScreenshot } from "@/lib/captureScreenshot";
import { MESSAGE_MAX, normalizeMessage } from "@/lib/feedback";

const CLOSE_AFTER_SENT_MS = 1200;

/**
 * "Send feedback": a sheet over whatever page the person is on. The picture
 * of the page is started the moment the sheet opens, so it shows the page and
 * not the sheet; Send waits for it (the capture gives up on its own after
 * 4 seconds) and a failed picture is dropped; the success state then says
 * "Sent, no screenshot". After a
 * successful send the button area says "Sent" and the sheet closes itself.
 */
export function FeedbackSheet({
  open,
  pagePath,
  onClose,
}: {
  open: boolean;
  pagePath: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return <FeedbackDialog pagePath={pagePath} onClose={onClose} />;
}

// Mounted fresh on every open, so the draft, the tick box and any error start clean.
function FeedbackDialog({ pagePath, onClose }: { pagePath: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [includeShot, setIncludeShot] = useState(true);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentWithoutShot, setSentWithoutShot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const shot = useRef<Promise<string | null> | null>(null);

  // Start the page picture before the sheet is painted over it.
  useEffect(() => {
    shot.current = captureScreenshot();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus goes into the sheet and back to what opened it. A touch screen would
  // throw its keyboard up at once, so only a mouse or pen focuses the field.
  useEffect(() => {
    const opener = document.activeElement;
    if (window.matchMedia("(pointer: coarse)").matches) dialog.current?.focus();
    else field.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(onClose, CLOSE_AFTER_SENT_MS);
    return () => clearTimeout(timer);
  }, [sent, onClose]);

  async function send() {
    if (pending || sent) return;
    const checked = normalizeMessage(message);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const screenshot = includeShot && shot.current ? await shot.current : null;
      const result = await sendFeedback({
        message,
        pagePath,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        touch: navigator.maxTouchPoints > 0,
        screenshot,
      });
      if (result.ok) {
        setSentWithoutShot(includeShot && !screenshot);
        setSent(true);
      }
      else setError(result.error);
    } catch {
      setError("Couldn't reach the server. Check your connection, then tap Send again.");
    }
    setPending(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg outline-none md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Send feedback</h2>
            <p className="text-sm text-muted">Share bugs, ideas, or feedback.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <label className="block">
          <span className="sr-only">Your feedback</span>
          <textarea
            ref={field}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setError(null);
            }}
            maxLength={MESSAGE_MAX}
            rows={5}
            placeholder="What's on your mind?"
            className="min-h-32 w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-fg outline-none placeholder:text-muted"
          />
        </label>
        <div className="mt-1 flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={16} aria-hidden="true" />
            Sent to admin only
          </span>
          <span>
            {message.length} / {MESSAGE_MAX}
          </span>
        </div>

        <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
          <input
            type="checkbox"
            checked={includeShot}
            onChange={(event) => setIncludeShot(event.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-accent"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-base font-medium text-fg">
              <Camera size={18} aria-hidden="true" />
              Include screenshot of this page
            </span>
            <span className="block text-sm text-muted">
              Helps admin see what you&apos;re seeing. Shared with admin only.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-warn">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl text-base font-medium text-muted-strong transition-colors active:bg-surface-2"
          >
            Cancel
          </button>
          {sent ? (
            <div
              role="status"
              className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-soft text-base font-semibold ${
                sentWithoutShot ? "text-muted" : "text-fg"
              }`}
            >
              <Check size={18} aria-hidden="true" />
              {sentWithoutShot ? "Sent, no screenshot" : "Sent"}
            </div>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
            >
              <Send size={18} aria-hidden="true" />
              {pending ? "Sending…" : "Send"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
