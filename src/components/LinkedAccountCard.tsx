"use client";

import { useOptimistic, useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { RadioSheet } from "@/components/RadioSheet";
import { TitleSheet } from "@/components/TitleSheet";
import { renameLinkedAccount, setCalendarDirection, unlinkAccount } from "@/app/actions/linkedCalendars";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { useNowMinute } from "@/lib/useNowMinute";
import { feedbackTimeAgo } from "@/lib/feedbackTime";
import {
  SYNCED_CALENDARS_EXTRA_WORDS,
  SYNCED_CALENDARS_WORDS,
  SYNC_DIRECTIONS,
  SYNC_DIRECTION_HINTS,
  SYNC_DIRECTION_LABELS,
  alreadySyncedThrough,
  calendarsSummary,
  isReadOnlyRole,
  lastCheckedLine,
  linkedByLine,
  relinkLine,
  type SyncDirection,
} from "@/lib/calendarSyncVocabulary";
import type { SyncedAccountRow } from "@/lib/linkedCalendarsRead";

type DirectionChange = { calendarId: string; direction: SyncDirection };

// The actions answer { ok: true } or { error }; useOptimisticRun reads only error.
async function errorOnly(result: Promise<{ ok: true } | { error: string }>): Promise<{ error?: string }> {
  const settled = await result;
  return "error" in settled ? settled : {};
}

/**
 * One linked Google account: a collapsed summary that opens to its calendars.
 * Only the person who linked it sees the direction chevrons, Rename and Unlink
 * (the server re-checks every one of them). A direction change shows at once
 * and rolls back with a message if the save fails; Unlink waits for the
 * server, since it can't be undone, and has its own run so a direction change
 * never dims it. The direction hints show in the picker sheet.
 */
export function LinkedAccountCard({ account, viewerId }: { account: SyncedAccountRow; viewerId: string }) {
  const isOwner = account.userId === viewerId;
  const [open, setOpen] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  // Null on the server and the first paint, so "Last checked" never mismatches.
  const now = useNowMinute();

  const [directions, setDirection] = useOptimistic(
    Object.fromEntries(account.calendars.map((calendar) => [calendar.id, calendar.direction])) as Record<
      string,
      SyncDirection
    >,
    (current, change: DirectionChange) => ({ ...current, [change.calendarId]: change.direction }),
  );
  const directionRun = useOptimisticRun<DirectionChange>(setDirection);
  const renameRun = useOptimisticRun<never>(() => {});
  const unlinkRun = useOptimisticRun<never>(() => {});

  const setToSync = account.calendars.filter((calendar) => directions[calendar.id] !== "off").length;
  const picking = account.calendars.find((calendar) => calendar.id === pickingId) ?? null;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-left transition-colors active:bg-surface-2"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium">{account.email}</span>
          <span className="text-sm text-muted-strong">{linkedByLine(account.linkerName, account.label)}</span>
          <span className="text-sm text-muted-strong">{calendarsSummary(account.calendars.length, setToSync)}</span>
        </span>
        {open ? (
          <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted" />
        ) : (
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        )}
      </button>

      {account.status === "needs-relink" && (
        <div className="border-t border-line bg-warn-soft px-4 py-3 text-sm font-medium text-warn [overflow-wrap:anywhere]">
          <p className="flex items-start gap-2">
            <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            {relinkLine(account.email)}
          </p>
          {isOwner && <p className="mt-1 pl-[26px]">{SYNCED_CALENDARS_EXTRA_WORDS.reconnectNextStep}</p>}
        </div>
      )}

      {open && (
        <div className="border-t border-line">
          {account.calendars.map((calendar) => {
            const direction = directions[calendar.id] ?? calendar.direction;
            // Google lets Marshee write only to calendars the person owns.
            const readOnly = isReadOnlyRole(calendar.accessRole);
            // Another link already syncs this Google calendar: no control, only the words.
            const lockedBy = direction === "off" ? calendar.syncedThrough : null;
            const content = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base">{calendar.name}</span>
                  {direction === "twoWay" && calendar.lastPulledOkAt && now && (
                    <span className="text-sm text-muted-strong">
                      {lastCheckedLine(feedbackTimeAgo(calendar.lastPulledOkAt, now))}
                    </span>
                  )}
                  {lockedBy && (
                    <span className="text-sm text-muted-strong [overflow-wrap:anywhere]">
                      {alreadySyncedThrough(lockedBy)}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-strong">
                  {readOnly ? SYNCED_CALENDARS_EXTRA_WORDS.readOnly : SYNC_DIRECTION_LABELS[direction]}
                  {isOwner && !readOnly && !lockedBy && <ChevronRight aria-hidden="true" size={18} />}
                </span>
              </>
            );
            const rowClass = "flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left";
            return isOwner && !readOnly && !lockedBy ? (
              <button
                key={calendar.id}
                type="button"
                onClick={() => setPickingId(calendar.id)}
                className={`${rowClass} transition-colors active:bg-surface-2`}
              >
                {content}
              </button>
            ) : (
              <div key={calendar.id} className={rowClass}>
                {content}
              </div>
            );
          })}

          {isOwner ? (
            <div className="flex flex-col border-t border-line">
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="flex min-h-14 w-full items-center px-4 text-left text-base font-medium transition-colors active:bg-surface-2"
              >
                {SYNCED_CALENDARS_EXTRA_WORDS.renameButton}
              </button>
              <button
                type="button"
                disabled={unlinkRun.pending}
                onClick={() => unlinkRun.run(null, () => errorOnly(unlinkAccount(account.id)))}
                className="flex min-h-14 w-full items-center rounded-b-xl px-4 text-left text-base font-medium text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                {SYNCED_CALENDARS_WORDS.unlinkButton}
              </button>
            </div>
          ) : (
            <p className="border-t border-line px-4 py-3 text-sm text-muted">
              {SYNCED_CALENDARS_WORDS.notYours(account.linkerName)}
            </p>
          )}

          {(directionRun.error ?? unlinkRun.error) && (
            <p role="alert" className="px-4 pb-3 text-sm text-warn">
              {directionRun.error ?? unlinkRun.error}
            </p>
          )}
        </div>
      )}

      {picking && (
        <RadioSheet
          title={`${picking.name}: ${SYNCED_CALENDARS_EXTRA_WORDS.directionSheetTitle}`}
          options={SYNC_DIRECTIONS.map((value) => ({ value, label: SYNC_DIRECTION_LABELS[value],
            hint: SYNC_DIRECTION_HINTS[value],
          }))}
          selected={directions[picking.id] ?? picking.direction}
          onSelect={(next) =>
            directionRun.run({ calendarId: picking.id, direction: next }, () =>
              errorOnly(setCalendarDirection(picking.id, next)),
            )
          }
          onClose={() => setPickingId(null)}
        />
      )}

      {renaming && (
        <TitleSheet
          heading={SYNCED_CALENDARS_EXTRA_WORDS.renameHeading}
          initialValue={account.label ?? ""}
          placeholder={account.email}
          submitLabel={SYNCED_CALENDARS_EXTRA_WORDS.renameSave}
          pending={renameRun.pending}
          error={renameRun.error}
          onSubmit={(label) =>
            renameRun.run(null, () => errorOnly(renameLinkedAccount(account.id, label)), () => setRenaming(false))
          }
          onClose={() => {
            renameRun.setError(null);
            setRenaming(false);
          }}
        />
      )}
    </section>
  );
}
