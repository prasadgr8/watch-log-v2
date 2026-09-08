import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { PersistedMedia } from "../../../types/media";

interface EditMediaModalProps {
  media: PersistedMedia | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
    watchedAt?: Date | null;
  }) => void;
}

interface EditMediaFormProps {
  media: PersistedMedia;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
    watchedAt?: Date | null;
  }) => void;
  statusSelectRef: RefObject<HTMLSelectElement | null>;
}

/*
 * Converts a Date to the value a native <input type="date"> expects
 * (YYYY-MM-DD in local time). The date field is only shown for completed
 * movies, so the value is always derived from a real completed timestamp.
 */
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * Dependency-free edit dialog. Mirrors the established ConfirmDialog
 * behavior: a modal scrim, Escape and backdrop cancellation while a save is
 * not running, initial focus on the status control, and focus restoration
 * to the previously focused element when the dialog closes.
 */
export default function EditMediaModal({
  media,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: EditMediaModalProps) {
  const statusSelectRef = useRef<HTMLSelectElement | null>(null);
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

    statusSelectRef.current?.focus();

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

  if (!isOpen || media === null) {
    return null;
  }

  return (
    <EditMediaForm
      key={media.id}
      media={media}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
      statusSelectRef={statusSelectRef}
    />
  );
}

function EditMediaForm({
  media,
  isSaving,
  onClose,
  onSave,
  statusSelectRef,
}: EditMediaFormProps) {
  const [status, setStatus] = useState(media.userStatus);
  const [rating, setRating] = useState(media.rating ?? 0);
  const [notes, setNotes] = useState(media.notes ?? "");
  const [watchedAt, setWatchedAt] = useState<Date | null>(
    media.mediaType === "movie" ? media.watchedAt ?? null : null,
  );
  const [watchedAtTouched, setWatchedAtTouched] = useState(false);

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
        aria-labelledby="edit-media-modal-title"
        aria-describedby="edit-media-modal-media-title edit-media-modal-media-type"
        className="relative w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2
          id="edit-media-modal-title"
          className="text-xl font-semibold text-primary"
        >
          Edit Progress
        </h2>

        <div className="mt-5 border-b border-border pb-4">
          <h3
            id="edit-media-modal-media-title"
            className="text-lg font-semibold text-primary"
          >
            {media.title}
          </h3>

          <p
            id="edit-media-modal-media-type"
            className="mt-1 text-sm text-muted"
          >
            {media.mediaType === "movie" ? "Movie" : "TV Show"}
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-muted"
          >
            Status
          </label>

          <select
            id="status"
            ref={statusSelectRef}
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary focus:border-accent-hover focus:outline-none"
          >
            <option value="planned">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-muted">
            Rating
          </label>

          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-2xl transition-transform hover:scale-110"
              >
                {star <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-muted"
          >
            Notes
          </label>

          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add your personal notes..."
            className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary placeholder:text-muted focus:border-accent-hover focus:outline-none"
          />
        </div>

        {media.mediaType === "movie" && status === "completed" && (
          <div className="mt-6">
            <label
              htmlFor="watchedAt"
              className="block text-sm font-medium text-muted"
            >
              Watched Date
            </label>

            <div className="mt-2 flex items-center gap-2">
              <input
                id="watchedAt"
                type="date"
                value={
                  watchedAt ? toDateInputValue(watchedAt) : ""
                }
                onChange={(event) => {
                  setWatchedAtTouched(true);

                  setWatchedAt(
                    event.target.value
                      ? new Date(`${event.target.value}T00:00:00`)
                      : null,
                  );
                }}
                className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary focus:border-accent-hover focus:outline-none"
              />

              {watchedAt && (
                <button
                  type="button"
                  onClick={() => {
                    setWatchedAtTouched(true);
                    setWatchedAt(null);
                  }}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:bg-surface-elevated"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-muted hover:bg-surface-elevated"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              onSave({
                status,
                rating,
                notes,
                ...(watchedAtTouched ? { watchedAt } : {}),
              })
            }
            className="rounded-lg bg-accent px-4 py-2 text-inverted hover:bg-accent-hover"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
