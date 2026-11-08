"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Users, User } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitFilterChips, type HabitFilterOption } from "./HabitFilterChips";
import { ToggleSwitch } from "./ToggleSwitch";
import { HABITS_VIEW_LABELS, HABIT_FILTER_LABELS } from "@/lib/habitVocabulary";

export type FilterPerson = { id: string; displayName: string; avatarColor: string };

const GROUP_LABEL = "mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * The Filter sheet (mission 53, decision 261): Show (Mine / Whole family, links
 * that keep the day), Time of day, the Together only switch, and People (Whole
 * family only). It narrows what both views show and changes nothing saved.
 * The frame is `RadioSheet`'s (a bottom sheet, centred from `md`, Escape or the
 * backdrop closes); it holds several kinds of control, so it is not a
 * `RadioSheet`. Render it outside any container.
 */
export function HabitFilterSheet({
  family,
  showViews,
  mineHref,
  familyHref,
  timeOptions,
  timeValue,
  onTime,
  togetherOnly,
  onTogetherOnly,
  people,
  hiddenPeople,
  onTogglePerson,
  onClose,
}: {
  family: boolean;
  /** False on the wall tablet: it has no Mine view to switch to. */
  showViews: boolean;
  mineHref: string;
  familyHref: string;
  /** All plus the times of day present; hidden when there is only All. */
  timeOptions: HabitFilterOption[];
  timeValue: string;
  onTime: (key: string) => void;
  togetherOnly: boolean;
  onTogetherOnly: (on: boolean) => void;
  /** Whole family only. */
  people: FilterPerson[];
  hiddenPeople: string[];
  onTogglePerson: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const views = [
    { key: "mine", label: HABITS_VIEW_LABELS.mine, href: mineHref, icon: User, on: !family },
    { key: "family", label: HABITS_VIEW_LABELS.family, href: familyHref, icon: Users, on: family },
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={HABIT_FILTER_LABELS.title}
        className="relative flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{HABIT_FILTER_LABELS.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2">
            ×
          </button>
        </div>

        {showViews && (
          <section>
            <h3 className={GROUP_LABEL}>{HABIT_FILTER_LABELS.show}</h3>
            <div className="flex gap-2">
              {views.map(({ key, label, href, icon: Icon, on }) => (
                <Link
                  key={key}
                  href={href}
                  replace
                  scroll={false}
                  onClick={onClose}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                    on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
                  }`}
                >
                  <Icon aria-hidden="true" size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {timeOptions.length > 1 && (
          <section>
            <h3 className={GROUP_LABEL}>{HABIT_FILTER_LABELS.timeOfDay}</h3>
            <HabitFilterChips options={timeOptions} value={timeValue} onChange={onTime} className="" />
          </section>
        )}

        <section className="flex items-center justify-between gap-3">
          <h3 className="text-base font-medium">{HABIT_FILTER_LABELS.togetherOnly}</h3>
          <ToggleSwitch checked={togetherOnly} onChange={onTogetherOnly} label={HABIT_FILTER_LABELS.togetherOnly} />
        </section>

        {family && people.length > 0 && (
          <section>
            <h3 className={GROUP_LABEL}>{HABIT_FILTER_LABELS.people}</h3>
            <div className="flex flex-wrap gap-2">
              {people.map((person) => {
                const shown = !hiddenPeople.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onTogglePerson(person.id)}
                    aria-pressed={shown}
                    className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 text-sm font-medium transition-colors ${
                      shown ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
                    }`}
                  >
                    <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={28} />
                    {person.displayName}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
