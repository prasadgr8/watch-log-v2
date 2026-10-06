export type StatisticsSection = "overview" | "activity";

export const STATISTICS_TAB_IDS: Record<StatisticsSection, string> = {
  overview: "statistics-tab-overview",
  activity: "statistics-tab-activity",
};

export const STATISTICS_PANEL_IDS: Record<StatisticsSection, string> = {
  overview: "statistics-panel-overview",
  activity: "statistics-panel-activity",
};