"use client";

import { Check, Image as ImageIcon, RotateCcw, Trash2 } from "lucide-react";
import { SwipeActions } from "./SwipeActions";
import { feedbackTimeAgo } from "@/lib/feedbackTime";
import type { FeedbackListItem } from "@/lib/feedbackRead";

export function FeedbackRow({
  item,
  now,
  done,
  onOpen,
  onToggleDone,
  onDelete,
}: {
  item: FeedbackListItem;
  now: Date;
  /** True on the Done tab: the first swipe action then reads "Mark new". */
  done: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface">
      {/* Mark done / Mark new first, Delete last (furthest from the row). */}
      <SwipeActions
        actions={[
          {
            label: done ? "Mark new" : "Mark done",
            accessibleLabel: `${done ? "Mark new" : "Mark done"}: feedback from ${item.authorName}`,
            icon: done ? <RotateCcw aria-hidden="true" size={18} /> : <Check aria-hidden="true" size={18} />,
            onAction: onToggleDone,
            tone: "neutral",
          },
          {
            label: "Delete",
            accessibleLabel: `Delete feedback from ${item.authorName}`,
            icon: <Trash2 aria-hidden="true" size={18} />,
            onAction: onDelete,
            tone: "danger",
          },
        ]}
      >
        <button
          type="button"
          onClick={onOpen}
          className="block min-h-14 w-full rounded-xl px-4 py-3 text-left transition-colors active:bg-surface-2"
        >
          <span className="flex items-center justify-between gap-3 text-sm text-muted">
            <span className="min-w-0 truncate">
              <span className="font-semibold text-fg">{item.authorName}</span> · {item.pagePath}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {item.hasScreenshot && <ImageIcon aria-label="Has a screenshot" size={16} />}
              {feedbackTimeAgo(item.createdAt, now)}
            </span>
          </span>
          <span className="mt-1 line-clamp-2 block whitespace-pre-line text-base">{item.message}</span>
        </button>
      </SwipeActions>
    </li>
  );
}
