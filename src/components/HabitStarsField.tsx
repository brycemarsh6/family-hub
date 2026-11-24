"use client";

import { Field } from "./HabitFormFields";
import { LadderStepper } from "./LadderStepper";
import { nextStarStep } from "@/lib/rewards/stars";
import { STARS_FIELD_HINT, STARS_FIELD_LABEL, STAR_STEPS, starStepText } from "@/lib/rewardVocabulary";

/** The "Stars" row on the habit form (parents and admins): a −/+ stepper from None up through the star values. */
export function HabitStarsField({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  return (
    <Field label={STARS_FIELD_LABEL} hint={STARS_FIELD_HINT}>
      <div>
        <LadderStepper
          label={STARS_FIELD_LABEL}
          shownText={starStepText(value)}
          atMin={value === null}
          atMax={value === STAR_STEPS[STAR_STEPS.length - 1]}
          onStep={(dir) => onChange(nextStarStep(value, dir === 1 ? "up" : "down"))}
        />
      </div>
    </Field>
  );
}
