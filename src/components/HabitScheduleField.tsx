"use client";

import { QuantityStepper } from "./QuantityStepper";
import { chipClass } from "./ParticipantPicker";
import {
  HABIT_SCHEDULES,
  HABIT_SCHEDULE_LABELS,
  HABIT_TIMES_LIMITS,
  type HabitSchedule,
  type Weekday,
} from "@/lib/habitVocabulary";
import { FULL_DAY_NAMES, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";

export type ScheduleValue = {
  schedule: HabitSchedule;
  days: Weekday[];
  times: number;
  /** A Sunday as "YYYY-MM-DD"; only used by Every other week. */
  anchorWeek: string;
};

/**
 * "How often": the five schedules as a radio list, with the choice's own
 * control opening under it: a -/+ for the number of times, the weekday row for
 * Certain days and Every other week, which week it starts for Every other
 * week. The caller owns the state and passes the two Sundays it can offer.
 */
export function HabitScheduleField({
  value,
  onChange,
  thisSunday,
  nextSunday,
}: {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
  thisSunday: string;
  nextSunday: string;
}) {
  const { schedule } = value;

  function pick(next: HabitSchedule) {
    const times = next === "weekly" ? Math.min(value.times, HABIT_TIMES_LIMITS.weekly) : value.times;
    onChange({ ...value, schedule: next, times });
  }

  function toggleDay(day: Weekday) {
    const days = value.days.includes(day) ? value.days.filter((other) => other !== day) : [...value.days, day];
    onChange({ ...value, days });
  }

  // An older start week stays on offer so saving does not move it.
  const anchorChoices = [
    { date: thisSunday, label: "This week" },
    { date: nextSunday, label: "Next week" },
    ...(value.anchorWeek !== thisSunday && value.anchorWeek !== nextSunday
      ? [{ date: value.anchorWeek, label: "Keep its weeks" }]
      : []),
  ];

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-2" role="radiogroup" aria-label="How often">
      {HABIT_SCHEDULES.map((option) => {
        const selected = schedule === option;
        return (
          <div key={option}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(option)}
              className="flex min-h-12 w-full items-center gap-3 px-1 text-left text-base font-medium"
            >
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-accent">
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
              </span>
              <span className="flex-1">{HABIT_SCHEDULE_LABELS[option]}</span>
            </button>

            {selected && (option === "weekly" || option === "monthly") && (
              <div className="flex items-center gap-3 pb-2 pl-9">
                <QuantityStepper
                  value={value.times}
                  min={1}
                  max={HABIT_TIMES_LIMITS[option]}
                  onChange={(times) => onChange({ ...value, times })}
                  label={`times a ${option === "weekly" ? "week" : "month"}`}
                  unit={`${value.times === 1 ? "time" : "times"} a ${option === "weekly" ? "week" : "month"}`}
                />
              </div>
            )}

            {selected && (option === "weekdays" || option === "biweekly") && (
              <div className="pb-2 pl-0 sm:pl-9">
                {option === "biweekly" && <p className="mb-1 text-sm text-muted">Pick days (optional)</p>}
                <div role="group" aria-label="Days" className="flex gap-1">
                  {FULL_DAY_NAMES.map((name, index) => {
                    const day = index as Weekday;
                    const on = value.days.includes(day);
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={on}
                        aria-label={name}
                        title={SHORT_DAY_NAMES[index]}
                        onClick={() => toggleDay(day)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                          on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-fg"
                        }`}
                      >
                        {name[0]}
                      </button>
                    );
                  })}
                </div>
                {option === "biweekly" && (
                  <div role="group" aria-label="Which week it starts" className="mt-2 flex flex-wrap gap-2">
                    {anchorChoices.map((choice) => (
                      <button
                        key={choice.date}
                        type="button"
                        aria-pressed={value.anchorWeek === choice.date}
                        onClick={() => onChange({ ...value, anchorWeek: choice.date })}
                        className={chipClass(value.anchorWeek === choice.date)}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
