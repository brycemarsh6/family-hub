"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { SortableList } from "@/components/SortableList";
import { SwipeActions } from "@/components/SwipeActions";
import {
  addStoreAction,
  removeStoreAction,
  renameStoreAction,
  reorderStoresAction,
  type StoreListResult,
} from "@/app/actions/householdStores";
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
 * an Add row. Every change shows at once, then saves; a failed save puts the
 * list back and says why. The rules live in src/lib/storeList.ts and are
 * checked again on the server.
 */
export function StoreListEditor({ initialStores }: { initialStores: string[] }) {
  const [stores, setStores] = useState(initialStores);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  // Edits are sent one after another so a quick second change can't land first.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const movable = stores.filter((name) => name !== OTHER_STORE);

  /** Show `edit` now, send `send`, and on a refusal or failure put the list back. */
  function apply(edit: StoreEdit, send: () => Promise<StoreListResult>, onFailure?: (message: string) => void) {
    if (!edit.ok) {
      setError(edit.error);
      return;
    }
    const before = stores;
    setStores(edit.stores);
    setError(null);
    queue.current = queue.current.then(async () => {
      let result: StoreListResult;
      try {
        result = await send();
      } catch {
        result = { ok: false, error: "That didn't save. Please try again." };
      }
      if (result.ok) return;
      setStores(before);
      setError(result.error);
      onFailure?.(result.error);
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

      <div className="mt-2 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4">
        <span className="text-base font-medium">{OTHER_STORE}</span>
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

      {renaming !== null && (
        <RenameStoreSheet
          from={renaming}
          onClose={() => setRenaming(null)}
          onSave={(to) => {
            const from = renaming;
            const edit = renameInList(stores, from, to);
            if (!edit.ok) return edit.error;
            setRenaming(null);
            apply(edit, () => renameStoreAction(from, to));
            return null;
          }}
        />
      )}
    </div>
  );
}

/**
 * One text box to rename a store. Portaled to the body so the page's grid
 * container cannot trap the fixed overlay (STRUCTURE.md Wide pages rule 1);
 * it only exists after a tap. `onSave` returns an error message, or null when
 * it took the new name (the editor then closes the sheet).
 */
function RenameStoreSheet({
  from,
  onClose,
  onSave,
}: {
  from: string;
  onClose: () => void;
  onSave: (to: string) => string | null;
}) {
  const dialog = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(from);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus goes into the sheet and comes back to the row that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <form
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Rename store"
        tabIndex={-1}
        onSubmit={(event) => {
          event.preventDefault();
          setError(onSave(name));
        }}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg outline-none md:max-w-lg md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="text-lg font-semibold">Rename store</h2>

        <label htmlFor="store-rename" className="mt-3 text-sm font-medium">
          Store name
        </label>
        <input
          id="store-rename"
          type="text"
          value={name}
          maxLength={MAX_STORE_NAME}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-3 text-base"
        />
        <p className="mt-1 text-sm text-muted">
          Up to {MAX_STORE_NAME} letters. Items on the list for {from} move to the new name.
        </p>

        {error && (
          <p role="alert" className="mt-2 text-sm text-warn">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-3 h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          Save
        </button>
      </form>
    </div>,
    document.body,
  );
}
