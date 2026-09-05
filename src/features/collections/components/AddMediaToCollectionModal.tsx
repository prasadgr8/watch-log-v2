import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Search } from "lucide-react";

import type { PersistedMedia } from "../../../types";

interface AddMediaToCollectionModalProps {
  isOpen: boolean;
  isSaving: boolean;
  mediaItems: PersistedMedia[];
  onClose: () => void;
  onAdd: (mediaId: number) => Promise<void>;
}

/*
 * Dependency-free picker dialog for adding existing library media to a
 * collection. Mirrors the established EditMediaModal dialog behavior:
 * modal scrim, Escape and backdrop cancellation while a save is not running,
 * initial focus on the search control, and focus restoration when closing.
 * Each row exposes a labelled "Add to collection" control.
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

  const [searchTerm, setSearchTerm] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  /*
   * Tracks whether the search/pending state has been reset for the current
   * open cycle. State (not a ref) so it participates in rendering and avoids
   * the refs-during-render lint rule. The dialog unmounts when closed
   * (returns null), so re-opening always starts from a clean state.
   */
  const [hasResetOnOpen, setHasResetOnOpen] = useState(false);

  const isSavingRef = useRef(isSaving);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isSavingRef.current = isSaving;
    onCloseRef.current = onClose;
  });

  /*
   * When the modal opens, reset the search and pending state once.
   * Calling setState conditionally during render is the React-recommended
   * pattern for syncing derived state (see React docs: "You Might Not Need
   * an Effect").
   */
  if (isOpen && !hasResetOnOpen) {
    setSearchTerm("");
    setPendingId(null);
    setHasResetOnOpen(true);
  } else if (!isOpen) {
    setHasResetOnOpen(false);
  }

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = normalizedSearch
    ? mediaItems.filter((item) =>
        item.title.toLowerCase().includes(normalizedSearch),
      )
    : mediaItems;

  async function handleAdd(mediaId: number, title: string): Promise<void> {
    setPendingId(mediaId);
    try {
      await onAdd(mediaId);
    } catch (addError) {
      console.error(`Failed to add ${title} to collection:`, addError);
    } finally {
      setPendingId(null);
    }
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
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-surface p-6 shadow-xl"
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

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search media..."
            className="w-full rounded-lg border border-border bg-input-bg py-2 pl-10 pr-3 text-primary placeholder:text-muted focus:border-accent-hover focus:outline-none"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-muted">
              {normalizedSearch
                ? "No media found."
                : "All library media are already in this collection."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted">
                      {item.mediaType === "tv" ? "TV Show" : "Movie"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving || pendingId !== null}
                    onClick={() => void handleAdd(item.id, item.title)}
                    aria-label={`Add ${item.title} to collection`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm text-inverted transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
                  >
                    {pendingId === item.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </li>
              ))}
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
      </div>
    </div>
  );
}