"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { pullGoogleEvents } from "@/app/actions/calendarPull";
import { PULL_WORDS, relinkLine } from "@/lib/calendarSyncVocabulary";
import { AUTO_PULL_EVERY_MS, shouldTimerPull, shouldTouchPull } from "@/lib/autoPullRules";

// The pull side of the Calendar screen (mission 60, made automatic in
// mission 75): the pulls that need no button and the reconnect banner.
// CalendarViews is not touched, so the page wraps it in `CalendarPullProvider`
// and the header reads the same context. The server decides what is pulled and
// how often (a lease per calendar); this file only asks, and the pure rules in
// autoPullRules.ts decide when.

type PullContext = { relinkEmails: string[] };

const CalendarPullContext = createContext<PullContext>({ relinkEmails: [] });

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

/**
 * Wraps the Calendar page: pulls on open, when the app comes back to the
 * front, every few minutes while visible, and (Tablet only) on a touch after
 * a long quiet spell. All unforced, one at a time, and the page refreshes
 * only when something changed. Listeners and the timer go on unmount, and the
 * timer is stopped while the page is hidden.
 */
export function CalendarPullProvider({
  isTablet,
  relinkEmails,
  children,
}: PullContext & { isTablet: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    let lastTouchAt = Date.now();
    let timer: ReturnType<typeof setInterval> | null = null;

    function pull() {
      // A pull is already out: a second would only queue behind the server's lease.
      if (inFlight.current) return;
      inFlight.current = true;
      void pullGoogleEvents(false)
        .then((result) => {
          if (result.changed) router.refresh();
        })
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    }

    function stopTimer() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(() => {
        if (shouldTimerPull({ hidden: document.hidden, isTablet, lastTouchAt, now: Date.now() })) pull();
      }, AUTO_PULL_EVERY_MS);
    }

    function onVisibility() {
      if (document.hidden) {
        stopTimer();
        return;
      }
      pull();
      startTimer();
    }

    function onTouch() {
      const now = Date.now();
      if (shouldTouchPull({ isTablet, lastTouchAt, now })) pull();
      lastTouchAt = now;
    }

    pull();
    if (!document.hidden) startTimer();
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onTouch);
    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onTouch);
    };
  }, [isTablet, router]);

  return <CalendarPullContext value={{ relinkEmails }}>{children}</CalendarPullContext>;
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
