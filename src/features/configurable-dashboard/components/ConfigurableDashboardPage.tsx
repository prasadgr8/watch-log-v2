import { useEffect, useMemo } from "react";

import ConfigurableDashboardGrid from "./ConfigurableDashboardGrid";
import DashboardCustomizationDialog from "./DashboardCustomizationDialog";
import { useDashboardCustomization } from "../services/dashboardCustomizationContext";
import { getDefaultDashboardLayout } from "../defaultLayout";

/*
 * NEW configurable Dashboard foundation (Step 1), served at
 * `/dashboard/preview`. Independent from the existing Dashboard at `/`, which
 * remains the fallback/control implementation and is not modified.
 *
 * The hero is intentionally minimal: a title plus one supporting line. This
 * page is a personalized actionable snapshot, not a metrics overview.
 *
 * Step 4 adds dashboard customization: widget visibility is driven by the
 * transient customization state (default layout on every reload) and the
 * Customize Dashboard dialog, without any persistence.
 */
export default function ConfigurableDashboardPage() {
  const {
    widgetVisibility,
    setWidgetVisibility,
    resetDashboardVisibility,
    isCustomizing,
    setIsCustomizing,
  } = useDashboardCustomization();

  const defaultLayout = useMemo(() => getDefaultDashboardLayout(), []);

  /*
   * The dialog-open flag is scoped to this page's lifecycle: clearing it on
   * unmount guarantees that navigating away from /dashboard/preview (which
   * unmounts this page) closes the customization dialog, and returning shows
   * the normal dashboard instead of reopening it. Widget visibility stays in
   * the customization context for the rest of the session.
   */
  useEffect(() => () => setIsCustomizing(false), [setIsCustomizing]);

  /*
   * Compose the rendered layout from the deterministic default layout
   * (positions/spans) overlaid with the transient widget visibility from the
   * customization state. Hidden widgets are filtered out by the grid.
   */
  const layout = useMemo(
    () => ({
      version: defaultLayout.version,
      widgets: defaultLayout.widgets.map((item) => ({
        ...item,
        visible: widgetVisibility[item.widgetId] ?? item.visible,
      })),
    }),
    [defaultLayout, widgetVisibility],
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <section aria-labelledby="configurable-dashboard-heading">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">
          Preview
        </p>
        <h1
          id="configurable-dashboard-heading"
          className="mt-1 break-words text-2xl font-bold text-primary md:text-3xl"
        >
          Your Dashboard
        </h1>
        <p className="mt-2 max-w-2xl break-words text-sm text-muted md:text-base">
          A personalized snapshot of your watch activity, library, and stories.
        </p>
      </section>

      <section aria-label="Dashboard widgets" className="w-full min-w-0">
        <ConfigurableDashboardGrid layout={layout.widgets} />
      </section>

      {isCustomizing && (
        <DashboardCustomizationDialog
          widgetVisibility={widgetVisibility}
          setWidgetVisibility={setWidgetVisibility}
          resetDashboardVisibility={resetDashboardVisibility}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </div>
  );
}
