"use client";

import { useState, useTransition } from "react";
import { AddItemBar, AddItemSelect } from "./AddItemBar";
import {
  PantryDuplicateReviewSheet,
  type PendingPantryAdd,
  type PantryCreateFields,
} from "./PantryDuplicateReviewSheet";
import {
  addPantryItem,
  checkForDuplicateOnAdd,
  createPantryItemReviewed,
  mergeIntoExistingPantryItem,
} from "@/app/actions/pantry";
import {
  CATEGORY_NAMES,
  LOCATION_NAMES,
  DEFAULT_CATEGORY,
  DEFAULT_LOCATION,
} from "@/lib/constants";

/**
 * Wraps the Inventory add bar with a duplicate check before anything is
 * written — the add-time half of the Duplicate & irregularity review
 * plan (D2). AddItemBar itself is untouched and stays fully generic
 * (Shopping's add bar still calls addGroceryItem directly); this
 * component only changes what happens on Inventory's submit.
 *
 * A name with no plausible match creates instantly, same zero-friction
 * path as before — the review sheet only opens when
 * checkForDuplicateOnAdd actually finds something.
 */
export function PantryAddFlow() {
  const [pending, setPending] = useState<PendingPantryAdd | null>(null);
  const [submitting, startTransition] = useTransition();

  async function handleAdd(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const rawQuantity = Number(formData.get("quantity"));
    const quantity =
      Number.isFinite(rawQuantity) && rawQuantity >= 0 ? rawQuantity : 1;
    const unit = String(formData.get("unit") ?? "").trim() || null;
    const category = String(formData.get("category") ?? DEFAULT_CATEGORY);
    const location = String(formData.get("location") ?? DEFAULT_LOCATION);

    const matches = await checkForDuplicateOnAdd(name, location);
    if (matches.length === 0) {
      await addPantryItem(formData);
      return;
    }

    setPending({ name, quantity, unit, category, location, matches });
  }

  function handleCreateNew(fields: PantryCreateFields) {
    startTransition(async () => {
      await createPantryItemReviewed(fields);
      setPending(null);
    });
  }

  function handleMerge(pantryItemId: string, quantity: number) {
    startTransition(async () => {
      await mergeIntoExistingPantryItem(pantryItemId, quantity);
      setPending(null);
    });
  }

  return (
    <>
      <AddItemBar action={handleAdd} placeholder="Add to the inventory…">
        <AddItemSelect
          name="location"
          label="Location"
          options={LOCATION_NAMES}
          defaultValue={DEFAULT_LOCATION}
        />
        <AddItemSelect
          name="category"
          label="Category"
          options={CATEGORY_NAMES}
          defaultValue={DEFAULT_CATEGORY}
        />
      </AddItemBar>

      {pending && (
        <PantryDuplicateReviewSheet
          pending={pending}
          submitting={submitting}
          onCancel={() => setPending(null)}
          onCreateNew={handleCreateNew}
          onMerge={handleMerge}
        />
      )}
    </>
  );
}
