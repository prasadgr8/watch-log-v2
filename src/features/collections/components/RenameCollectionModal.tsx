import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import type { PersistedCollection } from "../../../types";

interface RenameCollectionModalProps {
  collection: PersistedCollection | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

/*
 * Dependency-free rename dialog. Mirrors the established EditMediaModal
 * behavior: a modal scrim, Escape and backdrop cancellation while a save is
 * not running, initial focus on the name control, and focus restoration
 * to the previously focused element when the dialog closes.
 */
export default function RenameCollectionModal({
  collection,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: RenameCollectionModalProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  /*
   * Tracks which collection the current local name was seeded from so the
   * input can be reset when the dialog (re)opens for a different collection.
   * This is state (not a ref) so it participates in rendering and avoids the
   * refs-during-render lint rule.
   */
  const [seededCollectionId, setSeededCollectionId] = useState<
    number | undefined
  >(undefined);

  const isSavingRef = useRef(isSaving);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isSavingRef.current = isSaving;
    onCloseRef.current = onClose;
  });

  /*
   * When the modal opens for a collection, seed the local name once. Calling
   * setState conditionally during render is the React-recommended pattern for
   * syncing derived state (see React docs: "You Might Not Need an Effect").
   * The dialog unmounts when closed (returns null), so re-opening always
   * starts from the collection's current name.
   */
  if (
    isOpen &&
    collection &&
    seededCollectionId !== collection.id
  ) {
    setName(collection.name);
    setError(null);
    setSeededCollectionId(collection.id);
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    nameInputRef.current?.focus();
    nameInputRef.current?.select();

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

  if (!isOpen || collection === null) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setError("Collection name is required.");
      return;
    }

    try {
      await onSave(trimmed);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to rename.",
      );
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
        className="absolute inset-0 bg-app-bg/80"
      ></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-collection-modal-title"
        aria-describedby="rename-collection-modal-description"
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="rename-collection-modal-title"
          className="text-lg font-semibold text-primary"
        >
          Rename Collection
        </h2>

        <p
          id="rename-collection-modal-description"
          className="mt-1 text-sm text-muted"
        >
          Enter a new name for this collection.
        </p>

        <form className="mt-5" onSubmit={handleSubmit}>
          <label
            htmlFor="collection-name"
            className="block text-sm font-medium text-muted"
          >
            Name
          </label>

          <input
            id="collection-name"
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-muted transition hover:bg-surface-hover hover:text-primary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-inverted transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
            >
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
