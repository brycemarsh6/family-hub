"use client";

import { useEffect, useRef, useState } from "react";
import { lifeAreaInfo, type LifeArea, type VisionHorizon } from "@/lib/goalVocabulary";
import { VISION_TEXT_MAX } from "@/lib/visions";

/**
 * Write, change or clear one vision statement. Save and Clear both hand the
 * new text up (empty means clear) and the board closes the sheet; the board
 * owns the optimistic update and the error line.
 */
export function VisionSheet({
  area,
  horizon,
  together,
  initialText,
  prompt,
  pending,
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
  onAnotherPrompt: () => void;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // A touch screen would throw its keyboard over the prompt, so only focus with a mouse or pen.
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) field.current?.focus();
  }, []);

  const heading = `${lifeAreaInfo(area).label} in ${horizon} years`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="text-sm text-muted">
              {together ? "Together" : "Yours"} · everyone can see this
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

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => onSave(text)}
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
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
              onClick={() => onSave("")}
              disabled={pending}
              className="min-h-12 w-full rounded-xl text-base font-semibold text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              Clear this vision
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
