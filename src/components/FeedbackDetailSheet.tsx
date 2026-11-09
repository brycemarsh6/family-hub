"use client";

import { useEffect, useRef } from "react";
import { FeedbackDetailBody } from "./FeedbackDetailBody";
import type { FeedbackListItem } from "@/lib/feedbackRead";

/** One report in full, as a sheet (the body is shared with the wide panel). */
export function FeedbackDetailSheet({
  item,
  onClose,
}: {
  item: FeedbackListItem;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus goes into the sheet and comes back to the row that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Feedback from ${item.authorName}`}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg outline-none md:max-w-lg md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <FeedbackDetailBody item={item} onClose={onClose} />
      </div>
    </div>
  );
}
