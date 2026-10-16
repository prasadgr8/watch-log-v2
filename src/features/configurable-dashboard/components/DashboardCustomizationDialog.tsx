import { useEffect, useRef } from "react";

import {
  CORE_WIDGET_IDS,
  getWidgetDefinition,
  type ConfigurableDashboardWidgetId,
} from "../widgetRegistry";

/** Elements that can receive keyboard focus inside the dialog panel. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DashboardCustomizationDialogProps {
  widgetVisibility: Record<ConfigurableDashboardWidgetId, boolean>;
  setWidgetVisibility: (
    widgetId: ConfigurableDashboardWidgetId,
    visible: boolean,
  ) => void;
  resetDashboardVisibility: () => void;
  onClose: () => void;
}

/**
 * Dedicated customization panel rendered as a modal dialog (following the
 * established WatchLog dialog conventions: role="dialog", aria-modal, an
 * accessible name and description, Escape and backdrop cancellation, initial
 * focus on the first widget checkbox, and focus restoration to the trigger
 * on close). Focus is contained while open: Tab and Shift+Tab cycle within
 * the dialog, so keyboard focus never escapes to background content.
 *
 * The page mounts this dialog only while customization is active, so the
 * open effect below runs on mount: it records the previously focused element
 * (the Customize Dashboard trigger), moves focus to the first checkbox, and
 * registers Escape and Tab handling; cleanup restores focus to the trigger.
 *
 * On short viewports the panel caps at the available height (max-h-full) and
 * the widget list scrolls internally, keeping Reset to Default and Done
 * visible without scrolling the page.
 *
 * Widgets are derived from the registry (CORE_WIDGET_IDS / getWidgetDefinition)
 * rather than hard-coded, so the list stays in sync with the Widget Registry.
 */
export default function DashboardCustomizationDialog({
  widgetVisibility,
  setWidgetVisibility,
  resetDashboardVisibility,
  onClose,
}: DashboardCustomizationDialogProps) {
  const firstCheckboxRef = useRef<HTMLInputElement | null>(null);
  const dialogPanelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Initial focus moves inside the dialog (ConfirmDialog convention): the
    // first widget checkbox is the first control of the visibility list, so
    // keyboard users start in the dialog instead of on the trigger behind it.
    firstCheckboxRef.current?.focus();

    function handleDocumentFocusIn(event: FocusEvent): void {
      const panel = dialogPanelRef.current;
      if (
        panel &&
        event.target instanceof Node &&
        !panel.contains(event.target)
      ) {
        firstCheckboxRef.current?.focus();
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      // Focus containment: Tab and Shift+Tab always cycle within the dialog
      // panel, so background content is never reachable while the dialog is
      // open (aria-modal alone does not stop keyboard focus).
      const panel = dialogPanelRef.current;
      const focusables = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      const currentIndex =
        active instanceof HTMLElement ? focusables.indexOf(active) : -1;

      let nextIndex: number;

      if (currentIndex === -1) {
        nextIndex = event.shiftKey ? focusables.length - 1 : 0;
      } else if (event.shiftKey) {
        nextIndex = (currentIndex - 1 + focusables.length) % focusables.length;
      } else {
        nextIndex = (currentIndex + 1) % focusables.length;
      }

      event.preventDefault();
      focusables[nextIndex].focus();
    }

    document.addEventListener("focusin", handleDocumentFocusIn);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("focusin", handleDocumentFocusIn);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, []);

  const widgetIds = CORE_WIDGET_IDS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-app-bg/80"
      ></div>

      <div
        ref={dialogPanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-customization-title"
        aria-describedby="dashboard-customization-description"
        className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="dashboard-customization-title"
          className="text-lg font-semibold text-primary"
        >
          Customize Dashboard
        </h2>

        <p
          id="dashboard-customization-description"
          className="mt-3 text-sm leading-6 text-muted"
        >
          Choose which widgets appear on your dashboard.
        </p>

        <div
          className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto"
          role="group"
          aria-label="Widget visibility"
        >
          {widgetIds.map((widgetId, index) => {
            const definition = getWidgetDefinition(widgetId);
            const isVisible = widgetVisibility[widgetId] ?? true;

            return (
              <div
                key={widgetId}
                className="flex min-w-0 items-center justify-between gap-3 rounded-md p-2 transition hover:bg-surface-hover"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    id={`widget-visibility-${widgetId}`}
                    ref={index === 0 ? firstCheckboxRef : undefined}
                    checked={isVisible}
                    onChange={() =>
                      setWidgetVisibility(widgetId, !isVisible)
                    }
                    className="h-4 w-4 accent-accent shrink-0"
                  />
                  <label
                    htmlFor={`widget-visibility-${widgetId}`}
                    className="min-w-0 break-words text-sm font-medium text-primary cursor-pointer select-none"
                  >
                    {definition.title}
                  </label>
                </div>

                <span
                  className="shrink-0 text-xs text-muted"
                  aria-hidden="true"
                >
                  {isVisible ? "Visible" : "Hidden"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetDashboardVisibility}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            Reset to Default
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
