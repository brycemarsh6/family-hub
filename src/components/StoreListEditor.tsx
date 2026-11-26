"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { SortableList } from "@/components/SortableList";
import { SwipeActions } from "@/components/SwipeActions";
import { TitleSheet } from "@/components/TitleSheet";
import {
  addStoreAction,
  removeStoreAction,
  renameStoreAction,
  reorderStoresAction,
} from "@/app/actions/householdStores";
import { SAVE_FAILED } from "@/lib/useOptimisticRun";
import {
  MAX_STORES,
  MAX_STORE_NAME,
  OTHER_STORE,
  addStore,
  removeStore,
  renameInList,
  reorderStores,
  type StoreEdit,
} from "@/lib/storeList";

/**
 * The Stores page body: the household's stores in order (drag the grip to
 * reorder, swipe to remove, tap a name to rename), "Other" always last, and
 * an Add row. Every change shows at once, then saves; a failed save says why,
 * and once every save has settled the list shows what the server confirmed. The rules live in src/lib/storeList.ts and are
 * checked again on the server.
 */
export function StoreListEditor({ initialStores }: { initialStores: string[] }) {
  const [stores, setStores] = useState(initialStores);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  // Edits are sent one after another so a quick second change can't land first.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // The list as the server last confirmed it, and how many saves are in flight.
  // A failed save only shows its error; the list is put back to `confirmed`
  // once nothing is pending, so queued edits can never leave a stale picture.
  const confirmed = useRef(initialStores);
  const pending = useRef(0);

  const movable = stores.filter((name) => name !== OTHER_STORE);

  /** Show `edit` now and send `send`; a refusal or failed save shows its reason. */
  function apply(edit: StoreEdit, send: () => Promise<StoreEdit>, onFailure?: (message: string) => void) {
    if (!edit.ok) {
      setError(edit.error);
      return;
    }
    setStores(edit.stores);
    setError(null);
    pending.current += 1;
    queue.current = queue.current.then(async () => {
      let result: StoreEdit;
      try {
        result = await send();
      } catch {
        result = { ok: false, error: SAVE_FAILED };
      }
      if (result.ok) {
        confirmed.current = result.stores;
      } else {
        setError(result.error);
        onFailure?.(result.error);
      }
      pending.current -= 1;
      if (pending.current === 0) setStores(confirmed.current);
    });
  }

  function handleAdd() {
    const edit = addStore(stores, newName);
    if (!edit.ok) {
      setAddError(edit.error);
      return;
    }
    const typed = newName;
    setNewName("");
    setAddError(null);
    apply(edit, () => addStoreAction(typed), (message) => {
      setNewName(typed);
      setAddError(message);
    });
  }

  return (
    <div className="mt-4">
      <SortableList
        items={movable.map((name) => ({ id: name }))}
        label={(item) => item.id}
        onReorder={(ids) => apply(reorderStores(stores, ids), () => reorderStoresAction(ids))}
        className="space-y-2"
        renderItem={(item, { grip }) => (
          <SwipeActions
            actions={[
              {
                label: "Remove",
                accessibleLabel: `Remove ${item.id}`,
                icon: <Trash2 aria-hidden="true" size={18} />,
                tone: "danger",
                onAction: () => apply(removeStore(stores, item.id), () => removeStoreAction(item.id)),
              },
            ]}
          >
            <div className="flex min-h-14 items-center gap-1 rounded-xl border border-line bg-surface pl-1 pr-3">
              {grip}
              <button
                type="button"
                onClick={() => setRenaming(item.id)}
                aria-label={`Rename ${item.id}`}
                className="min-h-14 min-w-0 flex-1 truncate px-2 text-left text-base font-medium"
              >
                {item.id}
              </button>
            </div>
          </SwipeActions>
        )}
      />

      <div className="mt-2 flex min-h-14 items-center justify-between gap-1 rounded-xl border border-line bg-surface pl-1 pr-3">
        {/* Same width as the grip, so "Other" lines up with the names above. */}
        <span aria-hidden="true" className="w-11 shrink-0" />
        <span className="min-w-0 flex-1 px-2 text-base font-medium">{OTHER_STORE}</span>
        <span className="text-sm text-muted">Always last</span>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <input
          type="text"
          value={newName}
          maxLength={MAX_STORE_NAME}
          placeholder="Add a store"
          aria-label="New store name"
          onChange={(event) => {
            setNewName(event.target.value);
            setAddError(null);
          }}
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl bg-accent px-5 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          Add
        </button>
      </form>
      {addError && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {addError}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">
        {stores.length} of {MAX_STORES} stores
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {renaming !== null &&
        createPortal(
          <TitleSheet
            heading="Rename store"
            label="Store name"
            hint={`Up to ${MAX_STORE_NAME} letters. Items on the list for ${renaming} move to the new name.`}
            maxLength={MAX_STORE_NAME}
            initialValue={renaming}
            submitLabel="Save"
            error={renameError}
            onSubmit={(to) => {
              const from = renaming;
              const edit = renameInList(stores, from, to);
              if (!edit.ok) {
                setRenameError(edit.error);
                return;
              }
              setRenameError(null);
              setRenaming(null);
              apply(edit, () => renameStoreAction(from, to));
            }}
            onClose={() => {
              setRenameError(null);
              setRenaming(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
