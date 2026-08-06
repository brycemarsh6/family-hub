"use client";

import { useState } from "react";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import type { DuplicatePair, ParkedInOther } from "@/lib/duplicates";

/** One screen's worth of work — a duplicate pair, or a parked item. */
export type ReviewEntry =
  | { type: "pair"; pair: DuplicatePair }
  | { type: "parked"; parked: ParkedInOther };

/**
 * The standing review queue's sheet — "1 of 4", one irregularity per
 * screen, the same budgeting-app shape as PutAwayReviewSheet.
 *
 * One deliberate difference from put-away's: each decision commits
 * immediately rather than batching to the end. These are independent
 * fixes with nothing tying them together, so batching would only mean
 * losing four decisions when someone closes the sheet after three — and
 * committing as you go matches the single-tap house style everywhere
 * else.
 */
export function IrregularityReviewSheet({
  entries,
  index,
  submitting,
  onClose,
  onSkip,
  onMerge,
  onDismiss,
  onFile,
}: {
  entries: ReviewEntry[];
  index: number;
  submitting: boolean;
  onClose: () => void;
  /** Move past this one without deciding — distinct from dismissing,
   * which is permanent. Nothing is written; it comes back next time. */
  onSkip: () => void;
  onMerge: (survivorId: string, mergedId: string, fingerprint: string) => void;
  onDismiss: (kind: string, fingerprint: string) => void;
  onFile: (itemId: string, patch: { location?: string; category?: string }) => void;
}) {
  const entry = entries[index];
  const hasNext = index < entries.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close the review"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Needs a look — ${index + 1} of ${entries.length}`}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Needs a look</h2>
            <p className="text-sm text-muted">
              {index + 1} of {entries.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the review"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {/* Keyed so switching entries remounts with fresh local state
            rather than carrying a previous screen's selection over. */}
        {entry.type === "pair" ? (
          <PairReview
            key={entry.pair.fingerprint}
            pair={entry.pair}
            submitting={submitting}
            onMerge={onMerge}
            onDismiss={onDismiss}
          />
        ) : (
          <ParkedReview
            key={entry.parked.fingerprint}
            parked={entry.parked}
            submitting={submitting}
            onDismiss={onDismiss}
            onFile={onFile}
          />
        )}

        {hasNext && (
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="mt-3 min-h-11 w-full rounded-xl text-sm font-medium text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

function PairReview({
  pair,
  submitting,
  onMerge,
  onDismiss,
}: {
  pair: DuplicatePair;
  submitting: boolean;
  onMerge: (survivorId: string, mergedId: string, fingerprint: string) => void;
  onDismiss: (kind: string, fingerprint: string) => void;
}) {
  // Which row survives the merge. Defaults to the one with the shorter
  // name — usually the more general, more reusable entry ("Ground beef"
  // over "Ground beef 80/20") — but it's a guess, so it's shown as a
  // choice rather than assumed.
  const [survivorId, setSurvivorId] = useState(
    pair.a.name.length <= pair.b.name.length ? pair.a.id : pair.b.id,
  );

  const survivor = survivorId === pair.a.id ? pair.a : pair.b;
  const merged = survivorId === pair.a.id ? pair.b : pair.a;
  const combined = Math.round((pair.a.quantity + pair.b.quantity) * 100) / 100;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {pair.kind === "same-name"
          ? "These two have the same name and are in the same place."
          : "These two look like they might be the same thing."}
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Keep which one?</span>
        {[pair.a, pair.b].map((item) => {
          const picked = item.id === survivorId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSurvivorId(item.id)}
              aria-pressed={picked}
              className={`flex min-h-14 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                picked
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface-2 active:bg-line"
              }`}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted">
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ""} · {item.location} ·{" "}
                {item.category}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
        Merging keeps <span className="font-semibold">{survivor.name}</span> with{" "}
        <span className="font-semibold">
          {combined}
          {survivor.unit ? ` ${survivor.unit}` : ""}
        </span>
        , and removes <span className="font-semibold">{merged.name}</span>.
        {/* Worth saying out loud: the shopping-list link following the
            survivor is the whole reason the merge action re-points it. */}
        <span className="mt-1 block text-xs text-muted">
          Anything on the shopping list pointing at {merged.name} will point
          at {survivor.name} instead.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onMerge(survivorId, merged.id, pair.fingerprint)}
          disabled={submitting}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {submitting ? "Merging…" : "Merge them"}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(pair.kind, pair.fingerprint)}
          disabled={submitting}
          className="min-h-11 w-full rounded-xl border border-line text-sm font-medium transition-colors active:bg-surface-2 disabled:opacity-40"
        >
          They&apos;re different — stop asking
        </button>
      </div>
    </div>
  );
}

function ParkedReview({
  parked,
  submitting,
  onDismiss,
  onFile,
}: {
  parked: ParkedInOther;
  submitting: boolean;
  onDismiss: (kind: string, fingerprint: string) => void;
  onFile: (itemId: string, patch: { location?: string; category?: string }) => void;
}) {
  const isLocation = parked.kind === "other-location";
  // Start on the first real option rather than "Other" — the whole point
  // of this screen is moving off "Other", so pre-selecting it again would
  // make the primary action a no-op.
  const [value, setValue] = useState<string>(
    isLocation
      ? (LOCATIONS.find((l) => l.name !== "Other")?.name ?? "Pantry")
      : (CATEGORIES.find((c) => c.name !== "Other")?.name ?? "Produce"),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold">{parked.item.name}</p>
        <p className="text-sm text-muted">
          {parked.item.quantity}
          {parked.item.unit ? ` ${parked.item.unit}` : ""} ·{" "}
          {parked.item.location} · {parked.item.category}
        </p>
      </div>

      <p className="text-sm text-muted">
        {isLocation
          ? "This hasn't been given a real spot yet — where does it live?"
          : "This hasn't been given a real category yet — what is it?"}
      </p>

      <label className="block text-sm text-muted">
        <span className="mb-1 block">{isLocation ? "Location" : "Category"}</span>
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        >
          {(isLocation ? LOCATIONS : CATEGORIES)
            .filter((option) => option.name !== "Other")
            .map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            onFile(
              parked.item.id,
              isLocation ? { location: value } : { category: value },
            )
          }
          disabled={submitting}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {submitting ? "Filing…" : "File it here"}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(parked.kind, parked.fingerprint)}
          disabled={submitting}
          className="min-h-11 w-full rounded-xl border border-line text-sm font-medium transition-colors active:bg-surface-2 disabled:opacity-40"
        >
          Leave it in Other — stop asking
        </button>
      </div>
    </div>
  );
}
