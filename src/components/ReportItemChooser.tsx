"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import { RadioSheet } from "./RadioSheet";
import type { ReportItem } from "@/lib/habitsReportScope";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

/** The Year view's "Which item?" button (decision 168): a 48px button showing the item drawn, opening the sheet. A pick goes to that item's address. */
export function ReportItemChooser({ choices, chosenId }: { choices: (ReportItem & { href: string })[]; chosenId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const chosen = choices.find((choice) => choice.id === chosenId) ?? choices[0];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mb-3 flex min-h-12 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <HabitIcon name={chosen.icon} kind={chosen.kind} size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{chosen.title}</span>
        <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted" />
      </button>
      {open && (
        <RadioSheet
          title={REPORT_LABELS.whichItem}
          options={choices.map((choice) => ({
            value: choice.id,
            label: choice.title,
            leading: <HabitIcon name={choice.icon} kind={choice.kind} size={20} />,
          }))}
          selected={chosen.id}
          onSelect={(id) => router.push(choices.find((choice) => choice.id === id)!.href)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
