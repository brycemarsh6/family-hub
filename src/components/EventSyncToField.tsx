import { ToggleSwitch } from "./ToggleSwitch";
import { EVENT_SYNC_WORDS, ownerLine } from "@/lib/calendarSyncVocabulary";
import type { SyncTarget } from "@/lib/linkedCalendarsRead";

/**
 * The "Sync to" field (mission 56): one tick row per Google calendar Marshee
 * may copy this event to, lifted out of EventForm.tsx like EventPeopleField.
 * Pure display; EventForm owns the ticked ids and the busy switch. Draws
 * nothing when there are no targets. "Show as busy on Google" appears only
 * for an all-day event with at least one calendar ticked, because a timed
 * event is always busy.
 */
export function EventSyncToField({
  targets,
  selectedIds,
  onToggle,
  allDay,
  showBusy,
  onBusyChange,
}: {
  targets: SyncTarget[];
  selectedIds: string[];
  onToggle: (calendarId: string) => void;
  allDay: boolean;
  showBusy: boolean;
  onBusyChange: (next: boolean) => void;
}) {
  if (targets.length === 0) return null;
  const showBusyRow = allDay && selectedIds.length > 0;
  return (
    <div className="text-sm text-muted">
      <p className="mb-1 flex items-baseline justify-between">
        <span>{EVENT_SYNC_WORDS.fieldLabel}</span>
        <span className="text-xs">{EVENT_SYNC_WORDS.fieldHint}</span>
      </p>
      <div className="flex flex-col gap-2">
        {targets.map((target) => (
          <label
            key={target.calendarId}
            className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-medium text-fg">{target.name}</span>
              {!target.isMine && <span className="text-xs text-muted-strong">{ownerLine(target.ownerName)}</span>}
            </span>
            <input
              type="checkbox"
              checked={selectedIds.includes(target.calendarId)}
              onChange={() => onToggle(target.calendarId)}
              className="h-6 w-6 shrink-0 accent-accent"
            />
          </label>
        ))}
        {showBusyRow && (
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2">
            <span className="text-base font-medium text-fg">{EVENT_SYNC_WORDS.busyLabel}</span>
            <ToggleSwitch checked={showBusy} onChange={onBusyChange} label={EVENT_SYNC_WORDS.busyLabel} />
          </div>
        )}
      </div>
    </div>
  );
}
