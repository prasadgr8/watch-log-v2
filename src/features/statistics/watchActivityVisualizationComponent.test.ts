import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const visualizationSource = readFileSync(
  join(featureDirectory, "components", "WatchActivityVisualization.tsx"),
  "utf-8",
);

/*
 * Source-contract coverage for the A29 Step 2 WatchActivityVisualization
 * presentation, matching the repo's source-contract conventions (see
 * watchActivityTimeline.test.ts): a pure presentational component over the
 * Step 1 WatchActivityVisualizationProjection with native list semantics,
 * VISIBLE period and event-count text, an aria-hidden CSS-only bar driven by
 * the projection's `relativeHeightPercent`, approved truncation and empty-state
 * copy, and no persistence, network, chart, or interaction surface.
 */

/*
 * Tailwind palette utilities that only render correctly on the dark theme. The
 * statistics feature must style itself exclusively through semantic theme
 * utilities, mirroring the guard in statisticsTheme.test.ts.
 */
const HARD_CODED_DARK_PATTERNS = [
  "\\bslate-",
  "\\btext-white\\b",
  "\\bbg-white\\b",
  "\\bblue-",
  "\\bred-",
  "\\bgreen-",
  "\\bgray-",
  "\\bzinc-",
  "\\bindigo-",
  "\\bpurple-",
  "\\bsky-",
  "\\bcyan-",
  "\\borange-",
  "#[0-9a-fA-F]{3,8}\\b",
] as const;

describe("WatchActivityVisualization props and imports", () => {
  it("consumes the approved Step 1 projection and the loading prop", () => {
    expect(visualizationSource).toContain("WatchActivityVisualizationProps");
    expect(visualizationSource).toContain(
      "visualization: WatchActivityVisualizationProjection",
    );
    expect(visualizationSource).toContain("isLoading: boolean");
  });

  it("imports the projection type from the Step 1 feature module", () => {
    expect(visualizationSource).toContain(
      "WatchActivityVisualizationProjection",
    );
    expect(visualizationSource).toContain("../watchActivityVisualization");
  });

  it("reads no persistence, network, or service layer directly", () => {
    expect(visualizationSource).not.toContain("watchHistoryRepository");
    expect(visualizationSource).not.toContain('from "dexie"');
    expect(visualizationSource).not.toContain("fetch(");
    expect(visualizationSource).not.toContain("watchActivityService");
    expect(visualizationSource).not.toContain("statisticsService");
  });

  it("adds no heading of its own, leaving the section heading to the page", () => {
    expect(visualizationSource).not.toMatch(/<h[1-6]/);
  });
});

describe("WatchActivityVisualization rows", () => {
  it("renders one native list item per projection bar", () => {
    expect(visualizationSource).toContain("visualization.bars.map((bar)");
    expect(visualizationSource).toContain("<ol");
    expect(visualizationSource).toContain("<li");
    expect(visualizationSource).toContain("key={bar.key}");
  });

  it("names the list for assistive technology", () => {
    expect(visualizationSource).toContain(
      'aria-label="Recorded activity by period"',
    );
  });

  it("preserves the projection order without sorting or reversing", () => {
    expect(visualizationSource).not.toContain(".sort(");
    expect(visualizationSource).not.toContain(".reverse(");
  });

  it("never filters away zero-count periods", () => {
    expect(visualizationSource).not.toContain(".filter(");
    expect(visualizationSource).not.toContain("eventCount > 0");
  });
});

describe("WatchActivityVisualization visible semantic information", () => {
  it("shows the period as real visible text", () => {
    expect(visualizationSource).toContain(
      "formatPeriodLabel(bar.period, bar.periodStart)",
    );
    expect(visualizationSource).toContain(
      "text-sm font-medium text-primary",
    );
  });

  it("shows the recorded event count as real visible text", () => {
    expect(visualizationSource).toContain(
      'formatCount(bar.eventCount, "event")',
    );
    expect(visualizationSource).toContain(
      "text-base font-semibold text-accent-text",
    );
  });

  it("hides no period or count behind screen-reader-only text", () => {
    // The approved defect fix: period and count must be readable with the
    // decorative bar removed, so `sr-only` may not carry the primary content.
    expect(visualizationSource).not.toContain("sr-only");
  });

  it("pluralizes the event count for a single recorded event", () => {
    expect(visualizationSource).toContain(
      "formatCount(value: number, singular: string)",
    );
    expect(visualizationSource).toContain("value === 1 ? singular");
  });
});
describe("WatchActivityVisualization decorative bar", () => {
  it("drives the bar width from the projection's relativeHeightPercent", () => {
    expect(visualizationSource).toContain("bar.relativeHeightPercent");
    expect(visualizationSource).toContain(
      "width: `${bar.relativeHeightPercent}%`",
    );
  });

  it("performs no visualization arithmetic of its own", () => {
    expect(visualizationSource).not.toContain("Math.round");
    expect(visualizationSource).not.toContain("Math.max");
    expect(visualizationSource).not.toContain("Math.min");
    expect(visualizationSource).not.toContain(".reduce(");
  });

  it("hides the bar from assistive technology and uses theme tokens", () => {
    expect(visualizationSource).toContain('aria-hidden="true"');
    expect(visualizationSource).toContain("bg-surface-elevated");
    expect(visualizationSource).toContain("bg-accent-hover");
    expect(visualizationSource).toContain("border-border");
  });

  it("explains what the bar represents without relying on it", () => {
    expect(visualizationSource).toContain(
      "Bar width represents recorded event count",
    );
  });

  it("respects a reduced-motion preference for the width transition", () => {
    expect(visualizationSource).toContain("transition-[width]");
    expect(visualizationSource).toContain("motion-reduce:transition-none");
  });

  it("adds no chart, SVG, canvas, or progressbar role", () => {
    expect(visualizationSource).not.toContain("<svg");
    expect(visualizationSource).not.toContain("<canvas");
    expect(visualizationSource).not.toContain("viewBox");
    expect(visualizationSource).not.toContain("recharts");
    expect(visualizationSource).not.toContain("chart.js");
    expect(visualizationSource).not.toContain("d3");
    expect(visualizationSource).not.toContain('role="progressbar"');
    expect(visualizationSource).not.toContain("ProgressBar");
  });
});

describe("WatchActivityVisualization loading and empty states", () => {
  it("renders a muted loading box instead of fabricated bars", () => {
    expect(visualizationSource).toContain("if (isLoading)");
    expect(visualizationSource).toContain(
      "Loading watch activity visualization...",
    );
    expect(visualizationSource).toContain("text-center text-sm text-muted");
  });

  it("renders the approved dashed empty state with its exact copy", () => {
    expect(visualizationSource).toContain("visualization.bars.length === 0");
    expect(visualizationSource).toContain("border-dashed");
    expect(visualizationSource).toContain(
      "No recorded activity to visualize yet.",
    );
  });

  it("hides the empty-state icon from assistive technology", () => {
    expect(visualizationSource).toContain('from "lucide-react"');
    expect(visualizationSource).toContain('<History aria-hidden="true"');
  });
});

describe("WatchActivityVisualization truncation", () => {
  it("renders the approved sentence only for a truncated projection", () => {
    expect(visualizationSource).toContain("visualization.truncated");
    expect(visualizationSource).toContain("visualization.omittedBucketCount");
    expect(visualizationSource).toContain("omittedBucketCount > 0");
    expect(visualizationSource).toContain("isTruncated &&");
    expect(visualizationSource).toContain("most recent");
    expect(visualizationSource).toContain("are not shown.");
  });

  it("reports the retained range and the earlier omitted periods", () => {
    expect(visualizationSource).toContain("firstDisplayedLabel");
    expect(visualizationSource).toContain("lastDisplayedLabel");
    expect(visualizationSource).toContain("PERIOD_PLURALS");
    expect(visualizationSource).toContain('day: "days"');
    expect(visualizationSource).toContain('week: "weeks"');
    expect(visualizationSource).toContain('month: "months"');
    expect(visualizationSource).toContain('year: "years"');
  });

  it("adds no second history window and no period selector", () => {
    expect(visualizationSource).not.toContain("windowStart");
    expect(visualizationSource).not.toContain("windowEnd");
    expect(visualizationSource).not.toContain("<select");
    expect(visualizationSource).not.toContain("StatisticsPeriodSelector");
  });
});

describe("WatchActivityVisualization independence and boundaries", () => {
  it("is non-interactive with no handlers or controls", () => {
    expect(visualizationSource).not.toContain("onClick");
    expect(visualizationSource).not.toContain("<button");
    expect(visualizationSource).not.toContain("onKeyDown");
    expect(visualizationSource).not.toContain("onChange");
    expect(visualizationSource).not.toContain("onMouseEnter");
    expect(visualizationSource).not.toContain("title=");
  });

  it("holds no page state and no memoization", () => {
    expect(visualizationSource).not.toContain("useState");
    expect(visualizationSource).not.toContain("useEffect");
    expect(visualizationSource).not.toContain("useMemo");
    expect(visualizationSource).not.toContain("useCallback");
    expect(visualizationSource).not.toContain("useRef");
  });

  it("performs no trend or aggregation calculation", () => {
    expect(visualizationSource).not.toContain("buildWatchActivityTrends");
    expect(visualizationSource).not.toContain("periodOverPeriod");
    expect(visualizationSource).not.toContain("WatchActivityTimelineProjection");
    expect(visualizationSource).not.toContain("WatchActivityTimelineBucket");
  });

  it("reads no clock or current time", () => {
    expect(visualizationSource).not.toContain("Date.now()");
    expect(visualizationSource).not.toContain("new Date()");
  });

  it("styles itself only through semantic theme utilities", () => {
    for (const pattern of HARD_CODED_DARK_PATTERNS) {
      expect(visualizationSource, pattern).not.toMatch(new RegExp(pattern));
    }
  });
});