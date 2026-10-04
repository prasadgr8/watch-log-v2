import { History } from "lucide-react";

import type {
  WatchActivityTimelineBucket,
  WatchActivityTimelineProjection,
} from "../../../domain/analytics/activity";
import type { AnalyticsPeriod } from "../../../domain/analytics/types";

interface WatchActivityTimelineProps {
  timeline: WatchActivityTimelineProjection;
  isLoading: boolean;
}

/*
 * Presentation-only view over a gap-free WatchActivityTimelineProjection.
 *
 * This component owns no reading and no arithmetic over events: the timeline
 * arrives fully computed from `watchActivityService`, and every value is
 * rendered verbatim (with display-only formatting). It performs no repository,
 * network, clock, or persistence access, holds no page state, and exposes no
 * interaction — the Statistics page owns loading and period selection.
 *
 * Buckets are rendered as one native list item each so zero-activity periods
 * stay visible, and the decorative bar is a CSS-only ratio (aria-hidden, never
 * a progressbar role) scaled against the largest displayed bucket.
 */

/* Plural forms used by the informational truncation sentence. */
const PERIOD_PLURALS: Record<AnalyticsPeriod, string> = {
  day: "days",
  week: "weeks",
  month: "months",
  year: "years",
};

/*
 * Display label for one bucket period, derived from `periodStart` only —
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

export default function WatchActivityTimeline({
  timeline,
  isLoading,
}: WatchActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Loading watch activity timeline...
      </div>
    );
  }

  if (timeline.buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <History aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />

        <p className="mt-3 text-sm text-muted">
          No recorded watch activity to display yet.
        </p>
      </div>
    );
  }

  const maxEventCount = timeline.buckets.reduce(
    (max, bucket) => Math.max(max, bucket.eventCount),
    0,
  );

  const firstBucket: WatchActivityTimelineBucket = timeline.buckets[0];
  const lastBucket: WatchActivityTimelineBucket =
    timeline.buckets[timeline.buckets.length - 1];
  const firstDisplayedLabel = formatPeriodLabel(
    firstBucket.period,
    firstBucket.periodStart,
  );
  const lastDisplayedLabel = formatPeriodLabel(
    lastBucket.period,
    lastBucket.periodStart,
  );
  const plural = PERIOD_PLURALS[timeline.period];
  const isTruncated =
    timeline.truncated && timeline.omittedBucketCount > 0;

  return (
    <div className="space-y-3">
      {isTruncated && (
        <p className="text-sm text-muted">
          Showing the {timeline.buckets.length} most recent {plural} of
          recorded activity ({firstDisplayedLabel} – {lastDisplayedLabel}).{" "}
          {timeline.omittedBucketCount} earlier {plural} before{" "}
          {firstDisplayedLabel} are not shown.
        </p>
      )}

      <ul className="space-y-2">
        {timeline.buckets.map((bucket) => {
          const barWidthPercent =
            maxEventCount > 0
              ? Math.round((bucket.eventCount / maxEventCount) * 100)
              : 0;

          return (
            <li
              key={bucket.key}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-sm font-medium text-primary">
                  {formatPeriodLabel(bucket.period, bucket.periodStart)}
                </span>

                <span className="text-base font-semibold text-accent-text">
                  {formatCount(bucket.eventCount, "event")}
                </span>

                <span className="text-xs text-muted">
                  {formatCount(
                    bucket.distinctEpisodeCount,
                    "distinct episode",
                  )}
                </span>

                <span className="text-xs text-muted">
                  {formatCount(bucket.activeDayCount, "active day")}
                </span>

                <span className="text-xs text-muted">
                  {formatCount(bucket.sourceEventCounts.manual, "manual event")}
                </span>

                <span className="text-xs text-muted">
                  {formatCount(bucket.sourceEventCounts.import, "imported event")}
                </span>
              </div>

              <div
                aria-hidden="true"
                className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated"
              >
                <div
                  className="h-full rounded-full bg-accent-hover"
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}