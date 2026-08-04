"use client";

import { useState, useTransition } from "react";
import { LogLeftoverSheet } from "./LogLeftoverSheet";
import { logLeftover } from "@/app/actions/pantry";

/**
 * The Expiring page's marquee action. Deliberately the most prominent button
 * on the page — leftovers getting forgotten and thrown away is the sharper
 * of the two problems this page exists to solve (see CLAUDE.md).
 */
export function LogLeftoverButton() {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function submit(input: { name: string; quantity: number; daysGood: number }) {
    setOpen(false);
    startTransition(async () => {
      await logLeftover(input);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 min-h-12 w-full rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
      >
        <span aria-hidden="true">🥡</span> Log leftovers
      </button>

      {open && (
        <LogLeftoverSheet onClose={() => setOpen(false)} onSave={submit} />
      )}
    </>
  );
}
