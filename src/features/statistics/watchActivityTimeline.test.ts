import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const timelineSource = readFileSync(
  join(featureDirectory, "components", "WatchActivityTimeline.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the Step 3.2.2a WatchActivityTimeline
 * presentation, matching the repo's source-contract conventions: a pure
 * presentational component over WatchActivityTimelineProjection with native
 * list semantics, textual metrics, a decorative CSS-only bar, approved
 * truncation and empty-state copy, responsive wrapping layout, and no
 * persistence, network, chart, or interaction surface.
 */

describe("WatchActivityTimeline props and imports", () => {
  it("exports the WatchActivityTimeline component with the approved props", () => {
    expect(timelineSource).toContain("WatchActivityTimelineProps");
    expect(timelineSource).toContain(
      "timeline: WatchActivityTimelineProjection",
    );
    expect(timelineSource).toContain("isLoading: boolean");
  });

  it("imports the projection type from the analytics domain", () => {
    expect(timelineSource).toContain("WatchActivityTimelineProjection");
    expect(timelineSource).toContain("../../../domain/analytics/activity");
  });

  it("reads no persistence or network layer directly from the UI", () => {
    expect(timelineSource).not.toContain("watchHistoryRepository");
    expect(timelineSource).not.toContain('from "dexie"');
    expect(timelineSource).not.toContain("fetch(");
    expect(timelineSource).not.toContain("watchActivityService(");
  });
});

describe("WatchActivityTimeline semantic markup", () => {
  it("renders the timeline as a native list with one keyed item per bucket", () => {
    expect(timelineSource).toContain("<ul");
    expect(timelineSource).toContain("<li");
    expect(timelineSource).toContain("key={bucket.key}");
  });

  it("uses a wrapping responsive layout with text sizing utilities", () => {
    expect(timelineSource).toContain("flex-wrap");
    expect(timelineSource).toContain("gap-x-4");
    expect(timelineSource).toContain("gap-y-1");
    expect(timelineSource).toMatch(/text-(xs|sm)\b/);
  });

  it("adds no heading of its own", () => {
    expect(timelineSource).not.toMatch(/<h[1-6]/);
  });
});

describe("WatchActivityTimeline period labels", () => {
  it("formats day and week labels with the medium date style", () => {
    expect(timelineSource).toContain('dateStyle: "medium"');
    expect(timelineSource).toContain('"Week of "');
  });

  it("formats month labels with a long month and numeric year", () => {
    expect(timelineSource).toContain('month: "long"');
    expect(timelineSource).toContain('year: "numeric"');
  });

  it("labels buckets from periodStart only", () => {
    expect(timelineSource).toContain("periodStart");
    expect(timelineSource).not.toContain("periodEnd");
  });
});

describe("WatchActivityTimeline empty state", () => {
  it("renders an established dashed empty state when there are no buckets", () => {
    expect(timelineSource).toContain("timeline.buckets.length === 0");
    expect(timelineSource).toContain("border-dashed");
    expect(timelineSource).toContain("History");
    expect(timelineSource).toContain(
      "No recorded watch activity to display yet.",
    );
  });

  it("hides the empty-state icon from assistive technology and fabricates no range", () => {
    expect(timelineSource).toContain('aria-hidden="true"');
    expect(timelineSource).not.toContain("windowStart");
    expect(timelineSource).not.toContain("windowEnd");
  });
});

describe("WatchActivityTimeline truncation", () => {
  it("renders the approved sentence only for a truncated timeline", () => {
    expect(timelineSource).toContain("timeline.truncated");
    expect(timelineSource).toContain("timeline.omittedBucketCount");
    expect(timelineSource).toContain("omittedBucketCount > 0");
    expect(timelineSource).toContain("isTruncated &&");
    expect(timelineSource).toContain("most recent");
    expect(timelineSource).toContain("are not shown.");
  });

  it("pluralizes the truncation copy per period granularity", () => {
    expect(timelineSource).toContain("PERIOD_PLURALS");
    expect(timelineSource).toContain('day: "days"');
    expect(timelineSource).toContain('week: "weeks"');
    expect(timelineSource).toContain('month: "months"');
    expect(timelineSource).toContain('year: "years"');
  });
});

describe("WatchActivityTimeline metrics", () => {
  it("shows every per-bucket metric as real text", () => {
    expect(timelineSource).toContain("bucket.eventCount");
    expect(timelineSource).toContain("bucket.distinctEpisodeCount");
    expect(timelineSource).toContain("bucket.activeDayCount");
    expect(timelineSource).toContain("bucket.sourceEventCounts.manual");
    expect(timelineSource).toContain("bucket.sourceEventCounts.import");
  });

  it("keeps event count as the primary value and never hides zero buckets", () => {
    expect(timelineSource).toContain("font-semibold text-accent-text");
    expect(timelineSource).not.toContain(".filter(");
    expect(timelineSource).not.toContain("eventCount > 0 &&");
  });
});

describe("WatchActivityTimeline decorative bar", () => {
  it("renders an aria-hidden CSS bar scaled against the maximum event count", () => {
    expect(timelineSource).toContain('aria-hidden="true"');
    expect(timelineSource).toContain("maxEventCount");
    expect(timelineSource).toContain("Math.round(");
    expect(timelineSource).toContain("maxEventCount > 0");
    expect(timelineSource).toContain("style={{ width:");
    expect(timelineSource).toContain("bg-surface-elevated");
    expect(timelineSource).toContain("bg-accent-hover");
  });

  it("uses no progressbar role, SVG, or chart visualization", () => {
    expect(timelineSource).not.toContain('role="progressbar"');
    expect(timelineSource).not.toContain("<svg");
    expect(timelineSource).not.toContain("viewBox");
    expect(timelineSource).not.toContain("recharts");
    expect(timelineSource).not.toContain("chart.js");
    expect(timelineSource).not.toContain("ProgressBar");
  });
});

describe("WatchActivityTimeline interaction and state", () => {
  it("is non-interactive with no handlers or controls", () => {
    expect(timelineSource).not.toContain("onClick");
    expect(timelineSource).not.toContain("<button");
    expect(timelineSource).not.toContain("onKeyDown");
    expect(timelineSource).not.toContain("onChange");
  });

  it("holds no page state and no memoization", () => {
    expect(timelineSource).not.toContain("useState");
    expect(timelineSource).not.toContain("useEffect");
    expect(timelineSource).not.toContain("useMemo");
    expect(timelineSource).not.toContain("useCallback");
    expect(timelineSource).not.toContain("useRef");
  });
});

describe("WatchActivityTimeline responsive layout", () => {
  it("rejects fixed sizing and horizontal overflow", () => {
    expect(timelineSource).not.toContain("min-w-[");
    expect(timelineSource).not.toContain("max-w-[");
    expect(timelineSource).not.toMatch(/w-\[\d/);
    expect(timelineSource).not.toMatch(/width:\s*["']?\d+px/);
    expect(timelineSource).not.toContain("overflow-x");
    expect(timelineSource).not.toContain("whitespace-nowrap");
  });
});

describe("WatchActivityTimeline loading", () => {
  it("renders a muted loading box instead of stale bucket rows", () => {
    expect(timelineSource).toContain("isLoading");
    expect(timelineSource).toContain("Loading watch activity timeline...");
    expect(timelineSource).toContain("text-center text-sm text-muted");
    expect(timelineSource).toContain("if (isLoading)");
  });
});

