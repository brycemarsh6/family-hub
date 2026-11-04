"use client";

import { useEffect, useRef, useState } from "react";
import { GOAL_OWNERSHIP_LABELS, lifeAreaInfo, type LifeArea, type VisionHorizon } from "@/lib/goalVocabulary";
import { VISION_TEXT_MAX } from "@/lib/visions";

/**
 * Write, change or clear one vision statement. Save and Clear both hand the
 * new text up (empty means clear); the board owns the optimistic update and
 * closes the sheet once the server says yes. If it says no, the sheet stays
 * open with the draft and shows `error` here.
 */
export function VisionSheet({
  area,
  horizon,
  together,
  initialText,
  prompt,
  pending,
  error,
  onAnotherPrompt,
  onSave,
  onClose,
}: {
  area: LifeArea;
  horizon: VisionHorizon;
  together: boolean;
  initialText: string;
  prompt: string;
  pending: boolean;
  error: string | null;
  onAnotherPrompt: () => void;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [clearing, setClearing] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus goes into the sheet and comes back to the card that opened it. A touch screen would throw its
  // keyboard over the prompt, so the field only takes focus with a mouse or pen; otherwise the dialog does.
  useEffect(() => {
    const opener = document.activeElement;
    if (window.matchMedia("(pointer: coarse)").matches) dialog.current?.focus();
    else field.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  const heading = `${lifeAreaInfo(area).label} in ${horizon} years`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl outline-none bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="text-sm text-muted">
              {together ? GOAL_OWNERSHIP_LABELS.together : "Yours"} · everyone can see this
            </p>
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

        <p className="mb-3 text-sm italic text-muted-strong">{prompt}</p>

        <label className="block text-sm text-muted">
          <span className="sr-only">Your vision</span>
          <textarea
            ref={field}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={VISION_TEXT_MAX}
            rows={5}
            className="min-h-32 w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-fg outline-none placeholder:text-muted"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-warn">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              setClearing(false);
              onSave(text);
            }}
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending && !clearing ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onAnotherPrompt}
            className="min-h-11 w-full rounded-xl text-sm font-medium text-muted-strong transition-colors active:bg-surface-2"
          >
            Another prompt
          </button>
          {initialText !== "" && (
            <button
              type="button"
              onClick={() => {
                setClearing(true);
                onSave("");
              }}
              disabled={pending}
              className="min-h-12 w-full rounded-xl text-base font-semibold text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              {pending && clearing ? "Clearing…" : "Clear this vision"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
