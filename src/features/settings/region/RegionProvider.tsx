import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_AVAILABILITY_REGION,
  detectAvailabilityRegionFromLocale,
  getRegionLabel,
  getRegionName,
  loadAvailabilityRegion,
  resolveAvailabilityRegionState,
  saveAvailabilityRegion,
  type AvailabilityRegionCode,
  type AvailabilityRegionStatus,
  type ResolvedAvailabilityRegionState,
} from "./availabilityRegion";

import { RegionContext } from "./regionContext";

import RegionSelect from "./RegionSelect";

interface RegionProviderProps {
  children: ReactNode;
}

interface FirstRunRegionDialogProps {
  mode: AvailabilityRegionStatus;
  region: AvailabilityRegionCode;
  suggestedRegion: AvailabilityRegionCode | null;
  onUseSuggested: () => void;
  onOpenSelection: () => void;
  onSelect: (code: AvailabilityRegionCode) => void;
  onDismiss: () => void;
}

const DIALOG_TITLE_ID = "region-dialog-title";

/*
 * Dependency-free first-run dialog for the streaming region preference.
 *
 * - "suggest": "We suggest <country> based on your browser settings." with
 *   [Use <country>] and [Choose another…]. Choosing another opens the manual
 *   selector mode.
 * - "choose": a manual selector (India preselected as the default when no
 *   hint exists). Selecting an option persists it immediately; the primary
 *   action persists the currently selected value.
 *
 * Escape or backdrop dismisses the dialog without persisting anything.
 * Mirrors ConfirmDialog's conventions (scrim, Escape dismissal, initial
 * focus, focus restore).
 */
function FirstRunRegionDialog({
  mode,
  region,
  suggestedRegion,
  onUseSuggested,
  onOpenSelection,
  onSelect,
  onDismiss,
}: FirstRunRegionDialogProps) {
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const isOpen = mode === "suggest" || mode === "choose";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTarget =
      mode === "suggest"
        ? primaryButtonRef.current
        : (dialogRef.current?.querySelector<HTMLElement>("select") ?? null);

    focusTarget?.focus();

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);

      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen, mode, onDismiss]);

  if (!isOpen) {
    return null;
  }

  const suggestedCode = suggestedRegion ?? region;
  const isSuggestMode = mode === "suggest";

  const message = isSuggestMode
    ? `We suggest ${getRegionLabel(suggestedCode)} based on your browser settings.`
    : "Choose the country used for streaming availability.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-app-bg/80"
      ></div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={DIALOG_TITLE_ID}
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id={DIALOG_TITLE_ID} className="text-lg font-semibold text-primary">
          Streaming availability region
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>

        {!isSuggestMode && (
          <div className="mt-4">
            <RegionSelect value={region} onChange={onSelect} />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {isSuggestMode ? (
            <>
              <button
                type="button"
                ref={primaryButtonRef}
                onClick={onUseSuggested}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                Use {getRegionLabel(suggestedCode)}
              </button>

              <button
                type="button"
                onClick={onOpenSelection}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                Choose another…
              </button>
            </>
          ) : (
            <button
              type="button"
              ref={primaryButtonRef}
              onClick={() => onSelect(region)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
            >
              Continue with {getRegionName(region)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default function RegionProvider({ children }: RegionProviderProps) {
  const [state, setState] = useState<ResolvedAvailabilityRegionState>({
    region: DEFAULT_AVAILABILITY_REGION,
    status: "ready",
    suggestedRegion: null,
  });

  // The load effect must never override an explicit user choice made while
  // the initial read was still in flight.
  const hasExplicitChoiceRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const stored = await loadAvailabilityRegion();
      const suggested = detectAvailabilityRegionFromLocale();
      const resolved = resolveAvailabilityRegionState(stored, suggested);

      if (isActive && !hasExplicitChoiceRef.current) {
        setState(resolved);
      }
    })().catch((error: unknown) => {
      console.error("Failed to load availability region preference:", error);

      // A failed read must never block the preference: fall back to the
      // manual selector with the default region preselected.
      if (isActive && !hasExplicitChoiceRef.current) {
        setState({
          region: DEFAULT_AVAILABILITY_REGION,
          status: "choose",
          suggestedRegion: null,
        });
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const selectRegion = useCallback((code: AvailabilityRegionCode): void => {
    hasExplicitChoiceRef.current = true;

    setState({ region: code, status: "ready", suggestedRegion: null });

    saveAvailabilityRegion(code).catch((error: unknown) => {
      console.error("Failed to persist availability region preference:", error);
    });
  }, []);

  const openRegionSelection = useCallback((): void => {
    setState((previous) =>
      previous.status === "suggest"
        ? { ...previous, status: "choose" }
        : previous,
    );
  }, []);

  const dismissDialog = useCallback((): void => {
    setState((previous) =>
      previous.status === "ready"
        ? previous
        : { ...previous, status: "ready" },
    );
  }, []);

  const contextValue = useMemo(
    () => ({
      region: state.region,
      status: state.status,
      selectRegion,
      openRegionSelection,
    }),
    [state.region, state.status, selectRegion, openRegionSelection],
  );

  return (
    <RegionContext.Provider value={contextValue}>
      {children}

      <FirstRunRegionDialog
        mode={state.status}
        region={state.region}
        suggestedRegion={state.suggestedRegion}
        onUseSuggested={() =>
          selectRegion(state.suggestedRegion ?? state.region)
        }
        onOpenSelection={openRegionSelection}
        onSelect={selectRegion}
        onDismiss={dismissDialog}
      />
    </RegionContext.Provider>
  );
}