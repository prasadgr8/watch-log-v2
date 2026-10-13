/*
 * A/B Foundation (Step 0) switch for the Statistics Overview.
 *
 * Single, reversible control that selects which Statistics Overview the page
 * renders. Both the existing StatisticsOverview (control) and the
 * StatisticsOverviewCandidate (candidate) consume the same precomputed
 * StatisticsDashboard owned by the Statistics page, so this choice compares
 * two presentations of identical WatchLog data. It is not a route and carries
 * no URL or persistence state.
 *
 * The current selection is "candidate" for side-by-side comparison with the
 * stable Overview. Set this value to "existing" to restore the baseline
 * presentation.
 */

export type StatisticsOverviewVariant = "existing" | "candidate";

export const STATISTICS_OVERVIEW_VARIANT: StatisticsOverviewVariant =
  "candidate";
