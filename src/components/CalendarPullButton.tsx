"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { pullGoogleEvents } from "@/app/actions/calendarPull";
import { PULL_WORDS, relinkLine } from "@/lib/calendarSyncVocabulary";

// The pull side of the Calendar screen (mission 60): the on-open pull, the
// Refresh circle beside the + button, and the reconnect banner. CalendarViews
// is not touched, so the page wraps it in `CalendarPullProvider` and the
// header reads the same context. The server decides what is pulled and how
// often (a lease per calendar); this file only asks.

// How long the note under Refresh stays.
const NOTE_MS = 4000;

type PullContext = { showRefresh: boolean; relinkEmails: string[] };

const CalendarPullContext = createContext<PullContext>({ showRefresh: false, relinkEmails: [] });

/**
 * Asks for a pull once when the component mounts, for any login, and
 * refreshes the page's data only when something changed. A failed or empty
 * pull is silent: the Calendar already shows what Marshee has.
 */
export function useOpenPull() {
  const router = useRouter();
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void pullGoogleEvents(false)
      .then((result) => {
        if (result.changed) router.refresh();
      })
      .catch(() => {});
  }, [router]);
}

/** Wraps the Calendar page: runs the on-open pull and hands the header what it needs. */
export function CalendarPullProvider({
  showRefresh,
  relinkEmails,
  children,
}: PullContext & { children: React.ReactNode }) {
  useOpenPull();
  return <CalendarPullContext value={{ showRefresh, relinkEmails }}>{children}</CalendarPullContext>;
}

/** The round Refresh button; draws nothing unless the page said to show it. */
export function CalendarPullButton() {
  const { showRefresh } = useContext(CalendarPullContext);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);

  // The note goes away on its own, so it never sits over the month-jump control.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  if (!showRefresh) return null;

  function refresh() {
    // Not `disabled` on the circle: that would dim the spinning icon.
    if (pending) return;
    setNote(null);
    startTransition(async () => {
      try {
        const result = await pullGoogleEvents(true);
        // A failed run can still have saved some events, so the page refreshes either way.
        router.refresh();
        // "Up to date" only after a real check: a run that skipped every calendar says nothing.
        if (result.failed > 0) setNote({ text: PULL_WORDS.unreachable, failed: true });
        else if (result.checked > 0) setNote({ text: PULL_WORDS.upToDate, failed: false });
      } catch {
        router.refresh();
        setNote({ text: PULL_WORDS.unreachable, failed: true });
      }
    });
  }

  return (
    <div className="relative">
      <ActionCircle
        icon={<RefreshCw aria-hidden="true" size={20} className={pending ? "animate-spin" : undefined} />}
        label={PULL_WORDS.refreshLabel}
        onClick={refresh}
        size="sm"
      />
      {note && !pending && (
        <p
          role="status"
          className={`pointer-events-none absolute right-0 top-full z-30 mt-1 w-max max-w-[16rem] rounded-xl px-3 py-2 text-sm shadow-lg ${
            note.failed ? "bg-warn-soft text-warn" : "bg-surface-2 text-fg"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}

/** The warning banner for each of the viewer's linked accounts Google has locked out. */
export function CalendarRelinkBanner() {
  const { relinkEmails } = useContext(CalendarPullContext);
  if (relinkEmails.length === 0) return null;
  return (
    <div className="mb-4 flex flex-col gap-2">
      {relinkEmails.map((email) => (
        <div key={email} className="rounded-xl bg-warn-soft px-4 py-3 text-warn">
          <p className="flex items-start gap-2 text-sm font-medium [overflow-wrap:anywhere]">
            <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            {relinkLine(email)}
          </p>
          <Link
            href="/settings/calendars"
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-surface px-4 text-base font-semibold text-fg transition-opacity active:opacity-80 md:inline-flex md:w-auto"
          >
            {PULL_WORDS.fixLink}
          </Link>
        </div>
      ))}
    </div>
  );
}
