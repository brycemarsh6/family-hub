"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IdeaChips } from "./IdeaChips";
import { ToggleSwitch } from "./ToggleSwitch";
import {
  GOAL_TITLE_MAX,
  GOAL_WHY_MAX,
  MEASURE_UNIT_MAX,
  earlierDate,
  isPrivateGoal,
} from "@/lib/goals";
import { parseTypedNumber, targetDateChips } from "@/lib/goalsProgress";
import { GOAL_IDEAS } from "@/lib/goalPrompts";
import {
  GOAL_OWNERSHIPS,
  GOAL_OWNERSHIP_LABELS,
  LIFE_AREAS,
  lifeAreaInfo,
  type GoalOwnership,
  type GoalVisibility,
  type LifeArea,
} from "@/lib/goalVocabulary";
import { formatCalendarDate, parseDateParam, type CalendarDate } from "@/lib/householdDate";
import { createGoal, updateGoal } from "@/app/actions/goals";

/** The form's fields as the inputs hold them: text, not numbers, until submit. */
export type GoalFormValues = {
  title: string;
  area: LifeArea | null;
  ownership: GoalOwnership;
  visibility: GoalVisibility;
  why: string;
  /** "YYYY-MM-DD", or "" when none is picked. */
  targetDate: string;
  measure: { unit: string; start: string; target: string } | null;
};

const EMPTY_VALUES: GoalFormValues = {
  title: "",
  area: null,
  ownership: "mine",
  visibility: "shared",
  why: "",
  targetDate: "",
  measure: null,
};

const CHIP_CLASSES = "flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors";
const CHIP_ON = "border-accent bg-accent text-accent-fg";
const CHIP_OFF = "border-line bg-surface text-muted";
const INPUT_CLASSES = "min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none placeholder:text-muted";

/**
 * One form for both New and Edit goal. Sends the server a plain object (with
 * real numbers, not strings) and lets the action do the checking. In edit
 * mode "Mine" / "Together" is shown but can't change: Mine always means the
 * person who made it.
 */
export function GoalForm(
  props:
    | { mode: "create"; today: CalendarDate }
    | { mode: "edit"; goalId: string; initial: GoalFormValues; today: CalendarDate },
) {
  const router = useRouter();
  const { today } = props;
  const isEdit = props.mode === "edit";
  const [values, setValues] = useState<GoalFormValues>(props.mode === "edit" ? props.initial : EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setOwnership(ownership: GoalOwnership) {
    // Only a Mine goal can be private, so Together goes back to shared.
    setValues((current) => ({
      ...current,
      ownership,
      visibility: ownership === "mine" ? current.visibility : "shared",
    }));
  }

  function setMeasureField(field: "unit" | "start" | "target", text: string) {
    setValues((current) => ({
      ...current,
      measure: current.measure && { ...current.measure, [field]: text },
    }));
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const { measure } = values;
    const raw = {
      title: values.title,
      area: values.area,
      ownership: values.ownership,
      visibility: values.visibility,
      why: values.why,
      targetDate: values.targetDate,
      measure: measure
        ? { unit: measure.unit, start: parseTypedNumber(measure.start), target: parseTypedNumber(measure.target) }
        : null,
    };
    setError(null);
    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateGoal(props.goalId, raw);
        if (result.error) return setError(result.error);
        router.replace("/plans/goals/" + props.goalId);
        return;
      }
      const result = await createGoal(raw);
      if (result.error || !result.id) return setError(result.error ?? "That goal didn't save. Try again.");
      router.push("/plans/goals/" + result.id);
    });
  }

  // An overdue goal keeps its own date when saved, so the earliest allowed is
  // the earlier of today and the date it already has.
  const initialDate = props.mode === "edit" ? parseDateParam(props.initial.targetDate) : null;
  const earliest = initialDate ? earlierDate(today, initialDate) : today;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <input
          type="text"
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          maxLength={GOAL_TITLE_MAX}
          autoComplete="off"
          autoFocus={!isEdit}
          className={INPUT_CLASSES}
        />
      </Field>

      {!isEdit && values.area && (
        <IdeaChips
          label={`Ideas for ${lifeAreaInfo(values.area).short}`}
          ideas={GOAL_IDEAS[values.area]}
          onPick={(idea) => set("title", idea)}
        />
      )}

      <Field label="Life area" group>
        <div className="flex flex-wrap gap-2">
          {LIFE_AREAS.map(({ key, short, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => set("area", key)}
              aria-pressed={values.area === key}
              className={`${CHIP_CLASSES} ${values.area === key ? CHIP_ON : CHIP_OFF}`}
            >
              <Icon aria-hidden="true" size={16} />
              {short}
            </button>
          ))}
        </div>
      </Field>

      <Field label="For" group>
        {isEdit ? (
          <p className="text-base text-fg">{GOAL_OWNERSHIP_LABELS[values.ownership]}</p>
        ) : (
          <div className="flex gap-2">
            {GOAL_OWNERSHIPS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setOwnership(option)}
                aria-pressed={values.ownership === option}
                className={`${CHIP_CLASSES} ${values.ownership === option ? CHIP_ON : CHIP_OFF}`}
              >
                {GOAL_OWNERSHIP_LABELS[option]}
              </button>
            ))}
          </div>
        )}
      </Field>

      {values.ownership === "mine" && (!isEdit || props.initial.ownership === "mine") && (
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface-2 pl-4 pr-1">
          <div>
            <p className="text-base font-medium text-fg">Keep private</p>
            <p className="text-sm text-muted-strong">Only you can see this goal</p>
          </div>
          <ToggleSwitch
            checked={isPrivateGoal(values)}
            onChange={(next) => set("visibility", next ? "private" : "shared")}
            label="Keep private"
          />
        </div>
      )}

      <Field label="Target date" group>
        <div className="mb-2 flex flex-wrap gap-2">
          {targetDateChips(today).map(({ label, date }) => {
            const text = formatCalendarDate(date);
            return (
              <button
                key={label}
                type="button"
                onClick={() => set("targetDate", text)}
                aria-pressed={values.targetDate === text}
                className={`${CHIP_CLASSES} ${values.targetDate === text ? CHIP_ON : CHIP_OFF}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input
          type="date"
          value={values.targetDate}
          min={formatCalendarDate(earliest)}
          onChange={(event) => set("targetDate", event.target.value)}
          aria-label="Target date"
          className={INPUT_CLASSES}
        />
      </Field>

      <Field label="Why (optional)">
        <textarea
          value={values.why}
          onChange={(event) => set("why", event.target.value)}
          maxLength={GOAL_WHY_MAX}
          placeholder="Why does this matter to you?"
          className="min-h-24 w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base text-fg outline-none placeholder:text-muted"
        />
      </Field>

      <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface-2 pl-4 pr-1">
        <p className="text-base font-medium text-fg">Track a number</p>
        <ToggleSwitch
          checked={values.measure !== null}
          onChange={(next) => set("measure", next ? { unit: "", start: "", target: "" } : null)}
          label="Track a number"
        />
      </div>

      {values.measure && (
        <div className="flex flex-col gap-4">
          <Field label="Unit">
            <input
              type="text"
              value={values.measure.unit}
              onChange={(event) => setMeasureField("unit", event.target.value)}
              maxLength={MEASURE_UNIT_MAX}
              placeholder="lb, $, pages"
              autoComplete="off"
              className={INPUT_CLASSES}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting at">
              <input
                type="text"
                inputMode="decimal"
                value={values.measure.start}
                onChange={(event) => setMeasureField("start", event.target.value)}
                autoComplete="off"
                className={INPUT_CLASSES}
              />
            </Field>
            <Field label="Target">
              <input
                type="text"
                inputMode="decimal"
                value={values.measure.target}
                onChange={(event) => setMeasureField("target", event.target.value)}
                autoComplete="off"
                className={INPUT_CLASSES}
              />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : isEdit ? "Save" : "Add goal"}
      </button>
    </form>
  );
}

/** A labelled field. `group` is for chips and other buttons, where a wrapping <label> would forward taps to the first button. */
function Field({ label, group = false, children }: { label: string; group?: boolean; children: React.ReactNode }) {
  if (group) {
    return (
      <div role="group" aria-label={label} className="text-sm text-muted">
        <span className="mb-2 block">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <label className="block text-sm text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
