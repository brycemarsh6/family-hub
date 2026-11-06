"use client";

import { useEffect, useRef } from "react";
import { describeDevice } from "@/lib/feedback";
import { feedbackTimeLabel } from "@/lib/feedbackTime";
import type { FeedbackListItem } from "@/lib/feedbackRead";

/** One report in full: message, page, device, time and the screenshot. */
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

  const device = item.userAgent ? describeDevice(item.userAgent, item.viewport ?? "") : null;

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
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{item.authorName}</h2>
            <p className="text-sm text-muted">
              {feedbackTimeLabel(item.createdAt)}
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

        <p className="whitespace-pre-wrap break-words text-base">{item.message}</p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Page</dt>
          <dd className="min-w-0 break-words">{item.pagePath}</dd>
          {device && (
            <>
              <dt className="text-muted">Device</dt>
              <dd>{device}</dd>
            </>
          )}
        </dl>

        {item.hasScreenshot && (
          <div className="mt-4">
            <p className="mb-1 text-sm text-muted">Screenshot</p>
            {/* A plain img: the route is admin-only and never cached, so the
                image optimizer (which would fetch it without the cookie) does
                not fit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/feedback/${item.id}/screenshot`}
              alt={`Screenshot of ${item.pagePath} from ${item.authorName}`}
              className="w-full rounded-xl border border-line"
            />
          </div>
        )}
      </div>
    </div>
  );
}
