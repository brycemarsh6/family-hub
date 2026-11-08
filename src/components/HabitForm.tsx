"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, LifeAreaField, Segmented, TimeOfDayField } from "./HabitFormFields";
import { HabitEditActions } from "./HabitEditActions";
import { HabitIconPicker } from "./HabitIconPicker";
import { HoursFields, TrackField, initialWeeklyHours, initialWho, type HoursInitial } from "./HabitHoursFields";
import { IdeaChips } from "./IdeaChips";
import { HabitScheduleField, type ScheduleValue } from "./HabitScheduleField";
import { ParticipantPicker, type Person } from "./ParticipantPicker";
import { ToggleSwitch } from "./ToggleSwitch";
import { createHabit, updateHabit, type HabitActionResult } from "@/app/actions/habits";
import { FORM_COLUMN_CLASSES, FORM_EYEBROW_CLASSES, FORM_GRID_CLASSES, FORM_SAVE_WIDE_CLASSES } from "@/lib/gridClasses";
import type { HabitInput } from "@/lib/habitInput";
import { toLifeArea } from "@/lib/goalVocabulary";
import { toHabitTrack, toPaceDays, type HabitTrack, type PaceDays } from "@/lib/habitHoursVocabulary";
import {
  HABIT_TITLE_MAX,
  HABIT_WHO_CHOICES,
  SHARED_NEEDS_TWO_MESSAGE,
  canBePrivate as canBePrivateWith,
  canCarryOver,
  parseWeekdayMask,
  printWeekdayMask,
  toHabitSchedule,
  type HabitKind,
  type HabitMode,
  type HabitWho,
  type TimeOfDay,
} from "@/lib/habitVocabulary";
import {
  CHORE_IDEAS,
  CHORE_IDEAS_LABEL,
  HABIT_IDEAS,
  LIFE_AREA_HINT,
  LIFE_AREA_HINT_PICK,
  findHabitIdea,
  habitIdeasLabel,
} from "@/lib/habitIdeas";
import type { HabitManagerItem } from "@/lib/habitsRead";
import { sharedNeedsMorePeople } from "@/lib/habitsToday";
import { formatCalendarDate } from "@/lib/householdDate";

const BUTTON_PRIMARY =
  "flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-40";

/** The habit being edited; its Track fields come from the loader and are left out for a habit that never had them. */
type FormInitial = HabitManagerItem & HoursInitial;

/**
 * The New and Edit form for a habit or chore (one component, so the two pages
 * cannot drift). `initial` is the habit being edited; without it the form is
 * blank. The order is the same on both (decisions 176, 178): kind, name, chore
 * ideas (New only), life area, habit ideas (New only), icon, then the rest.
 * Saving goes through the habit actions and then returns to /habits/manage;
 * Archive and Delete live in HabitEditActions, under Save when editing.
 *
 * Layout: the fields are one DOM in two column divs. On a phone the columns
 * stack in the order above; from a 48rem container they sit side by side, the
 * left "What" (kind to icon) and the right "When and who" (the rest, then
 * Save). The form itself is the `@container` because it holds no sheet, so
 * the container rule (STRUCTURE.md rule 1) is kept.
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
  initial?: FormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? "habit");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [mode, setMode] = useState<HabitMode>(initial?.mode ?? "build");
  const [who, setWho] = useState<HabitWho>(initialWho(initial));
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.participantIds ?? [viewerId]);
  const [everyone, setEveryone] = useState(initial?.everyone ?? false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(initial?.timeOfDay ?? null);
  const [lifeArea, setLifeArea] = useState<string | null>(initial ? toLifeArea(initial.lifeArea) : null);
  const [carryOver, setCarryOver] = useState(initial?.carryOver ?? false);
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [track, setTrack] = useState<HabitTrack>(toHabitTrack(initial?.track));
  const [weeklyHours, setWeeklyHours] = useState(initialWeeklyHours(initial));
  const [paceDays, setPaceDays] = useState<PaceDays>(toPaceDays(initial?.paceDays));
  const [schedule, setSchedule] = useState<ScheduleValue>({
    schedule: toHabitSchedule(initial?.schedule),
    days: parseWeekdayMask(initial?.weekdays) ?? [],
    times: initial?.times ?? 1,
    anchorWeek: initial?.anchorWeek ? formatCalendarDate(initial.anchorWeek) : thisSunday,
  });

  const ideaArea = lifeArea ? toLifeArea(lifeArea) : null;
  const peopleCount = who === "me" ? 1 : selectedIds.length;
  const hours = track === "hours";
  const canCarry = !hours && canCarryOver(schedule.schedule, schedule.days);
  const canBePrivate = canBePrivateWith(peopleCount);

  function pickWho(next: HabitWho) {
    setWho(next);
    if (next !== "me" && selectedIds.length === 0) setSelectedIds([viewerId]);
    if (hours) setIsPrivate(next === "me"); // decision 194: Just me is private, Side by side is not
  }

  /** Hours is for habits, one person each (decisions 193, 194): Together becomes Side by side, and Just me turns Private on. */
  function pickTrack(next: HabitTrack) {
    setTrack(next);
    if (next !== "hours") return;
    if (who === "together") setWho("each");
    if (who === "me") setIsPrivate(true);
    if (who === "each") setIsPrivate(false);
  }

  function pickKind(next: HabitKind) {
    setKind(next);
    if (next === "chore") setTrack("checks");
  }

  function toInput(): HabitInput {
    const s = schedule.schedule;
    const hasDays = s === "weekdays" || (s === "biweekly" && schedule.days.length > 0);
    return {
      title,
      kind,
      mode: hours ? "build" : mode,
      icon,
      lifeArea,
      timeOfDay,
      schedule: s,
      weekdays: hasDays ? printWeekdayMask(schedule.days) : null,
      times: s === "weekly" || s === "monthly" ? schedule.times : null,
      anchorWeek: s === "biweekly" ? schedule.anchorWeek : null,
      carryOver: canCarry && carryOver,
      sharing: who === "together" && !hours ? "together" : "each",
      isPrivate: canBePrivate && isPrivate,
      participantIds: who === "me" ? [viewerId] : selectedIds,
      everyone: who !== "me" && everyone,
      track,
      weeklyHours: hours ? weeklyHours : null,
      paceDays: hours ? paceDays : null,
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

  /** One tap fills a whole idea: name, icon, how often, time of day, build or quit (decision 173). */
  function pickIdea(ideaTitle: string) {
    const idea = findHabitIdea(ideaTitle);
    if (!idea) return;
    setTitle(idea.title);
    setIcon(idea.icon);
    setMode(idea.mode);
    setTimeOfDay(idea.timeOfDay);
    setSchedule({ ...schedule, schedule: idea.schedule, days: [...idea.days], times: idea.times ?? schedule.times });
  }

  function save() {
    if (sharedNeedsMorePeople(who !== "me", peopleCount)) {
      setError(SHARED_NEEDS_TWO_MESSAGE);
      return;
    }
    setError(null);
    run(() => (initial ? updateHabit(initial.id, toInput()) : createHabit(toInput())));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="@container"
    >
      <div className={FORM_GRID_CLASSES}>
        <div className={FORM_COLUMN_CLASSES}>
          <p className={FORM_EYEBROW_CLASSES}>What</p>
          <Segmented
            label="Kind of item"
            value={kind}
            options={[
              { key: "habit", label: "Habit" },
              { key: "chore", label: "Chore" },
            ]}
            onChange={pickKind}
          />

          {kind === "habit" && <TrackField value={track} onChange={pickTrack} />}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Name</span>
            <input
              type="text"
              value={title}
              maxLength={HABIT_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-12 rounded-xl border border-line bg-surface px-3.5 text-base text-fg"
            />
          </label>

          {!initial && kind === "chore" && (
            <IdeaChips label={CHORE_IDEAS_LABEL} ideas={CHORE_IDEAS.map((idea) => idea.title)} onPick={pickIdea} />
          )}

          <LifeAreaField
            value={lifeArea}
            hint={initial || kind === "chore" || lifeArea ? LIFE_AREA_HINT : LIFE_AREA_HINT_PICK}
            onChange={setLifeArea}
          />

          {!initial && kind === "habit" && ideaArea && (
            <IdeaChips
              label={habitIdeasLabel(ideaArea)}
              ideas={HABIT_IDEAS[ideaArea].map((idea) => idea.title)}
              onPick={pickIdea}
            />
          )}

          <Field label="Icon">
            <HabitIconPicker value={icon} kind={kind} onChange={setIcon} />
          </Field>
        </div>

        <div className={FORM_COLUMN_CLASSES}>
          <p className={FORM_EYEBROW_CLASSES}>When and who</p>
          {!hours && (
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
          )}

          <Field label="Who" hint={HABIT_WHO_CHOICES.find((choice) => choice.key === who)?.hint}>
            <Segmented
              label="Who it is for"
              value={who}
              options={HABIT_WHO_CHOICES.filter(({ key }) => !hours || key !== "together").map(({ key, label }) => ({ key, label }))}
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

          {hours ? (
            <HoursFields hours={weeklyHours} paceDays={paceDays} onHours={setWeeklyHours} onPaceDays={setPaceDays} />
          ) : (
            <Field label="How often">
              <HabitScheduleField value={schedule} onChange={setSchedule} thisSunday={thisSunday} nextSunday={nextSunday} />
            </Field>
          )}

          <TimeOfDayField value={timeOfDay} onChange={setTimeOfDay} />

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

          <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} ${FORM_SAVE_WIDE_CLASSES}`}>
            Save
          </button>

          {initial && <HabitEditActions initial={initial} pending={pending} run={run} />}
        </div>
      </div>
    </form>
  );
}
