import { describe, expect, it } from "vitest";

import type { WatchActivityTimelineProjection } from "../../domain/analytics/activity";

import {
  buildWatchActivityVisualizationProjection,
  type WatchActivityVisualizationProjection,
} from "./watchActivityVisualization";

function createTimeline(
  overrides: Partial<WatchActivityTimelineProjection> = {},
): WatchActivityTimelineProjection {
  return {
    period: "month",
    buckets: [
      {
        period: "month", key: "month:20000",
        periodStart: new Date("2024-01-01T00:00:00"),
        periodEnd: new Date("2024-02-01T00:00:00"),
        eventCount: 4, distinctEpisodeCount: 3, activeDayCount: 2,
        sourceEventCounts: { manual: 4, import: 0 },
      },
      {
        period: "month", key: "month:20031",
        periodStart: new Date("2024-02-01T00:00:00"),
        periodEnd: new Date("2024-03-01T00:00:00"),
        eventCount: 0, distinctEpisodeCount: 0, activeDayCount: 0,
        sourceEventCounts: { manual: 0, import: 0 },
      },
      {
        period: "month", key: "month:20060",
        periodStart: new Date("2024-03-01T00:00:00"),
        periodEnd: new Date("2024-04-01T00:00:00"),
        eventCount: 8, distinctEpisodeCount: 5, activeDayCount: 4,
        sourceEventCounts: { manual: 6, import: 2 },
      },
    ],
    naturalBucketCount: 3, omittedBucketCount: 0, truncated: false,
    ...overrides,
  };
}

describe("buildWatchActivityVisualizationProjection", () => {
  it("projects retained timeline buckets into display bars", () => {
    const projection = buildWatchActivityVisualizationProjection(createTimeline());
    expect(projection.period).toBe("month");
    expect(projection.bars).toHaveLength(3);
    expect(projection.bars.map((bar) => bar.key)).toEqual(["month:20000", "month:20031", "month:20060"]);
    expect(projection.bars.map((bar) => bar.eventCount)).toEqual([4, 0, 8]);
    expect(projection.bars.map((bar) => bar.relativeHeightPercent)).toEqual([50, 0, 100]);
  });

  it("preserves period metadata and display order", () => {
    const projection = buildWatchActivityVisualizationProjection(createTimeline());
    const [first, second, third] = projection.bars;
    expect(first.period).toBe("month");
    expect(first.periodStart).toEqual(new Date("2024-01-01T00:00:00"));
    expect(second.periodStart.getTime()).toBeLessThan(third.periodStart.getTime());
  });

  it("passes through the timeline presentation-boundary metadata unchanged", () => {
    const projection = buildWatchActivityVisualizationProjection(createTimeline({ naturalBucketCount: 240, omittedBucketCount: 120, truncated: true }));
    expect(projection.naturalBucketCount).toBe(240);
    expect(projection.omittedBucketCount).toBe(120);
    expect(projection.truncated).toBe(true);
  });

  it("does not reconstruct a second history window from truncation metadata", () => {
    const timeline = createTimeline({ naturalBucketCount: 240, omittedBucketCount: 120, truncated: true });
    const projection = buildWatchActivityVisualizationProjection(timeline);
    expect(projection.bars).toHaveLength(timeline.buckets.length);
    expect(projection.bars[0].key).toBe(timeline.buckets[0].key);
    expect(projection.bars.at(-1)?.key).toBe(timeline.buckets.at(-1)?.key);
  });

  it("keeps empty history empty without inventing a period or height", () => {
    const projection = buildWatchActivityVisualizationProjection(createTimeline({ buckets: [], naturalBucketCount: 0, omittedBucketCount: 0, truncated: false }));
    expect(projection).toEqual<WatchActivityVisualizationProjection>({
      period: "month", bars: [], naturalBucketCount: 0, omittedBucketCount: 0, truncated: false,
    });
  });

  it("keeps every bar at zero when retained buckets all have zero activity", () => {
    const timeline = createTimeline({ buckets: createTimeline().buckets.map((bucket) => ({ ...bucket, eventCount: 0 })) });
    const projection = buildWatchActivityVisualizationProjection(timeline);
    expect(projection.bars.map((bar) => bar.relativeHeightPercent)).toEqual([0, 0, 0]);
  });

  it("does not mutate the supplied timeline buckets", () => {
    const timeline = createTimeline();
    const originalBuckets = timeline.buckets;
    buildWatchActivityVisualizationProjection(timeline);
    expect(timeline.buckets).toBe(originalBuckets);
    expect(timeline.buckets[0].eventCount).toBe(4);
  });
});
