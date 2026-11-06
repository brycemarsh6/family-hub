"use client";

import { Check, Image as ImageIcon, RotateCcw, Trash2 } from "lucide-react";
import { SwipeActions } from "./SwipeActions";
import type { FeedbackListItem } from "@/lib/feedbackRead";

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function timeAgo(date: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
              {timeAgo(item.createdAt, now)}
            </span>
          </span>
          <span className="mt-1 line-clamp-2 block whitespace-pre-line text-base">{item.message}</span>
        </button>
      </SwipeActions>
    </li>
  );
}
