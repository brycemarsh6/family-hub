"use client";

import { useEffect, useState, useTransition } from "react";
import { Field } from "./HabitFormFields";
import { LadderStepper } from "./LadderStepper";
import { RewardEmojiPicker } from "./RewardEmojiPicker";
import { deleteReward, saveReward } from "@/app/actions/rewards";
import { nextCostStep } from "@/lib/rewards/rewardRules";
import type { RewardView } from "@/lib/rewardsRead";
import {
  COST_STEPS,
  DEFAULT_REWARD_COST,
  REWARD_COST_LABEL,
  REWARD_NAME_LABEL,
  REWARD_NO_PICTURE_LABEL,
  REWARD_ONE_TIME_LABEL,
  REWARD_OWNER_LABEL,
  REWARD_PICTURE_LABEL,
  REWARD_REPEATABLE_LABEL,
  REWARD_REPEAT_LABEL,
  REWARD_TITLE_MAX,
  starCountText,
} from "@/lib/rewardVocabulary";

const TILE = "flex min-h-12 items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-medium transition-colors active:bg-surface-2";

/**
 * Add a reward, or edit the one in `initial` (which adds a one-tap Delete, no
 * confirmation). Fields: Picture, Name, Cost, After it's redeemed, For. A new
 * reward starts at 20 stars, One time, for `ownerId`. Parents and admins only:
 * the page decides who sees it, the actions check again.
 */
export function RewardSheet({
  initial,
  ownerId,
  people,
  onClose,
}: {
  initial?: RewardView;
  ownerId: string;
  people: { id: string; displayName: string }[];
  onClose: () => void;
}) {
  const [emoji, setEmoji] = useState<string | null>(initial?.emoji ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cost, setCost] = useState<number>(initial?.cost ?? DEFAULT_REWARD_COST);
  const [repeatable, setRepeatable] = useState(initial?.repeatable ?? false);
  const [forId, setForId] = useState(initial?.ownerId ?? ownerId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Which button was tapped, so only that one changes its words while the call runs.
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await saveReward({ title, emoji, cost, repeatable, ownerId: forId }, initial?.id);
      if (result.error) return setError(result.error);
      onClose();
    });
  }

  function handleDelete() {
    if (!initial) return;
    setError(null);
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteReward(initial.id);
      if (result.error) {
        setDeleting(false);
        return setError(result.error);
      }
      onClose();
    });
  }

  const heading = initial ? "Edit reward" : "Add reward";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-5">
          <Field label={REWARD_PICTURE_LABEL}>
            <button
              type="button"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
              className={`flex min-h-14 items-center rounded-xl border px-3 text-left transition-colors active:bg-surface-2 ${pickerOpen ? "border-2 border-accent bg-accent-soft" : "border-line bg-surface"}`}
            >
              {emoji ? <span className="text-[1.75rem] leading-none">{emoji}</span> : <span className="text-base text-muted">{REWARD_NO_PICTURE_LABEL}</span>}
            </button>
            {pickerOpen && <RewardEmojiPicker value={emoji} onChange={setEmoji} />}
          </Field>

          <Field label={REWARD_NAME_LABEL}>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={REWARD_TITLE_MAX}
              enterKeyHint="done"
              className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg"
            />
          </Field>

          <Field label={REWARD_COST_LABEL}>
            <div>
              <LadderStepper
                label={REWARD_COST_LABEL}
                shownText={starCountText(cost)}
                atMin={cost <= COST_STEPS[0]}
                atMax={cost >= COST_STEPS[COST_STEPS.length - 1]}
                onStep={(dir) => setCost(nextCostStep(cost, dir === 1 ? "up" : "down"))}
              />
            </div>
          </Field>

          <Field label={REWARD_REPEAT_LABEL}>
            <div role="radiogroup" aria-label={REWARD_REPEAT_LABEL} className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: REWARD_ONE_TIME_LABEL },
                { value: true, label: REWARD_REPEATABLE_LABEL },
              ].map((choice) => {
                const selected = repeatable === choice.value;
                return (
                  <button
                    key={choice.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRepeatable(choice.value)}
                    className={`${TILE} ${selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"}`}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={REWARD_OWNER_LABEL}>
            <div role="radiogroup" aria-label={REWARD_OWNER_LABEL} className="flex flex-wrap gap-2">
              {people.map((person) => {
                const selected = person.id === forId;
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setForId(person.id)}
                    className={`${TILE} min-w-20 ${selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"}`}
                  >
                    {person.displayName}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !title.trim()}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending && !deleting ? "Saving…" : initial ? "Save" : "Add"}
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
              {error}
            </p>
          )}
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="min-h-12 w-full rounded-xl text-base font-semibold text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
