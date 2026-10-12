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
 * The default is "existing" so the stable Overview stays the default. Flip to
 * "candidate" to render the new candidate shell for side-by-side comparison;
 * revert to "existing" (or remove this module and the page branch) to restore
 * the baseline behaviour exactly.
 */

export type StatisticsOverviewVariant = "existing" | "candidate";

export const STATISTICS_OVERVIEW_VARIANT: StatisticsOverviewVariant =
  "candidate";
