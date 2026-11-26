"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { dismissSetupChecklistAction } from "@/app/actions/setupChecklist";
import { ProgressBar } from "@/components/ProgressBar";
import type { ChecklistItem } from "@/lib/setupChecklist";
import { CHECKLIST_WORDS, checklistCount } from "@/lib/welcomeVocabulary";

const RING = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2";

/**
 * The "Finish setting up" card pinned above the dashboard's widgets, for a new
 * family's admin. The rows tick themselves (the server decides `done`); a row
 * that is done is struck through and no longer a link. "Hide this", and
 * "Done" once the required rows are ticked, both hide it for the whole family
 * through the same action; the card goes away at once and comes back only if
 * the save fails.
 */
export function SetupChecklistCard({
  items,
  allRequiredDone,
}: {
  items: ChecklistItem[];
  allRequiredDone: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;

  function hide() {
    setHidden(true);
    startTransition(async () => {
      try {
        await dismissSetupChecklistAction();
      } catch {
        setHidden(false);
      }
    });
  }

  if (allRequiredDone) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-base font-bold">{CHECKLIST_WORDS.allSetTitle}</h2>
        <p className="mt-1.5 text-sm text-muted">{CHECKLIST_WORDS.allSetBody}</p>
        <button
          type="button"
          onClick={hide}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          {CHECKLIST_WORDS.done}
        </button>
      </section>
    );
  }

  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="@container rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">{CHECKLIST_WORDS.title}</h2>
        <span className="text-sm text-muted">{checklistCount(doneCount, items.length)}</span>
      </div>
      <div className="mt-2">
        <ProgressBar fraction={doneCount / items.length} label={CHECKLIST_WORDS.title} />
      </div>

      <ul className="mt-2 grid grid-cols-1 @min-[45rem]:grid-cols-2 @min-[45rem]:gap-x-6">
        {items.map((item) => {
          const optional = item.optional && (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
              {CHECKLIST_WORDS.optional}
            </span>
          );
          return (
            <li key={item.id} className="border-t border-line first:border-t-0 @min-[45rem]:[&:nth-child(2)]:border-t-0">
              {item.done ? (
                <div className="flex min-h-14 items-center gap-3">
                  <span className={`${RING} border-accent bg-accent text-accent-fg`}>
                    <Check aria-hidden="true" size={14} strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-base text-muted line-through">{item.label}</span>
                </div>
              ) : (
                <Link href={item.href} className="flex min-h-14 items-center gap-3 active:bg-surface-2">
                  <span aria-hidden="true" className={`${RING} border-line`} />
                  <span className="flex-1 text-base">{item.label}</span>
                  {optional}
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={hide}
        className="mt-1 flex min-h-12 w-full items-center justify-center text-sm font-semibold text-accent underline"
      >
        {CHECKLIST_WORDS.hide}
      </button>
    </section>
  );
}
