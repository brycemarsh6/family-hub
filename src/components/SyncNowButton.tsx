"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { pullGoogleEvents } from "@/app/actions/calendarPull";
import { PULL_WORDS, lastSyncedLine } from "@/lib/calendarSyncVocabulary";
import { feedbackTimeAgo } from "@/lib/feedbackTime";
import { useNowMinute } from "@/lib/useNowMinute";

// How long the note under the button stays.
const NOTE_MS = 4000;

/**
 * "Sync calendars now" on Synced calendars (mission 75): the forced pull the
 * Calendar's old Refresh circle made, with "Last synced ..." under it. The page
 * is for parents and admins already, and the action refuses anyone else's
 * forced pull. `lastSyncedAt` is the newest good pull among the "Both ways"
 * calendars; the page refreshes after the pull so it shows the new time.
 */
export function SyncNowButton({ lastSyncedAt }: { lastSyncedAt: Date | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);
  // Null on the server and the first paint, so "Last synced" never mismatches.
  const now = useNowMinute();

  // The note goes away on its own.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  function sync() {
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
    <div className="mb-4">
      <button
        type="button"
        onClick={sync}
        // Not `disabled`: that would dim the spinning icon. `pending` makes a second tap do nothing.
        aria-busy={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-base font-semibold text-fg transition-opacity active:opacity-80"
      >
        <RefreshCw aria-hidden="true" size={20} className={pending ? "animate-spin" : undefined} />
        {PULL_WORDS.syncNowLabel}
      </button>
      {note && !pending && (
        <p role="status" className={`mt-2 text-center text-sm ${note.failed ? "text-warn" : "text-muted-strong"}`}>
          {note.text}
        </p>
      )}
      {lastSyncedAt && now && (
        <p className="mt-2 text-center text-sm text-muted-strong">{lastSyncedLine(feedbackTimeAgo(lastSyncedAt, now))}</p>
      )}
    </div>
  );
}
