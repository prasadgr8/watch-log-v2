/**
 * Configurable Dashboard — default layout (Step 1 foundation).
 *
 * Deterministic, versioned default placement for the 8 registered core
 * widgets. The model already carries everything future steps need
 * (widgetId, x, y, w, h, visible, version) so drag/drop, resize, and local
 * persistence can be added later without redesigning the foundation.
 *
 * Step 1 performs no persistence: callers receive a fresh copy of the default
 * on every call.
 */

import {
  CORE_WIDGET_IDS,
  WIDGET_REGISTRY,
  type ConfigurableDashboardWidgetId,
} from "./widgetRegistry";
import { computeLayoutPositions } from "../../domain/dashboardGrid";

export const DASHBOARD_LAYOUT_VERSION = 1 as const;

export interface DashboardWidgetLayout {
  /** Registry key linking this placement to its widget definition. */
  widgetId: ConfigurableDashboardWidgetId;
  /** Zero-based column on the 12-column desktop grid. */
  x: number;
  /** Zero-based row on the desktop grid. */
  y: number;
  /** Column span (1-12 on desktop). */
  w: number;
  /** Row-span hint reserved for future drag/resize steps. */
  h: number;
  /**
   * Show/hide flag. The default layout always ships every widget visible;
   * Step 4 overlays transient customization visibility at the page level
   * without persisting it.
   */
  visible: boolean;
}

export interface DashboardLayout {
  version: typeof DASHBOARD_LAYOUT_VERSION;
  widgets: DashboardWidgetLayout[];
}

/*
 * Hand-authored, Figma-inspired 12-column default composition:
 * Row 0: Continue Watching (8) + Upcoming Releases (4)
 * Row 2: Recently Watched (4) + Highlights (4) + Story Landscape (4)
 * Row 3: Library at a Glance (4), following the shorter secondary cards
 * Row 4: Top Stories (6) + Quick Actions (6)
 * Tablet and mobile reflow to their established responsive columns.
 */
const DEFAULT_PLACEMENTS: ReadonlyArray<{
  widgetId: ConfigurableDashboardWidgetId;
  x: number;
  y: number;
}> = [
  { widgetId: "continue-watching", x: 0, y: 0 },
  { widgetId: "upcoming-releases", x: 8, y: 0 },
  { widgetId: "recently-watched", x: 0, y: 2 },
  { widgetId: "watchlog-highlights", x: 4, y: 2 },
  { widgetId: "story-landscape", x: 8, y: 2 },
  { widgetId: "library-at-a-glance", x: 4, y: 3 },
  { widgetId: "top-stories", x: 0, y: 4 },
  { widgetId: "quick-actions", x: 6, y: 4 },
];

/**
 * Returns a fresh, deterministic copy of the default layout. The order
 * follows registration order and every widget is visible.
 */
export function getDefaultDashboardLayout(): DashboardLayout {
  const widgets = DEFAULT_PLACEMENTS.map((placement) => ({
    widgetId: placement.widgetId,
    x: placement.x,
    y: placement.y,
    w: WIDGET_REGISTRY[placement.widgetId].defaultSize.w,
    h: WIDGET_REGISTRY[placement.widgetId].defaultSize.h,
    visible: true,
  }));

  return {
    version: DASHBOARD_LAYOUT_VERSION,
    widgets: computeLayoutPositions(widgets),
  };
}

/** Registration order used by the grid renderer. */
export function getDefaultWidgetOrder(): ConfigurableDashboardWidgetId[] {
  return [...CORE_WIDGET_IDS];
}
