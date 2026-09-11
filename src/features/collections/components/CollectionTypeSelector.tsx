import { useEffect, useRef } from "react";
import { List, Sparkles, X } from "lucide-react";

interface CollectionTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectSmart: () => void;
}

export default function CollectionTypeSelector({
  isOpen,
  onClose,
  onSelectManual,
  onSelectSmart,
}: CollectionTypeSelectorProps) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
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

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
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
        onClick={onClose}
        className="absolute inset-0 bg-app-bg/80"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-type-selector-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2
            id="collection-type-selector-title"
            className="text-lg font-semibold text-primary"
          >
            Choose collection type
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted transition hover:bg-surface-elevated hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-muted">
          How do you want to add media to this collection?
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onSelectManual}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-accent hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent-hover/40"
          >
            <div className="rounded-lg bg-surface-elevated p-2 text-accent-text">
              <List className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">Manual Collection</p>
              <p className="mt-1 text-sm text-muted">
                Add and remove media individually.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectSmart}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-accent hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent-hover/40"
          >
            <div className="rounded-lg bg-accent/15 p-2 text-accent-text">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">Smart Collection</p>
              <p className="mt-1 text-sm text-muted">
                Auto-populate from filters like rating, favorites, and genres.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-muted transition hover:bg-surface-elevated hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
