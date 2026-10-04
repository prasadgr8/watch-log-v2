import type { AnalyticsPeriod } from "../../../domain/analytics/types";
import type { WatchActivityVisualizationProjection } from "../watchActivityVisualization";

interface WatchActivityVisualizationProps {
  visualization: WatchActivityVisualizationProjection;
  isLoading: boolean;
}

const PERIOD_PLURALS: Record<AnalyticsPeriod, string> = {
  day: "days",
  week: "weeks",
  month: "months",
  year: "years",
};

function formatPeriodLabel(period: AnalyticsPeriod, periodStart: Date): string {
  switch (period) {
    case "day":
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(periodStart);
    case "week":
      return "Week of " + new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(periodStart);
    case "month":
      return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(periodStart);
    case "year":
      return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(periodStart);
  }
}

function formatCount(value: number): string {
  return `${value} ${value === 1 ? "event" : "events"}`;
}

/**
 * Presentation-only native bar visualization over the Step 1 projection.
 *
 * Each retained period remains a semantic list item with visible text for its
 * period and event count. The vertical bars are decorative CSS enhancements;
 * they never become the only representation of the data.
 */
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
        <p className="text-sm text-muted">
          No recorded activity to visualize yet.
        </p>
      </div>
    );
  }

  const firstBar = visualization.bars[0];
  const lastBar = visualization.bars[visualization.bars.length - 1];
  const plural = PERIOD_PLURALS[visualization.period];
  const isTruncated =
    visualization.truncated && visualization.omittedBucketCount > 0;

  return (
    <div className="space-y-3">
      {isTruncated && (
        <p className="text-sm text-muted">
          Showing the {visualization.bars.length} most recent {plural} of
          recorded activity. {visualization.omittedBucketCount} earlier{" "}
          {plural} are not shown.
        </p>
      )}

      <ol
        aria-label="Recorded activity by period"
        className="flex h-56 items-end gap-1 rounded-xl border border-border bg-surface p-4"
      >
        {visualization.bars.map((bar) => {
          const periodLabel = formatPeriodLabel(bar.period, bar.periodStart);

          return (
            <li
              key={bar.key}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <span className="sr-only">
                {periodLabel}: {formatCount(bar.eventCount)}
              </span>

              <div
                aria-hidden="true"
                className="w-full rounded-t-md bg-accent-hover transition-[height]"
                style={{ height: `${bar.relativeHeightPercent}%` }}
              />
            </li>
          );
        })}
      </ol>

      <div className="flex items-start justify-between gap-4 text-xs text-muted">
        <span>{formatPeriodLabel(firstBar.period, firstBar.periodStart)}</span>
        {visualization.bars.length > 2 && (
          <span>
            {formatPeriodLabel(
              visualization.bars[
                Math.floor(visualization.bars.length / 2)
              ].period,
              visualization.bars[
                Math.floor(visualization.bars.length / 2)
              ].periodStart,
            )}
          </span>
        )}
        <span>{formatPeriodLabel(lastBar.period, lastBar.periodStart)}</span>
      </div>

      <p className="text-xs text-muted">
        Bar height represents recorded event count relative to the highest
        retained period.
      </p>
    </div>
  );
}
