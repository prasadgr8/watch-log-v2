/**
 * Configurable Dashboard — dashboard customization provider (Step 4).
 *
 * Provides transient, in-memory React state for dashboard widget visibility.
 * No persistence: visibility lives only for the current page session, and a
 * reload returns to the default configuration (every widget visible, per
 * defaultLayout.ts).
 *
 * The Widget Registry remains the authoritative source of registered widgets;
 * this layer only tracks which of them are visible. Default visibility is
 * seeded from CORE_WIDGET_IDS (registry-driven), never from the default
 * placement list, so registry and state cannot drift apart.
 *
 * This module exports only the provider component — the context and consumer
 * hook live in dashboardCustomizationContext.ts — so it remains a valid
 * Fast Refresh boundary.
 */

import { useCallback, useMemo, useState } from "react";

import {
  CORE_WIDGET_IDS,
  type ConfigurableDashboardWidgetId,
} from "../widgetRegistry";
import {
  DashboardCustomizationContext,
  type DashboardCustomizationContextValue,
} from "./dashboardCustomizationContext";

interface DashboardCustomizationProviderProps {
  children: React.ReactNode;
}

/**
 * Provides transient dashboard customization state. Visibility is seeded from
 * the Widget Registry (every registered widget starts visible) and reset on
 * every provider mount, so a page reload always returns to the default
 * configuration.
 */
export function DashboardCustomizationProvider({
  children,
}: DashboardCustomizationProviderProps) {
  // The default layout ships every registered widget visible (defaultLayout
  // ships visible: true for all eight placements), so the default visibility
  // for each registry id is true.
  const defaultVisibility = useMemo(
    () =>
      CORE_WIDGET_IDS.reduce<Record<ConfigurableDashboardWidgetId, boolean>>(
        (acc, widgetId) => {
          acc[widgetId] = true;
          return acc;
        },
        {} as Record<ConfigurableDashboardWidgetId, boolean>,
      ),
    [],
  );

  const [widgetVisibility, setWidgetVisibilityState] =
    useState<Record<ConfigurableDashboardWidgetId, boolean>>(defaultVisibility);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const setWidgetVisibility = useCallback(
    (widgetId: ConfigurableDashboardWidgetId, visible: boolean): void => {
      setWidgetVisibilityState((prev) => ({
        ...prev,
        [widgetId]: visible,
      }));
    },
    [],
  );

  const resetDashboardVisibility = useCallback((): void => {
    setWidgetVisibilityState(defaultVisibility);
  }, [defaultVisibility]);

  const value = useMemo<DashboardCustomizationContextValue>(
    () => ({
      widgetVisibility,
      setWidgetVisibility,
      resetDashboardVisibility,
      isCustomizing,
      setIsCustomizing,
    }),
    [widgetVisibility, setWidgetVisibility, resetDashboardVisibility, isCustomizing, setIsCustomizing],
  );

  return (
    <DashboardCustomizationContext.Provider value={value}>
      {children}
    </DashboardCustomizationContext.Provider>
  );
}
