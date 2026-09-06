import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";

import type { RefObject } from "react";
import type { PersistedMedia } from "../../../types";

interface AddMediaToCollectionModalProps {
  isOpen: boolean;
  isSaving: boolean;
  mediaItems: PersistedMedia[];
  onClose: () => void;
  onAdd: (mediaId: number) => Promise<void>;
}

interface AddMediaToCollectionFormProps {
  isSaving: boolean;
  mediaItems: PersistedMedia[];
  onClose: () => void;
  onAdd: (mediaId: number) => Promise<void>;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

/*
 * Dependency-free picker dialog for adding existing library media to a
 * collection. Mirrors the established EditMediaModal dialog behavior:
 * modal scrim, Escape and backdrop cancellation while a save is not running,
 * initial focus on the search control, and focus restoration when closing.
 * Each row exposes a labelled "Add to collection" control.
 *
 * State reset follows the EditMediaModal pattern: the form lives in a child
 * component keyed by the parent so it remounts (and therefore resets its
 * local search/pending state) each time the dialog opens, with no
 * setState-in-effect. There is no render-time setState, so the parent can
 * safely always mount this modal (even closed) without triggering a render
 * loop.
 */
export default function AddMediaToCollectionModal({
  isOpen,
  isSaving,
  mediaItems,
  onClose,
  onAdd,
}: AddMediaToCollectionModalProps) {
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
        aria-labelledby="add-media-modal-title"
        aria-describedby="add-media-modal-description"
        className="relative w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2
          id="add-media-modal-title"
          className="text-xl font-semibold text-primary"
        >
          Add to Collection
        </h2>

        <p
          id="add-media-modal-description"
          className="mt-1 text-sm text-muted"
        >
          Add existing library media to this collection.
        </p>

                <AddMediaToCollectionForm
          key="add-media-to-collection-form"
          isSaving={isSaving}
          mediaItems={mediaItems}
          onClose={onClose}
          onAdd={onAdd}
          searchInputRef={searchInputRef}
        />
            </div>
    </div>
  );
}

/*
 * Child form component keyed by the parent so it remounts (and therefore
 * resets its local search/pending state) each time the dialog opens,
 * following the EditMediaModal pattern. No setState-in-effect is required.
 */
function AddMediaToCollectionForm({
  isSaving,
  mediaItems,
  onClose,
  onAdd,
  searchInputRef,
}: AddMediaToCollectionFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  const filteredMedia = searchTerm.trim()
    ? mediaItems.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      )
    : mediaItems;

  async function handleAdd(mediaId: number): Promise<void> {
    setPendingId(mediaId);
    try {
      await onAdd(mediaId);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="mt-5">
        <label
          htmlFor="add-media-search"
          className="block text-sm font-medium text-muted"
        >
          Search
        </label>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="add-media-search"
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search media..."
            className="w-full rounded-lg border border-border bg-input-bg py-2 pl-10 pr-3 text-primary placeholder:text-muted focus:border-accent-hover focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 max-h-80 overflow-y-auto">
        {filteredMedia.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No media found.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredMedia.map((item) => {
              const isPending = pendingId === item.id;

              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-sm text-muted">
                      {item.mediaType === "movie" ? "Movie" : "TV Show"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving || isPending}
                    onClick={() => void handleAdd(item.id)}
                    aria-label={`Add ${item.title} to collection`}
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
