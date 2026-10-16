/**
 * Configurable Dashboard — customization context and consumer hook (Step 4).
 *
 * Split from the provider component (dashboardCustomization.tsx) so each
 * module stays a valid Fast Refresh boundary: this file exports no
 * components, and the provider module exports only its component.
 *
 * Transient, in-memory React state for dashboard widget visibility. No
 * persistence: visibility lives only for the current page session, and a
 * reload returns to the default configuration (see defaultLayout.ts).
 *
 * The Widget Registry remains the authoritative source of registered widgets;
 * this layer only tracks which of them are visible.
 */

import { createContext, useContext } from "react";

import type { ConfigurableDashboardWidgetId } from "../widgetRegistry";

export interface DashboardCustomizationContextValue {
  /** Visibility per widget id, keyed by widget registry id. */
  widgetVisibility: Record<ConfigurableDashboardWidgetId, boolean>;
  /** Toggle visibility for a single widget (applies immediately). */
  setWidgetVisibility: (
    widgetId: ConfigurableDashboardWidgetId,
    visible: boolean,
  ) => void;
  /** Restore every widget to its default (visible) state. */
  resetDashboardVisibility: () => void;
  /**
   * Whether the customization dialog is open. Scoped to the dashboard page
   * lifecycle: ConfigurableDashboardPage clears it on unmount, so navigating
   * away from the dashboard and returning never reopens the dialog.
   */
  isCustomizing: boolean;
  /** Open or close the customization dialog. */
  setIsCustomizing: (isCustomizing: boolean) => void;
}

export const DashboardCustomizationContext =
  createContext<DashboardCustomizationContextValue | null>(null);

/**
 * Consumes the dashboard customization context. Throws when used outside a
 * DashboardCustomizationProvider.
 */
export function useDashboardCustomization(): DashboardCustomizationContextValue {
  const context = useContext(DashboardCustomizationContext);
  if (!context) {
    throw new Error(
      "useDashboardCustomization must be used within a DashboardCustomizationProvider",
    );
  }
  return context;
}
