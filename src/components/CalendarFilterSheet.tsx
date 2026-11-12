"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { MARSHEE_CALENDAR_KEY, isCalendarShown, isPersonShown, type CalendarFilter } from "@/lib/calendarFilter";
import { CALENDAR_FILTER_LABELS } from "@/lib/calendarViewVocabulary";
import type { CalendarFilterAccountView, CalendarPersonView } from "@/lib/types";

const GROUP_LABEL = "mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted";
const ROW = "flex min-h-12 w-full items-center gap-3 border-b border-line py-1 text-left text-base";

/** A real checkbox row (role and aria-checked on a button); ticked = shown. */
function CheckRow({
  label,
  shown,
  onToggle,
  lead,
  indent = false,
}: {
  label: string;
  shown: boolean;
  onToggle: () => void;
  lead?: React.ReactNode;
  indent?: boolean;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={shown} onClick={onToggle} className={`${ROW} ${indent ? "pl-5" : ""}`}>
      {lead}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
          shown ? "border-accent bg-accent text-accent-fg" : "border-muted text-transparent"
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </span>
    </button>
  );
}

/**
 * The Calendar's Filter sheet (mission 78): People and Calendars checkboxes,
 * ticked = shown. Each tap applies at once (the calendar behind it updates),
 * so there is no save step. Same frame as `HabitFilterSheet` (a bottom sheet,
 * centred from `md`, Escape or the backdrop closes). Rules:
 * docs/structure/calendar-filter.md. Render it outside any container.
 */
export function CalendarFilterSheet({
  people,
  accounts,
  filter,
  count,
  onTogglePerson,
  onToggleCalendar,
  onShowAll,
  onClose,
}: {
  /** Active people only, in roster order. */
  people: CalendarPersonView[];
  accounts: CalendarFilterAccountView[];
  filter: CalendarFilter;
  /** Hidden people and calendars; "Show all" is off when it is 0. */
  count: number;
  onTogglePerson: (userId: string) => void;
  onToggleCalendar: (key: string) => void;
  onShowAll: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={CALENDAR_FILTER_LABELS.title}
        className="relative flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{CALENDAR_FILTER_LABELS.title}</h2>
          <button
            type="button"
            onClick={onShowAll}
            disabled={count === 0}
            className="flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-accent disabled:opacity-40"
          >
            {CALENDAR_FILTER_LABELS.showAll}
          </button>
        </div>

        {people.length > 0 && (
          <section>
            <h3 className={GROUP_LABEL}>{CALENDAR_FILTER_LABELS.people}</h3>
            {people.map((person) => (
              <CheckRow
                key={person.userId}
                label={person.displayName}
                shown={isPersonShown(filter, person.userId)}
                onToggle={() => onTogglePerson(person.userId)}
                lead={<AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={28} />}
              />
            ))}
          </section>
        )}

        <section>
          <h3 className={GROUP_LABEL}>{CALENDAR_FILTER_LABELS.calendars}</h3>
          <CheckRow
            label={CALENDAR_FILTER_LABELS.marshee}
            shown={isCalendarShown(filter, MARSHEE_CALENDAR_KEY)}
            onToggle={() => onToggleCalendar(MARSHEE_CALENDAR_KEY)}
          />
          {accounts.map((account) => (
            <div key={account.accountId}>
              <p className="pt-3 text-sm font-semibold">{account.label}</p>
              {account.calendars.map((calendar) => (
                <CheckRow
                  key={calendar.id}
                  label={calendar.name}
                  shown={isCalendarShown(filter, calendar.id)}
                  onToggle={() => onToggleCalendar(calendar.id)}
                  indent
                />
              ))}
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-fg"
        >
          {CALENDAR_FILTER_LABELS.done}
        </button>
      </div>
    </div>
  );
}
