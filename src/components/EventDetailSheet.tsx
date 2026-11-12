"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, ChevronLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { deleteCalendarEvent, retryEventSync } from "@/app/actions/calendar";
import {
  copyFailedLine,
  copyRemoveFailedLine,
  EVENT_SYNC_WORDS,
  fromGoogleLine,
  onGoogleLine,
} from "@/lib/calendarSyncVocabulary";
import { formatAllDayLabel, formatTimeRange } from "@/lib/calendarDates";
import { formatDayLabel } from "@/lib/mealPlanDates";
import type { CalendarEventSyncView, CalendarEventView } from "@/lib/types";

/**
 * The house bottom sheet for one event, opened by tapping its card. One
 * sheet with an internal `view` state machine (main / menu) — the
 * TagSelectSheet/SlotEditSheet precedent — rather than a second modal
 * stacked on top for the ⋯ menu, which is what "never stack two sheets"
 * (this contract's own instruction) rules out.
 *
 * `day` is the SPECIFIC calendar day the tapped card was for (a multi-day
 * event gets one card per day, per DaySection/EventCard) — carried through
 * so the date line can show "Day N of 3" exactly like the card it was
 * opened from, per the plan's verification requirement.
 */
export function EventDetailSheet({
  event,
  day,
  createdByName,
  canManage,
  onClose,
  onDeleted,
}: {
  event: CalendarEventView;
  day: Date;
  /** Null when the creator was deactivated (SetNull) or the event predates
   * this field — "Added by" simply doesn't render then. */
  createdByName: string | null;
  canManage: boolean;
  onClose: () => void;
  /** Called after a successful delete — the parent closes this sheet and
   * refreshes the page's own data (there's no client-side event list to
   * splice locally; see CalendarViews' caller). */
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<"main" | "menu">("main");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // True after a delete whose Google copy could not be removed: the event is
  // gone from Marshee, so the sheet stays open to say so, and every way out
  // of it counts as "deleted" so the parent refreshes.
  const [copyLeft, setCopyLeft] = useState(false);
  const close = copyLeft ? onDeleted : onClose;
  // The list a Try again returned, tagged with the event it belongs to so it
  // can never show on another event.
  const [retried, setRetried] = useState<{ eventId: string; syncs: CalendarEventSyncView[] } | null>(null);
  // The calendar the event came from already says "From Google", so its "On Google" line
  // is left out (matched by Marshee's calendar row id, so two calendars sharing a name can't
  // hide each other's line). A failed copy always shows.
  const syncs = (retried?.eventId === event.id ? retried.syncs : event.syncs).filter(
    (sync) => !(sync.status === "ok" && sync.linkedCalendarId === event.sourceLinkedCalendarId),
  );

  useEffect(() => {
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key !== "Escape") return;
      if (view !== "main") setView("main");
      else close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, view]);

  const badge =
    formatAllDayLabel(event.startAt, event.endAt, event.allDay, day) ??
    formatTimeRange(event.startAt, event.endAt);
  const dateLine = `${formatDayLabel(day)}, ${badge}`;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCalendarEvent(event.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.googleCopyLeft) {
        setCopyLeft(true);
        return;
      }
      onDeleted();
    });
  }

  // The action hands back the fresh list so the open sheet shows the result;
  // the refresh reloads the page's own data.
  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryEventSync(event.id);
      if (result.error) setError(result.error);
      if (result.syncs) setRetried({ eventId: event.id, syncs: result.syncs });
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          {view === "menu" && !copyLeft ? (
            <button
              type="button"
              onClick={() => setView("main")}
              className="-ml-1 flex min-h-11 items-center gap-1 text-lg font-semibold"
            >
              <ChevronLeft aria-hidden="true" size={20} />
              {event.title}
            </button>
          ) : (
            <h2 className="min-w-0 break-words text-lg font-semibold">{event.title}</h2>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {view === "main" && canManage && !copyLeft && (
              <button
                type="button"
                onClick={() => setView("menu")}
                aria-label="More actions"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2"
              >
                <MoreVertical aria-hidden="true" size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
            >
              ×
            </button>
          </div>
        </div>

        {copyLeft ? (
          <div className="flex flex-col gap-4">
            <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
              {EVENT_SYNC_WORDS.deletedCopyLeft}
            </p>
            <button
              type="button"
              onClick={onDeleted}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
            >
              {EVENT_SYNC_WORDS.done}
            </button>
          </div>
        ) : view === "menu" ? (
          <div className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                {error}
              </p>
            )}
            {event.deleteBlockedMessage ? (
              <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                {event.deleteBlockedMessage}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={18} />
                {pending ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{dateLine}</p>

            {event.people.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {event.people.map((person) => (
                  <span
                    key={person.userId}
                    className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3"
                  >
                    <AvatarBadge
                      displayName={person.displayName}
                      avatarColor={person.avatarColor}
                      size={28}
                    />
                    <span className="text-sm font-medium">{person.displayName}</span>
                  </span>
                ))}
              </div>
            )}

            {canManage && event.sourceCalendarName && (
              <p className="mb-2 flex items-center gap-2 text-sm text-muted [overflow-wrap:anywhere]">
                <Calendar aria-hidden="true" size={16} className="shrink-0" />
                {fromGoogleLine(event.sourceCalendarName)}
              </p>
            )}

            {event.location && <p className="mb-3 text-base text-fg">{event.location}</p>}
            {event.notes && (
              <p className="mb-3 whitespace-pre-wrap text-sm text-muted">{event.notes}</p>
            )}
            {createdByName && (
              <p className="mb-4 text-xs text-muted">Added by {createdByName}</p>
            )}

            {canManage && syncs.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {error && (
                  <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                    {error}
                  </p>
                )}
                {syncs.map((sync, index) =>
                  sync.status === "ok" ? (
                    <p
                      key={`${sync.calendarName}-${index}`}
                      className="flex items-center gap-2 text-sm text-muted [overflow-wrap:anywhere]"
                    >
                      <Check aria-hidden="true" size={16} className="shrink-0 text-accent" />
                      {onGoogleLine(sync.calendarName)}
                    </p>
                  ) : (
                    <div key={`${sync.calendarName}-${index}`} className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                      <p className="[overflow-wrap:anywhere]">
                        {sync.failReason === "reconnect"
                          ? EVENT_SYNC_WORDS.reconnect
                          : sync.status === "removing"
                            ? copyRemoveFailedLine(sync.calendarName)
                            : copyFailedLine(sync.calendarName)}
                      </p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={pending}
                        className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4 text-base font-semibold text-fg transition-opacity active:opacity-80 disabled:opacity-50"
                      >
                        {pending ? EVENT_SYNC_WORDS.tryingAgain : EVENT_SYNC_WORDS.tryAgain}
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => router.push(`/calendar/${event.id}/edit`)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
              >
                <Pencil aria-hidden="true" size={18} />
                Edit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
