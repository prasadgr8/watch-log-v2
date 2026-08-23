import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";

type ConfirmDialogAction = "primary" | "secondary" | "tertiary";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  busyAction?: ConfirmDialogAction | null;
  onPrimary: () => void;
  onSecondary: () => void;
  onTertiary: () => void;
}

const actionButtonClasses: Record<ConfirmDialogAction, string> = {
  primary:
    "bg-accent text-inverted hover:bg-accent-hover focus-visible:ring-accent-hover/40",
  secondary:
    "bg-surface-elevated text-primary hover:bg-surface-hover focus-visible:ring-accent-hover/40",
  tertiary:
    "border border-border text-muted hover:bg-surface-hover hover:text-primary focus-visible:ring-accent-hover/40",
};

/*
 * Dependency-free confirmation dialog. Provides a modal scrim, Escape and
 * backdrop cancellation while no action is running, initial focus on the
 * primary action, and focus restoration to the previously focused element.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  busyAction = null,
  onPrimary,
  onSecondary,
  onTertiary,
}: ConfirmDialogProps) {
  const titleId = "confirm-dialog-title";
  const descriptionId = "confirm-dialog-description";

  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const onTertiaryRef = useRef(onTertiary);
  const busyActionRef = useRef<ConfirmDialogAction | null>(busyAction);

  useEffect(() => {
    onTertiaryRef.current = onTertiary;
    busyActionRef.current = busyAction ?? null;
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    primaryButtonRef.current?.focus();

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busyActionRef.current) {
        onTertiaryRef.current();
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

  const isBusy = busyAction !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={() => {
          if (!isBusy) {
            onTertiary();
          }
        }}
        className="absolute inset-0 bg-app-bg/80"
      ></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-primary">
          {title}
        </h2>

        <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            ref={primaryButtonRef}
            disabled={isBusy}
            onClick={onPrimary}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${actionButtonClasses.primary}`}
          >
            {busyAction === "primary" && (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            )}
            {primaryLabel}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onSecondary}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${actionButtonClasses.secondary}`}
          >
            {busyAction === "secondary" && (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            )}
            {secondaryLabel}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onTertiary}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${actionButtonClasses.tertiary}`}
          >
            {tertiaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
