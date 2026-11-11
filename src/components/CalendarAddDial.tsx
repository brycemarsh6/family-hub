"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks } from "lucide-react";
import { FloatingAddButton } from "./FloatingAddButton";

/**
 * The Calendar's + (mission 68): tap it and the page dims, a Task and an
 * Event bubble pop up right above it, and the + turns into an X. A bubble
 * opens that form for the anchored day; the X, the dim page and Escape close
 * it. Replaces the old Add sheet (a bottom sheet is a long reach for a thumb
 * already on the + in the corner).
 *
 * `dateParam` is `?date=...` for the day the Calendar is pointed at, or "".
 * Event sits nearest the X (the thumb) because it is the one used most.
 *
 * Open, the dim is a real button over the whole page (z-[60], the house
 * sheet level, so it also covers the top bar and menu button). The + itself
 * and the bubbles sit one step above it (z-[61]). The pop-in is a CSS
 * transition from `starting:`; globals.css shortens every transition to
 * nothing under reduce motion, so no second fallback is needed here.
 */
export function CalendarAddDial({ dateParam }: { dateParam: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const plusRef = useRef<HTMLButtonElement>(null);
  const firstBubbleRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    plusRef.current?.focus();
  }

  function go(path: string) {
    setOpen(false);
    router.push(`${path}${dateParam}`);
  }

  useEffect(() => {
    if (!open) return;
    firstBubbleRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        plusRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const pill =
    "flex min-h-12 items-center gap-2 rounded-full bg-surface pr-5 pl-4 font-semibold text-fg shadow-lg transition active:opacity-80";

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <div
            className="pointer-events-none fixed right-0 z-[61] flex w-full justify-end px-4"
            style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
          >
            <div
              role="menu"
              aria-label="Add"
              className="pointer-events-auto flex flex-col items-end gap-3 transition duration-150 starting:translate-y-2 starting:opacity-0"
            >
              <button
                ref={firstBubbleRef}
                type="button"
                role="menuitem"
                onClick={() => go("/calendar/new/task")}
                className={pill}
              >
                <ListChecks aria-hidden="true" size={18} className="text-accent" />
                Task
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => go("/calendar/new")}
                className={pill}
              >
                <CalendarDays aria-hidden="true" size={18} className="text-accent" />
                Event
              </button>
            </div>
          </div>
        </>
      )}
      <FloatingAddButton
        placement="right"
        label={open ? "Close" : "Add"}
        expanded={open}
        buttonRef={plusRef}
        onClick={() => (open ? close() : setOpen(true))}
      />
    </>
  );
}
