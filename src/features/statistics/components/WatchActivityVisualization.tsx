import { History } from "lucide-react";

import type { AnalyticsPeriod } from "../../../domain/analytics/types";
import type { WatchActivityVisualizationProjection } from "../watchActivityVisualization";

interface WatchActivityVisualizationProps {
  visualization: WatchActivityVisualizationProjection;
  isLoading: boolean;
}

/*
 * Presentation-only view over the A29 Step 1 WatchActivityVisualizationProjection.
 *
 * This component owns no reading and no arithmetic over events: the projection
 * arrives fully computed, and every value is rendered verbatim (with
 * display-only formatting). In particular `relativeHeightPercent` is consumed
 * verbatim — the projection is the sole owner of visualization sizing, so this
 * component performs no division, rounding, or maximum search. It performs no
 * repository, network, clock, or persistence access, holds no page state, and
 * exposes no interaction.
 *
 * Each retained period is one native list item, so zero-activity periods stay
 * visible and the rendered order is the projection's retained order. Every row
 * shows its period and recorded event count as real visible text, which keeps
 * the visualization fully readable with the decorative bar removed. The bar is
 * therefore an aria-hidden, CSS-only enhancement and never the sole carrier of
 * a value.
 *
 * Like the timeline, this component adds no heading of its own: StatisticsPage
 * owns the "Historical Viewing Activity" section heading.
 */

const PERIOD_PLURALS: Record<AnalyticsPeriod, string> = {
  day: "days",
  week: "weeks",
  month: "months",
  year: "years",
};

/*
 * Display label for one retained bar period, derived from `periodStart` only —
 * never the exclusive period end and never calendar arithmetic.
 */
function formatPeriodLabel(
  period: AnalyticsPeriod,
  periodStart: Date,
): string {
  switch (period) {
    case "day":
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(periodStart);
    case "week": {
      const mediumDate = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(periodStart);

      return "Week of " + mediumDate;
    }
    case "month":
      return new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(periodStart);
    case "year":
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
      }).format(periodStart);
  }
}

function formatCount(value: number, singular: string): string {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

export default function WatchActivityVisualization({
  visualization,
  isLoading,
}: WatchActivityVisualizationProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Loading watch activity visualization...
      </div>
    );
  }

  if (visualization.bars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <History aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />

        <p className="mt-3 text-sm text-muted">
          No recorded activity to visualize yet.
        </p>
      </div>
    );
  }

  const firstBar = visualization.bars[0];
  const lastBar = visualization.bars[visualization.bars.length - 1];
  const firstDisplayedLabel = formatPeriodLabel(
    firstBar.period,
    firstBar.periodStart,
  );
  const lastDisplayedLabel = formatPeriodLabel(
    lastBar.period,
    lastBar.periodStart,
  );
  const plural = PERIOD_PLURALS[visualization.period];
  const isTruncated =
    visualization.truncated && visualization.omittedBucketCount > 0;

  return (
    <div className="space-y-3">
      {isTruncated && (
        <p className="text-sm text-muted">
          Showing the {visualization.bars.length} most recent {plural} of
          recorded activity ({firstDisplayedLabel} – {lastDisplayedLabel}).{" "}
          {visualization.omittedBucketCount} earlier {plural} before{" "}
          {firstDisplayedLabel} are not shown.
        </p>
      )}

      <ol aria-label="Recorded activity by period" className="space-y-2">
        {visualization.bars.map((bar) => (
          <li
            key={bar.key}
            className="rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-sm font-medium text-primary">
                {formatPeriodLabel(bar.period, bar.periodStart)}
              </span>

              <span className="text-base font-semibold text-accent-text">
                {formatCount(bar.eventCount, "event")}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated"
            >
              <div
                className="h-full rounded-full bg-accent-hover transition-[width] motion-reduce:transition-none"
                style={{ width: `${bar.relativeHeightPercent}%` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted">
        Bar width represents recorded event count relative to the highest
        retained period.
      </p>
    </div>
  );
}
