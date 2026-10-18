import { useCallback, useEffect, useMemo, useState } from "react";

import ConfigurableDashboardGrid from "./ConfigurableDashboardGrid";
import DashboardCustomizationDialog from "./DashboardCustomizationDialog";
import { autoArrangeVisibleWidgets } from "../services/dashboardLayoutService";
import { defaultSizeFor } from "../services/widgetGridConstraints";
import { useDashboardCustomization } from "../services/dashboardCustomizationContext";
import {
  getDefaultDashboardLayout,
  type DashboardWidgetLayout,
} from "../defaultLayout";
import { getWidgetDefinition } from "../widgetRegistry";

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
   * Step 5: the live placement model. The default is packed once so the
   * desktop grid begins collision-free; drag/resize changes remain transient
   * and reload returns to that same packed default.
   */
  const [widgetLayout, setWidgetLayout] = useState<DashboardWidgetLayout[]>(
    () => defaultLayout.widgets,
  );

  /*
   * Receives the collision-free layout the grid packed after each
   * interaction step and merges positions back by widget id, so widgets
   * hidden by customization keep their last known placement.
   */
  const handleLayoutChange = useCallback((next: DashboardWidgetLayout[]) => {
    setWidgetLayout((previous) =>
      previous.map(
        (item) => next.find((entry) => entry.widgetId === item.widgetId) ?? item,
      ),
    );
  }, []);

  const [layoutAnnouncement, setLayoutAnnouncement] = useState("");

  const handleResetLayout = useCallback(() => {
    /*
     * Root cause of the reported "Reset does nothing" perception: the reset
     * itself always wrote the packed approved defaults, but the dialog
     * stayed open on top of the grid and the radio returned to neutral in
     * the same batched update, so there was no observable checked state and
     * the grid change was hidden behind the modal. Keep the behavior exact
     * and deterministic (approved x/y/w/h, 12-column bounds, y >= 0, zero
     * overlaps, no persistence, visibility untouched) and let the dialog's
     * transient radio paint carry the observability.
     */
    const defaultsById = new Map(
      defaultLayout.widgets.map((item) => [item.widgetId, item]),
    );
    setWidgetLayout((current) =>
      current.map((item) => {
        const defaultItem = defaultsById.get(item.widgetId);
        return defaultItem
          ? {
              ...item,
              x: defaultItem.x,
              y: defaultItem.y,
              w: defaultItem.w,
              h: defaultItem.h,
            }
          : item;
      }),
    );
    setLayoutAnnouncement("Dashboard widget layout reset to default.");
  }, [defaultLayout.widgets]);

  /*
   * The dialog-open flag is scoped to this page's lifecycle: clearing it on
   * unmount guarantees that navigating away from /dashboard/preview (which
   * unmounts this page) closes the customization dialog, and returning shows
   * the normal dashboard instead of reopening it. Widget visibility stays in
   * the customization context for the rest of the session.
   */
  useEffect(() => () => setIsCustomizing(false), [setIsCustomizing]);

  /*
   * Compose the rendered layout from the live placement state (updated by
   * drag/resize) overlaid with the transient widget visibility from the
   * customization state. Hidden widgets are filtered out by the grid.
   */
  const layout = useMemo(
    () => ({
      version: defaultLayout.version,
      widgets: widgetLayout.map((item) => ({
        ...item,
        visible: widgetVisibility[item.widgetId] ?? item.visible,
      })),
    }),
    [defaultLayout.version, widgetLayout, widgetVisibility],
  );

  const handleAutoArrange = useCallback(() => {
    const arranged = autoArrangeVisibleWidgets(layout.widgets);
    handleLayoutChange(arranged);
    setLayoutAnnouncement("Visible dashboard widgets auto-arranged.");
  }, [handleLayoutChange, layout.widgets]);

  const handleHideWidget = useCallback(
    (widgetId: DashboardWidgetLayout["widgetId"]) => {
      setWidgetVisibility(widgetId, false);
      setLayoutAnnouncement(
        `${getWidgetDefinition(widgetId).title} widget hidden.`,
      );
    },
    [setWidgetVisibility],
  );

  const handleResetWidgetSize = useCallback(
    (widgetId: DashboardWidgetLayout["widgetId"]) => {
      const nextSize = defaultSizeFor(getWidgetDefinition(widgetId));
      setWidgetLayout((current) =>
        current.map((item) =>
          item.widgetId === widgetId
            ? { ...item, w: nextSize.w, h: nextSize.h }
            : item,
        ),
      );
      setLayoutAnnouncement(
        `${getWidgetDefinition(widgetId).title} widget size reset to default.`,
      );
    },
    [],
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
        <ConfigurableDashboardGrid
          layout={layout.widgets}
          onLayoutChange={handleLayoutChange}
          onHideWidget={handleHideWidget}
          onResetWidgetSize={handleResetWidgetSize}
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {layoutAnnouncement}
        </p>
      </section>

      {isCustomizing && (
        <DashboardCustomizationDialog
          widgetVisibility={widgetVisibility}
          setWidgetVisibility={setWidgetVisibility}
          resetDashboardVisibility={resetDashboardVisibility}
          onAutoArrange={handleAutoArrange}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </div>
  );
}
