"use client";

import { Printer } from "lucide-react";

/** `print:hidden` — this button exists to trigger window.print(), so it has
 * no business showing up in the actual printout. Every platform's print
 * sheet offers "Save as PDF", which is what makes this one button also the
 * "Export PDF" destination. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
    >
      <Printer aria-hidden="true" size={18} />
      Print / Save as PDF
    </button>
  );
}
