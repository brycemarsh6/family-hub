"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { HabitIconPicker } from "./HabitIconPicker";
import { HabitScheduleField, type ScheduleValue } from "./HabitScheduleField";
import { ParticipantPicker, chipClass, type Person } from "./ParticipantPicker";
import { ToggleSwitch } from "./ToggleSwitch";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  restoreHabit,
  updateHabit,
  type HabitActionResult,
  type HabitInput,
} from "@/app/actions/habits";
import { LIFE_AREAS, toLifeArea } from "@/lib/goalVocabulary";
import {
  parseWeekdayMask,
  printWeekdayMask,
  toHabitSchedule,
  type HabitKind,
  type HabitMode,
  type TimeOfDay,
} from "@/lib/habitVocabulary";
import type { HabitManagerItem } from "@/lib/habitsRead";
import { formatCalendarDate } from "@/lib/householdDate";

const TIME_CHOICES: { key: TimeOfDay | null; label: string }[] = [
  { key: null, label: "Anytime" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

type Who = "me" | "together" | "each";

const WHO_HINTS: Record<Who, string> = {
  me: "One person: you",
  together: "Together: one check counts for both",
  each: "Side by side: everyone checks their own",
};

const BUTTON_PRIMARY =
  "flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-40";
const BUTTON_PLAIN =
  "flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-fg disabled:opacity-40";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** A two-or-three way strip inside a form (a form field, not navigation). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`min-h-11 flex-1 rounded-xl text-sm font-semibold transition-colors ${
            value === option.key ? "bg-surface text-fg shadow-sm" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function initialWho(initial: HabitManagerItem | undefined): Who {
  if (!initial || initial.participantIds.length <= 1) return "me";
  return initial.sharing === "together" ? "together" : "each";
}

/**
 * The New and Edit form for a habit or chore (one component, so the two pages
 * cannot drift). `initial` is the habit being edited; without it the form is
 * blank. Saving, archiving and deleting go through the habit actions and then
 * return to /habits/manage.
 */
export function HabitForm({
  people,
  viewerId,
  thisSunday,
  nextSunday,
  initial,
}: {
  people: Person[];
  viewerId: string;
  /** The Sunday that starts this household week, "YYYY-MM-DD". */
  thisSunday: string;
  nextSunday: string;
  initial?: HabitManagerItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? "habit");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [mode, setMode] = useState<HabitMode>(initial?.mode ?? "build");
  const [who, setWho] = useState<Who>(initialWho(initial));
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.participantIds ?? [viewerId]);
  const [everyone, setEveryone] = useState(initial?.everyone ?? false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(initial?.timeOfDay ?? null);
  const [lifeArea, setLifeArea] = useState<string | null>(initial ? toLifeArea(initial.lifeArea) : null);
  const [carryOver, setCarryOver] = useState(initial?.carryOver ?? false);
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [schedule, setSchedule] = useState<ScheduleValue>({
    schedule: toHabitSchedule(initial?.schedule),
    days: parseWeekdayMask(initial?.weekdays) ?? [],
    times: initial?.times ?? 1,
    anchorWeek: initial?.anchorWeek ? formatCalendarDate(initial.anchorWeek) : thisSunday,
  });

  const peopleCount = who === "me" ? 1 : selectedIds.length;
  const canCarry =
    schedule.schedule === "daily" ||
    schedule.schedule === "weekdays" ||
    (schedule.schedule === "biweekly" && schedule.days.length > 0);
  const canBePrivate = peopleCount === 1;

  function pickWho(next: Who) {
    setWho(next);
    if (next !== "me" && selectedIds.length === 0) setSelectedIds([viewerId]);
  }

  function toInput(): HabitInput {
    const s = schedule.schedule;
    const hasDays = s === "weekdays" || (s === "biweekly" && schedule.days.length > 0);
    return {
      title,
      kind,
      mode,
      icon,
      lifeArea,
      timeOfDay,
      schedule: s,
      weekdays: hasDays ? printWeekdayMask(schedule.days) : null,
      times: s === "weekly" || s === "monthly" ? schedule.times : null,
      anchorWeek: s === "biweekly" ? schedule.anchorWeek : null,
      carryOver: canCarry && carryOver,
      sharing: who === "together" ? "together" : "each",
      isPrivate: canBePrivate && isPrivate,
      participantIds: who === "me" ? [viewerId] : selectedIds,
      everyone: who !== "me" && everyone,
    };
  }

  function run(action: () => Promise<HabitActionResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
        else router.push("/habits/manage");
      } catch {
        setError("Couldn't save it. Try again.");
      }
    });
  }

  function save() {
    run(() => (initial ? updateHabit(initial.id, toInput()) : createHabit(toInput())));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-4"
    >
      <Segmented
        label="Kind of item"
        value={kind}
        options={[
          { key: "habit", label: "Habit" },
          { key: "chore", label: "Chore" },
        ]}
        onChange={setKind}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Name</span>
        <input
          type="text"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-12 rounded-xl border border-line bg-surface px-3.5 text-base text-fg"
        />
      </label>

      <Field label="Icon">
        <HabitIconPicker value={icon} kind={kind} onChange={setIcon} />
      </Field>

      <Field label="Kind" hint="Quit means a check is “I avoided it today”">
        <Segmented
          label="Build or quit"
          value={mode}
          options={[
            { key: "build", label: "Build" },
            { key: "quit", label: "Quit" },
          ]}
          onChange={setMode}
        />
      </Field>

      <Field label="Who" hint={WHO_HINTS[who]}>
        <Segmented
          label="Who it is for"
          value={who}
          options={[
            { key: "me", label: "Just me" },
            { key: "together", label: "Together" },
            { key: "each", label: "Side by side" },
          ]}
          onChange={pickWho}
        />
      </Field>

      {who !== "me" && (
        <ParticipantPicker
          people={people}
          selectedIds={selectedIds}
          everyone={everyone}
          onChange={(next) => {
            setSelectedIds(next.selectedIds);
            setEveryone(next.everyone);
          }}
        />
      )}

      <Field label="How often">
        <HabitScheduleField value={schedule} onChange={setSchedule} thisSunday={thisSunday} nextSunday={nextSunday} />
      </Field>

      <Field label="Time of day">
        <div role="group" aria-label="Time of day" className="flex flex-wrap gap-2">
          {TIME_CHOICES.map((choice) => (
            <button
              key={choice.label}
              type="button"
              aria-pressed={timeOfDay === choice.key}
              onClick={() => setTimeOfDay(choice.key)}
              className={chipClass(timeOfDay === choice.key)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Life area" hint="Optional">
        <div role="group" aria-label="Life area" className="flex flex-wrap gap-2">
          {LIFE_AREAS.map((area) => (
            <button
              key={area.key}
              type="button"
              aria-pressed={lifeArea === area.key}
              onClick={() => setLifeArea(lifeArea === area.key ? null : area.key)}
              className={chipClass(lifeArea === area.key)}
            >
              {area.short}
            </button>
          ))}
        </div>
      </Field>

      {canCarry && (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">Carry over if unfinished</span>
            <span className="text-[13px] text-muted">Shows once on the next day, counted as done late</span>
          </div>
          <ToggleSwitch checked={carryOver} onChange={setCarryOver} label="Carry over if unfinished" />
        </div>
      )}

      {canBePrivate && (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">Private</span>
            <span className="text-[13px] text-muted">
              Only you see it: not on the family tablet, other screens or nudges
            </span>
          </div>
          <ToggleSwitch checked={isPrivate} onChange={setIsPrivate} label="Private" />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
        Save
      </button>

      {initial && (
        <>
          <hr className="border-line" />
          {initial.archived ? (
            <button type="button" disabled={pending} onClick={() => run(() => restoreHabit(initial.id))} className={BUTTON_PLAIN}>
              <RotateCcw aria-hidden="true" size={16} />
              Restore
            </button>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => run(() => archiveHabit(initial.id))} className={BUTTON_PLAIN}>
                <Archive aria-hidden="true" size={16} />
                Archive
              </button>
              <span className="text-center text-[13px] text-muted">Archive keeps its history and can be brought back.</span>
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteHabit(initial.id))}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-danger px-4 text-sm font-semibold text-danger disabled:opacity-40"
          >
            <Trash2 aria-hidden="true" size={16} />
            Delete
          </button>
        </>
      )}
    </form>
  );
}
