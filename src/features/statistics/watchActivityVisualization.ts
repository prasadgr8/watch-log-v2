import type {
  WatchActivityTimelineBucket,
  WatchActivityTimelineProjection,
} from "../../domain/analytics/activity";
import type { AnalyticsPeriod } from "../../domain/analytics/types";

/**
 * One display-ready bar derived from an existing watch-activity timeline
 * bucket. The visualization keeps the raw event count alongside its normalized
 * display height so semantic text remains available to the UI.
 */
export interface WatchActivityVisualizationBar {
  readonly key: string;
  readonly period: AnalyticsPeriod;
  readonly periodStart: Date;
  readonly eventCount: number;
  /** Display-only height relative to the largest retained bucket, 0–100. */
  readonly relativeHeightPercent: number;
}

/**
 * Presentation projection for the recorded-activity visualization.
 *
 * This is intentionally derived from WatchActivityTimelineProjection rather
 * than raw history. That keeps the visualization aligned with the timeline
 * 120-bucket presentation boundary and its explicit truncation metadata.
 * No repository, network, clock, or persistence access belongs here.
 */
export interface WatchActivityVisualizationProjection {
  readonly period: AnalyticsPeriod;
  readonly bars: readonly WatchActivityVisualizationBar[];
  readonly naturalBucketCount: number;
  readonly omittedBucketCount: number;
  readonly truncated: boolean;
}

function getMaxEventCount(
  buckets: readonly WatchActivityTimelineBucket[],
): number {
  return buckets.reduce(
    (maxEventCount, bucket) => Math.max(maxEventCount, bucket.eventCount),
    0,
  );
}

function toVisualizationBar(
  bucket: WatchActivityTimelineBucket,
  maxEventCount: number,
): WatchActivityVisualizationBar {
  return {
    key: bucket.key,
    period: bucket.period,
    periodStart: bucket.periodStart,
    eventCount: bucket.eventCount,
    relativeHeightPercent:
      maxEventCount > 0
        ? Math.round((bucket.eventCount / maxEventCount) * 100)
        : 0,
  };
}

/**
 * Converts the existing gap-free timeline projection into the smallest
 * presentation contract needed by the visualization.
 *
 * Empty history stays empty. Truncation metadata is passed through unchanged,
 * and retained bars preserve the timeline ascending order.
 */
export function buildWatchActivityVisualizationProjection(
  timeline: WatchActivityTimelineProjection,
): WatchActivityVisualizationProjection {
  const maxEventCount = getMaxEventCount(timeline.buckets);

  return {
    period: timeline.period,
    bars: timeline.buckets.map((bucket) =>
      toVisualizationBar(bucket, maxEventCount),
    ),
    naturalBucketCount: timeline.naturalBucketCount,
    omittedBucketCount: timeline.omittedBucketCount,
    truncated: timeline.truncated,
  };
}
