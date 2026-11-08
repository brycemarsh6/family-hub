"use client";

import { useOptimistic, useRef, useState } from "react";
import { EmptyState } from "./EmptyState";
import { FeedbackDetailBody } from "./FeedbackDetailBody";
import { FeedbackDetailSheet } from "./FeedbackDetailSheet";
import { FeedbackRow } from "./FeedbackRow";
import { deleteFeedback, markFeedbackDone } from "@/app/actions/feedbackAdmin";
import type { FeedbackListItem } from "@/lib/feedbackRead";
import { useHamburgerRowHeight } from "@/lib/appChrome";
import { COLUMN_MIN_WIDTH_PX } from "@/lib/splitColumns";
import { useContainerWidth } from "@/lib/useContainerWidth";
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
 *
 * Layout comes from the measured width of the wrapper (the Meal plan's
 * pattern): from the 3-column width the list sits left and the open report in
 * a panel on the right; narrower, a report opens as a sheet as before.
 */
export function FeedbackList({
  items,
  status,
  now,
}: {
  items: FeedbackListItem[];
  status: "new" | "done";
  /** One clock from the server page, so server and browser print the same words. */
  now: Date;
}) {
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const { run, error } = useOptimisticRun<Change>(applyOptimistic);
  const [openId, setOpenId] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const wide = useContainerWidth(wrapRef) >= COLUMN_MIN_WIDTH_PX[3];
  const panelTop = useHamburgerRowHeight() + 8;

  // From optimisticItems, so a swipe that moves the open report empties the panel at once.
  const opened = optimisticItems.find((item) => item.id === openId) ?? null;

  /** The actions return nothing; a thrown failure is caught by run(). */
  async function call(action: () => Promise<void>): Promise<{ error?: string }> {
    await action();
    return {};
  }

  return (
    <>
      <div
        ref={wrapRef}
        className={wide && optimisticItems.length > 0 ? "grid grid-cols-[30rem_minmax(0,1fr)] items-start gap-x-8" : undefined}
      >
        <div>
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {error === SAVE_FAILED ? error : "That didn't work. Try again."}
            </p>
          )}

          {optimisticItems.length === 0 ? (
            <EmptyState
              emoji={status === "new" ? "💬" : "📭"}
              title={status === "new" ? "No new feedback" : "Nothing marked done yet"}
              hint={status === "new" ? "Reports from Send feedback show up here." : "Reports you mark done move here."}
            />
          ) : (
            <ul className={wide ? "space-y-2" : "max-w-[48rem] space-y-2" /* below the panel width the rows keep the old 768px page width */}>
              {optimisticItems.map((item) => (
                <FeedbackRow
                  key={item.id}
                  item={item}
                  now={now}
                  done={status === "done"}
                  selected={wide && item.id === openId}
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
        </div>

        {wide && optimisticItems.length > 0 && (
          // Sticky under the menu button so it stays in view while a long list scrolls; never taller than the screen below it, scrolling inside itself.
          <aside
            key={opened?.id ?? "empty"}
            className="sticky overflow-y-auto rounded-2xl border border-line bg-surface p-4"
            style={{ top: panelTop, maxHeight: `calc(100dvh - ${panelTop + 16}px)` }}
          >
            {opened ? (
              <FeedbackDetailBody item={opened} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">Tap a report to read it here.</p>
            )}
          </aside>
        )}
      </div>

      {!wide && opened && <FeedbackDetailSheet item={opened} onClose={() => setOpenId(null)} />}
    </>
  );
}
