"use client";

import { AddItemSelect } from "./AddItemBar";
import { STORES, toStore } from "@/lib/constants";
import { useLastStore } from "@/lib/lastStore";

/**
 * The store dropdown on the "Add to the list…" bar, defaulting to whichever
 * store was picked most recently.
 *
 * `<select defaultValue>` only applies once, at mount — and `useLastStore()`
 * starts at `null` (matching the server) and updates to the real value right
 * after hydration. Keying on that value forces `AddItemSelect` to remount
 * when it changes, so the new defaultValue actually takes effect; if there's
 * never been a stored value the key never changes, so it never remounts.
 */
export function StoreSelect() {
  const lastStore = toStore(useLastStore());

  return (
    <AddItemSelect
      key={lastStore ?? "none"}
      name="store"
      label="Store"
      options={STORES}
      defaultValue={lastStore ?? ""}
      placeholderLabel="No store yet"
    />
  );
}
