"use client";

import type { ReactNode } from "react";
import { chipClass } from "./ParticipantPicker";
import { LIFE_AREAS } from "@/lib/goalVocabulary";
import { ANYTIME_LABEL, TIMES_OF_DAY, TIME_OF_DAY_LABELS, type TimeOfDay } from "@/lib/habitVocabulary";

const TIME_CHOICES: { key: TimeOfDay | null; label: string }[] = [
  { key: null, label: ANYTIME_LABEL },
  ...TIMES_OF_DAY.map((key) => ({ key, label: TIME_OF_DAY_LABELS[key] })),
];

/** A labelled form row with an optional line of small help under the label. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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
export function Segmented<T extends string>({
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
            value === option.key ? "bg-surface text-fg shadow-sm" : "text-muted-strong"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** "Time of day": Anytime plus the three parts of the day, one lit. */
export function TimeOfDayField({ value, onChange }: { value: TimeOfDay | null; onChange: (next: TimeOfDay | null) => void }) {
  return (
    <Field label="Time of day">
      <div role="group" aria-label="Time of day" className="flex flex-wrap gap-2">
        {TIME_CHOICES.map((choice) => (
          <button
            key={choice.label}
            type="button"
            aria-pressed={value === choice.key}
            onClick={() => onChange(choice.key)}
            className={chipClass(value === choice.key)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** "Life area": the six areas as chips; tapping the lit one clears it. */
export function LifeAreaField({
  value,
  hint,
  onChange,
}: {
  value: string | null;
  hint: string;
  onChange: (next: string | null) => void;
}) {
  return (
    <Field label="Life area" hint={hint}>
      <div role="group" aria-label="Life area" className="flex flex-wrap gap-2">
        {LIFE_AREAS.map((area) => (
          <button
            key={area.key}
            type="button"
            aria-pressed={value === area.key}
            onClick={() => onChange(value === area.key ? null : area.key)}
            className={chipClass(value === area.key)}
          >
            {area.short}
          </button>
        ))}
      </div>
    </Field>
  );
}
