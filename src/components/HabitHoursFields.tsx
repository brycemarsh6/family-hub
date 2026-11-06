"use client";

import { Field, Segmented } from "./HabitFormFields";
import { QuantityStepper } from "./QuantityStepper";
import { HABIT_TRACKS, HOURS_LIMITS, PACE_DAYS, type HabitTrack, type PaceDays } from "@/lib/habitHoursVocabulary";

/**
 * What an editor needs to know about a habit's Track to start from it. A
 * habit that says nothing about its Track opens as Checks.
 */
export type HoursInitial = { track?: string; weeklyMinutes?: number | null; paceDays?: string | null };

const TRACK_LABELS: Record<HabitTrack, { label: string; hint: string }> = {
  checks: { label: "Checks", hint: "Tap once when done" },
  hours: { label: "Hours", hint: "Log time toward a weekly goal" },
};

const PACE_LABELS: Record<PaceDays, { label: string; hint: string }> = {
  monsat: { label: "Mon to Sat", hint: "Skip Sundays" },
  every: { label: "Every day", hint: "Sun to Sat" },
};

/** The starting whole hours for the stepper: the habit's own goal, else the default. */
export function initialWeeklyHours(initial: HoursInitial | undefined): number {
  const { targetMinHours, targetMaxHours, targetDefaultHours } = HOURS_LIMITS;
  const hours = initial?.weeklyMinutes ? Math.round(initial.weeklyMinutes / 60) : targetDefaultHours;
  return Math.min(Math.max(hours, targetMinHours), targetMaxHours);
}

/** "Track": Checks or Hours, one lit, with the words for the lit one under the label (decision 193). */
export function TrackField({ value, onChange }: { value: HabitTrack; onChange: (next: HabitTrack) => void }) {
  return (
    <Field label="Track" hint={TRACK_LABELS[value].hint}>
      <Segmented
        label="Track"
        value={value}
        options={HABIT_TRACKS.map((key) => ({ key, label: TRACK_LABELS[key].label }))}
        onChange={onChange}
      />
    </Field>
  );
}

/** "Hours a week" (whole hours, by tapping) and "Count days left as", shared by the habit form and the plan sheet. */
export function HoursFields({
  hours,
  paceDays,
  onHours,
  onPaceDays,
}: {
  hours: number;
  paceDays: PaceDays;
  onHours: (next: number) => void;
  onPaceDays: (next: PaceDays) => void;
}) {
  return (
    <>
      <Field label="Hours a week">
        <div className="self-start">
          <QuantityStepper
            value={hours}
            unit={hours === 1 ? "hour" : "hours"}
            min={HOURS_LIMITS.targetMinHours}
            max={HOURS_LIMITS.targetMaxHours}
            onChange={onHours}
            label="Hours a week"
          />
        </div>
      </Field>
      <Field label="Count days left as" hint={PACE_LABELS[paceDays].hint}>
        <Segmented
          label="Count days left as"
          value={paceDays}
          options={PACE_DAYS.map((key) => ({ key, label: PACE_LABELS[key].label }))}
          onChange={onPaceDays}
        />
      </Field>
    </>
  );
}
