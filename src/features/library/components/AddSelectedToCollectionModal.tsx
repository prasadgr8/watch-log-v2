import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";

import type { RefObject } from "react";
import type { PersistedCollection } from "../../../types";

import { collectionsService } from "../../collections/services/collectionsService";

interface AddSelectedToCollectionModalProps {
  isOpen: boolean;
  isSaving: boolean;
  collectionCount: number;
  onClose: () => void;
  onPick: (collectionId: number, name: string) => Promise<void>;
}

interface AddSelectedToCollectionFormProps {
  isSaving: boolean;
  onClose: () => void;
  onPick: (collectionId: number, name: string) => Promise<void>;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

/*
 * Picker dialog for choosing the single target collection when adding the
 * selected library items to a collection. Follows the established
 * AddMediaToCollectionModal dialog conventions: modal scrim, Escape and
 * backdrop cancellation while a save is not running, initial focus on search,
 * focus restoration, and a remounting child form that resets local state on
 * each open. There is no render-time setState, so the parent can always mount
 * this modal (even closed) without triggering a render loop.
 */
export default function AddSelectedToCollectionModal({
  isOpen,
  isSaving,
  collectionCount,
  onClose,
  onPick,
}: AddSelectedToCollectionModalProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const isSavingRef = useRef(isSaving);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isSavingRef.current = isSaving;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    searchInputRef.current?.focus();

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isSavingRef.current) {
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);

      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={() => {
          if (!isSaving) {
            onClose();
          }
        }}
        className="absolute inset-0 bg-black/60"
      ></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-selected-modal-title"
        aria-describedby="add-selected-modal-description"
        className="relative w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2
          id="add-selected-modal-title"
          className="text-xl font-semibold text-primary"
        >
          Add to Collection
        </h2>

        <p
          id="add-selected-modal-description"
          className="mt-2 text-sm text-muted"
        >
          Choose a collection to add the {collectionCount} selected item
          {collectionCount === 1 ? "" : "s"} to.
        </p>

        <AddSelectedToCollectionForm
          isSaving={isSaving}
          onClose={onClose}
          onPick={onPick}
          searchInputRef={searchInputRef}
        />
      </div>
    </div>
  );
}

function AddSelectedToCollectionForm({
  isSaving,
  onClose,
  onPick,
  searchInputRef,
}: AddSelectedToCollectionFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collections, setCollections] = useState<PersistedCollection[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load(): Promise<void> {
      const list = await collectionsService.listCollections();
      if (isActive) {
        setCollections(list);
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredCollections = searchTerm.trim()
    ? collections.filter((collection) =>
        collection.name
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      )
    : collections;

  async function handlePick(
    collectionId: number,
    name: string,
  ): Promise<void> {
    setPendingId(collectionId);
    try {
      await onPick(collectionId, name);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="mt-5">
        <label
          htmlFor="add-selected-search"
          className="block text-sm font-medium text-muted"
        >
          Search
        </label>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="add-selected-search"
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search collections..."
            className="w-full rounded-lg border border-border bg-input-bg py-2 pl-10 pr-3 text-primary placeholder:text-muted focus:border-accent-hover focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 max-h-80 overflow-y-auto">
        {filteredCollections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No collections found.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredCollections.map((collection) => {
              const isPending = pendingId === collection.id;

              return (
                <li
                  key={collection.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-3"
                >
                  <p className="truncate font-medium text-primary">
                    {collection.name}
                  </p>

                  <button
                    type="button"
                    disabled={isSaving || isPending}
                    onClick={() => void handlePick(collection.id, collection.name)}
                    aria-label={`Add to ${collection.name}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm text-inverted transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-muted hover:bg-surface-elevated"
        >
          Close
        </button>
      </div>
    </>
  );
}
