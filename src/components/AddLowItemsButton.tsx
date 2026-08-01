"use client";

import { useState, useTransition } from "react";
import { StorePickerSheet } from "./StorePickerSheet";
import { addAllLowItemsToGroceryList } from "@/app/actions/pantry";
import type { Store } from "@/lib/constants";

/**
 * Inventory's one-tap restock button. Tapping it opens the same store picker
 * as a single item's cart button, but the choice applies to the whole batch —
 * asking once per item would turn a one-tap button into a dozen prompts in a
 * row, which defeats the point of it being one tap.
 */
export function AddLowItemsButton({ count }: { count: number }) {
  const [pickingStore, setPickingStore] = useState(false);
  const [, startTransition] = useTransition();

  function submit(store: Store | null) {
    setPickingStore(false);
    startTransition(async () => {
      await addAllLowItemsToGroceryList(store);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickingStore(true)}
        className="mt-3 min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition-opacity active:opacity-80"
      >
        <span aria-hidden="true">🛒</span> Add {count} low{" "}
        {count === 1 ? "item" : "items"} to the list
      </button>

      {pickingStore && (
        <StorePickerSheet
          title={`Add ${count} ${count === 1 ? "item" : "items"} — which store?`}
          onChoose={submit}
          onSkip={() => submit(null)}
        />
      )}
    </>
  );
}
