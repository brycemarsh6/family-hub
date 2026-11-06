"use client";

import { useOptimistic, useState } from "react";
import { FeedbackDetailSheet } from "./FeedbackDetailSheet";
import { FeedbackRow } from "./FeedbackRow";
import { deleteFeedback, markFeedbackDone } from "@/app/actions/feedbackAdmin";
import type { FeedbackListItem } from "@/lib/feedbackRead";
import { SAVE_FAILED, useOptimisticRun } from "@/lib/useOptimisticRun";

type Change = { type: "toggle"; id: string };

// Marking done (or new again) moves a report to the other tab, so on this
// tab it simply leaves the list.
function applyChange(items: FeedbackListItem[], change: Change): FeedbackListItem[] {
  return items.filter((item) => item.id !== change.id);
}

/**
 * The admin list for one tab. Mark done / Mark new is a reversible flip, so
 * it is optimistic. Delete is a one-shot destructive verb, so it waits for
 * the server and the row leaves when the page refreshes (DESIGN.md).
 */
export function FeedbackList({
  items,
  status,
}: {
  items: FeedbackListItem[];
  status: "new" | "done";
}) {
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const { run, error } = useOptimisticRun<Change>(applyOptimistic);
  const [openId, setOpenId] = useState<string | null>(null);
  // One clock per render so every row's "time ago" agrees.
  const [now] = useState(() => new Date());

  const opened = items.find((item) => item.id === openId) ?? null;

  /** The actions return nothing; a thrown failure is caught by run(). */
  async function call(action: () => Promise<void>): Promise<{ error?: string }> {
    await action();
    return {};
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error === SAVE_FAILED ? error : "That didn't work. Try again."}
        </p>
      )}

      {optimisticItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          {status === "new" ? "No new feedback" : "Nothing marked done yet"}
        </p>
      ) : (
        <ul className="space-y-2">
          {optimisticItems.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              now={now}
              done={status === "done"}
              onOpen={() => setOpenId(item.id)}
              onToggleDone={() =>
                run({ type: "toggle", id: item.id }, () =>
                  call(() => markFeedbackDone(item.id, status === "new")),
                )
              }
              onDelete={() => run(null, () => call(() => deleteFeedback(item.id)))}
            />
          ))}
        </ul>
      )}

      {opened && <FeedbackDetailSheet item={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}
