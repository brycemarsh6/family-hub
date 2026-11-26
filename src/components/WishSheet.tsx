"use client";

import { useEffect, useState, useTransition } from "react";
import { Field } from "./HabitFormFields";
import { RewardEmojiPicker } from "./RewardEmojiPicker";
import { deleteReward, saveWish } from "@/app/actions/rewards";
import type { RewardView } from "@/lib/rewardsRead";
import {
  REWARD_DELETING_LABEL,
  REWARD_NAME_LABEL,
  REWARD_NO_PICTURE_LABEL,
  REWARD_OWNER_LABEL,
  REWARD_PICTURE_LABEL,
  REWARD_SAVING_LABEL,
  REWARD_TITLE_MAX,
  WISH_ADD_LABEL,
  WISH_EDIT_HEADING,
  WISH_SHEET_HINT,
  WISH_SUBMIT_LABEL,
} from "@/lib/rewardVocabulary";

const TILE = "flex min-h-12 min-w-20 items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-medium transition-colors active:bg-surface-2";

/**
 * Add a wish (a reward with no cost yet), or change the one in `initial`,
 * which adds a one-tap Delete. Fields: Picture, Name, and For only when the
 * viewer may wish for more than one person (`people` has more than one
 * entry). No PIN: the actions check who may change a wish. A parent sets the
 * cost later, on the reward sheet.
 */
export function WishSheet({
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
  const [forId, setForId] = useState(ownerId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  // A call in flight is not stopped by a stray tap or Escape.
  const close = () => {
    if (!pending) onClose();
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  function handleSubmit() {
    if (!title.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await saveWish({ title, emoji, ownerId: forId }, initial?.id);
      if (result.error) return setError(result.error);
      onClose();
    });
  }

  function handleDelete() {
    if (!initial || pending) return;
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

  const heading = initial ? WISH_EDIT_HEADING : WISH_ADD_LABEL;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-black/40" />

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
            onClick={close}
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

          {!initial && people.length > 1 && (
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
                      className={`${TILE} ${selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"}`}
                    >
                      {person.displayName}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <p className="text-sm text-muted">{WISH_SHEET_HINT}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !title.trim()}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending && !deleting ? REWARD_SAVING_LABEL : initial ? "Save" : WISH_SUBMIT_LABEL}
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
              {deleting ? REWARD_DELETING_LABEL : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
