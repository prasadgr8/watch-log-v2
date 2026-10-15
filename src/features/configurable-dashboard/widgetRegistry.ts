/**
 * Configurable Dashboard — widget registry (Step 1 foundation).
 *
 * Establishes the widget contract for the NEW configurable Dashboard without
 * touching the existing Dashboard at `src/features/dashboard/`. Each
 * definition carries the metadata future steps need (identity, title, default
 * and minimum size, responsive size support, placeholder copy) so drag/drop,
 * resize, configuration, and persistence can build on this contract without a
 * redesign.
 *
 * Step 1 renders foundation-level placeholder shells only. No widget data,
 * services, statistics, analytics, progress values, or actions live here.
 */

/** 12-column desktop grid spans used by the responsive foundation. */
export interface DashboardWidgetSpan {
  /** Columns spanned on the 12-column desktop grid (1-12). */
  w: number;
  /**
   * Row span hint for future drag/resize steps. Step 1 renders natural-height
   * cards; the value is carried so the layout model is future-compatible.
   */
  h: number;
}

export type ConfigurableDashboardWidgetId =
  | "continue-watching"
  | "upcoming-releases"
  | "recently-watched"
  | "watchlog-highlights"
  | "story-landscape"
  | "library-at-a-glance"
  | "top-stories"
  | "quick-actions";

export interface ConfigurableDashboardWidgetDefinition {
  /** Unique widget identifier, also used as the layout key. */
  id: ConfigurableDashboardWidgetId;
  /** Card heading shown in the placeholder shell. */
  title: string;
  /** Short foundation placeholder description. Never statistics/analytics. */
  description: string;
  /** Default grid span on the desktop layout. */
  defaultSize: DashboardWidgetSpan;
  /** Minimum grid span future resize must respect. */
  minSize: DashboardWidgetSpan;
  /**
   * Grid spans the widget supports across responsive breakpoints. Kept
   * generic so future widgets (e.g. recently-added, watchlist,
   * personal-insight) can register without changing the contract.
   */
  supportedSizes: DashboardWidgetSpan[];
  /**
   * Reserved for future per-widget configuration (Step 2+). Declared now so
   * the contract is forward-compatible; intentionally unused in Step 1.
   */
  futureConfig?: Record<string, unknown>;
}

function defineWidget(
  definition: ConfigurableDashboardWidgetDefinition,
): ConfigurableDashboardWidgetDefinition {
  return {
    ...definition,
    supportedSizes: [...definition.supportedSizes],
  };
}

export const WIDGET_REGISTRY: Record<
  ConfigurableDashboardWidgetId,
  ConfigurableDashboardWidgetDefinition
> = {
  "continue-watching": defineWidget({
    id: "continue-watching",
    title: "Continue Watching",
    description:
      "Unfinished stories with the next unwatched episode will appear here.",
    defaultSize: { w: 8, h: 2 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 2 },
      { w: 8, h: 2 },
      { w: 12, h: 2 },
    ],
  }),
  "upcoming-releases": defineWidget({
    id: "upcoming-releases",
    title: "Upcoming Releases",
    description: "Episodes and movies arriving soon will appear here.",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 4, h: 2 },
      { w: 6, h: 2 },
    ],
  }),
  "recently-watched": defineWidget({
    id: "recently-watched",
    title: "Recently Watched",
    description: "Your most recent viewing activity will appear here.",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 4, h: 2 },
      { w: 6, h: 2 },
    ],
  }),
  "watchlog-highlights": defineWidget({
    id: "watchlog-highlights",
    title: "WatchLog Highlights",
    description: "Curated highlights from your library will appear here.",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 1 },
    ],
  }),
  "story-landscape": defineWidget({
    id: "story-landscape",
    title: "Your Story Landscape",
    description: "An overview of the shape of your stories will appear here.",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 1 },
    ],
  }),
  "library-at-a-glance": defineWidget({
    id: "library-at-a-glance",
    title: "Your Library at a Glance",
    description: "A snapshot of your library will appear here.",
    defaultSize: { w: 4, h: 1 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 1 },
    ],
  }),
  "top-stories": defineWidget({
    id: "top-stories",
    title: "Your Top Stories",
    description: "Your highest-rated stories will appear here.",
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 2 },
      { w: 8, h: 2 },
    ],
  }),
  "quick-actions": defineWidget({
    id: "quick-actions",
    title: "Quick Actions",
    description: "Shortcuts to common actions will appear here.",
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 1 },
    supportedSizes: [
      { w: 4, h: 1 },
      { w: 6, h: 2 },
    ],
  }),
};

/**
 * Deterministic registration order for the 8 approved core widgets. The
 * default layout follows this order so first render is stable.
 */
export const CORE_WIDGET_IDS: readonly ConfigurableDashboardWidgetId[] = [
  "continue-watching",
  "upcoming-releases",
  "recently-watched",
  "watchlog-highlights",
  "story-landscape",
  "library-at-a-glance",
  "top-stories",
  "quick-actions",
];

export function getWidgetDefinition(
  id: ConfigurableDashboardWidgetId,
): ConfigurableDashboardWidgetDefinition {
  return WIDGET_REGISTRY[id];
}

export function isConfigurableDashboardWidgetId(
  value: unknown,
): value is ConfigurableDashboardWidgetId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(WIDGET_REGISTRY, value)
  );
}
