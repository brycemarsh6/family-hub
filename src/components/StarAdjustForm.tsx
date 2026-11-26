"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { LadderStepper } from "./LadderStepper";
import { giveOrTakeStars } from "@/app/actions/starAdjustments";
import type { HouseholdPerson } from "@/lib/householdPeople";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { ADJUST_DEFAULT_STARS, nextAdjustStep, type AdjustDirection } from "@/lib/rewards/starAdjustments";
import {
  ADJUST_AMOUNT_LABEL,
  ADJUST_DIRECTION_LABEL,
  ADJUST_GIVE_LABEL,
  ADJUST_NOTE_LABEL,
  ADJUST_NOTE_MAX,
  ADJUST_PERSON_LABEL,
  ADJUST_TAKE_LABEL,
  REWARD_SAVING_LABEL,
  STAR_STEPS,
  giveButtonText,
  starCountText,
  takeButtonText,
} from "@/lib/rewardVocabulary";

const TILE = "flex min-h-12 items-center justify-center rounded-xl border-2 px-2 text-center text-base font-semibold transition-colors active:bg-surface-2";

/**
 * Give or take stars, right on the Manage page: a person, Give or Take away,
 * an amount on the star steps (a stepper, never typing), and an optional short
 * note. One tap saves; the action refreshes the page, so the note clears and
 * the person stays for the next one. Parents and admins only (the action checks).
 */
export function StarAdjustForm({ people, defaultPersonId }: { people: HouseholdPerson[]; defaultPersonId: string }) {
  const [personId, setPersonId] = useState(defaultPersonId);
  const [direction, setDirection] = useState<AdjustDirection>("give");
  const [amount, setAmount] = useState<number>(ADJUST_DEFAULT_STARS);
  const [note, setNote] = useState("");
  const { run, error, pending } = useOptimisticRun<never>(() => {});

  const person = people.find((candidate) => candidate.id === personId);

  function handleSubmit() {
    if (!person || pending) return;
    run(null, () => giveOrTakeStars({ userId: person.id, direction, amount, note }), () => setNote(""));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
      <div role="group" aria-label={ADJUST_PERSON_LABEL} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 @min-[48rem]:flex-wrap">
        {people.map((candidate) => {
          const selected = candidate.id === personId;
          return (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={selected}
              aria-label={candidate.displayName}
              onClick={() => setPersonId(candidate.id)}
              className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-base font-bold text-fg transition-colors active:bg-surface-2 ${
                selected ? "border-2 border-accent bg-accent-soft" : "border border-line bg-surface"
              }`}
            >
              <AvatarBadge displayName={candidate.displayName} avatarColor={candidate.avatarColor} size={32} />
              <span className={selected ? "" : "hidden @min-[48rem]:inline"}>{candidate.displayName}</span>
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label={ADJUST_DIRECTION_LABEL} className="grid grid-cols-2 gap-2">
        {[
          { value: "give" as const, label: ADJUST_GIVE_LABEL },
          { value: "take" as const, label: ADJUST_TAKE_LABEL },
        ].map((choice) => {
          const selected = direction === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDirection(choice.value)}
              className={`${TILE} ${selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"}`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Star aria-hidden="true" size={20} className="text-star" />
        <LadderStepper
          label={ADJUST_AMOUNT_LABEL}
          shownText={starCountText(amount)}
          atMin={amount <= STAR_STEPS[0]}
          atMax={amount >= STAR_STEPS[STAR_STEPS.length - 1]}
          onStep={(dir) => setAmount(nextAdjustStep(amount, dir === 1 ? "up" : "down"))}
        />
      </div>

      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={ADJUST_NOTE_MAX}
        placeholder={ADJUST_NOTE_LABEL}
        aria-label={ADJUST_NOTE_LABEL}
        enterKeyHint="done"
        className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg placeholder:text-muted"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !person}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? REWARD_SAVING_LABEL : person ? (direction === "give" ? giveButtonText(person.displayName, amount) : takeButtonText(person.displayName, amount)) : ADJUST_GIVE_LABEL}
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
