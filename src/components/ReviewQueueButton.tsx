"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import {
  IrregularityReviewSheet,
  type ReviewEntry,
} from "./IrregularityReviewSheet";
import {
  dismissIrregularity,
  fileParkedItem,
  getReviewQueue,
  mergePantryItems,
} from "@/app/actions/irregularities";
import type { ReviewQueue } from "@/lib/duplicates";

/**
 * The pulsing "needs a look" button in the Inventory header, and the
 * review sheet behind it.
 *
 * Deliberately not a nav tab: the nav bar reaches branch roots only,
 * which is a settled rule, and this is inventory hygiene so it belongs
 * on Inventory. It renders nothing at all when the queue is empty —
 * an always-present icon showing zero is exactly the kind of permanent
 * low-grade noise that gets tuned out.
 *
 * The initial count comes from the server render; every action re-reads
 * the queue rather than mutating a local copy, so the badge and the
 * sheet can never drift apart from what the detectors actually say.
 */
export function ReviewQueueButton({ initial }: { initial: ReviewQueue }) {
  const [queue, setQueue] = useState<ReviewQueue>(initial);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [submitting, startTransition] = useTransition();

  const entries: ReviewEntry[] = [
    ...queue.pairs.map((pair) => ({ type: "pair" as const, pair })),
    ...queue.parked.map((parked) => ({ type: "parked" as const, parked })),
  ];

  /** After any decision: re-read, and keep the sheet pointed at the next
   * unresolved thing. Resolving an entry removes it from the list, so
   * the same index is already "the next one" — clamped, since resolving
   * the last entry would otherwise point past the end. */
  function afterAction() {
    startTransition(async () => {
      const next = await getReviewQueue();
      setQueue(next);
      const remaining = next.pairs.length + next.parked.length;
      if (remaining === 0) {
        setOpen(false);
        setIndex(0);
      } else {
        setIndex((current) => Math.min(current, remaining - 1));
      }
    });
  }

  if (queue.total === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        aria-label={`Review ${queue.total} inventory ${queue.total === 1 ? "item" : "items"} that need a look`}
        className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-warn bg-warn-soft px-4 text-sm font-semibold text-warn transition-opacity active:opacity-80"
      >
        <AlertCircle aria-hidden="true" size={16} className="animate-pulse" />
        {queue.total} to review
      </button>

      {open && entries.length > 0 && (
        <IrregularityReviewSheet
          entries={entries}
          index={Math.min(index, entries.length - 1)}
          submitting={submitting}
          onClose={() => setOpen(false)}
          onSkip={() => setIndex((current) => Math.min(current + 1, entries.length - 1))}
          onMerge={(survivorId, mergedId, fingerprint) =>
            startTransition(async () => {
              await mergePantryItems({ survivorId, mergedId, fingerprint });
              afterAction();
            })
          }
          onDismiss={(kind, fingerprint) =>
            startTransition(async () => {
              await dismissIrregularity(kind, fingerprint);
              afterAction();
            })
          }
          onFile={(itemId, patch) =>
            startTransition(async () => {
              await fileParkedItem({ itemId, ...patch });
              afterAction();
            })
          }
        />
      )}
    </>
  );
}
