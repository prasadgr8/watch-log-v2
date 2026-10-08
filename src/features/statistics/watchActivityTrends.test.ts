import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const trendsSource = readFileSync(
  join(featureDirectory, "components", "WatchActivityTrends.tsx"),
  "utf-8",
);

const pageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const watchingActivitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

/*
 * Source-contract coverage for the A28 Step 3 ViewActivityTrends presentation.
 *
 * These follow the established Statistics presentation conventions (see
 * watchActivityTimeline.test.ts): they read the production sources and assert
 * the architectural contract — approved vocabulary, complete metric coverage,
 * empty/loading/null handling, timeline-cap independence, accessibility, and
 * zero arithmetic in the view. The domain's own trend arithmetic is covered in
 * src/domain/analytics/trends.test.ts and is deliberately NOT duplicated here.
 */

describe("WatchActivityTrends props and trend fields", () => {
  it("consumes the approved trends and isLoading props", () => {
    expect(trendsSource).toContain("trends: WatchActivityTrends");
    expect(trendsSource).toContain("isLoading: boolean");
  });

  it("surfaces every required trend field", () => {
    expect(trendsSource).toContain("trends.activePeriodCount");
    expect(trendsSource).toContain("trends.inactivePeriodCount");
    expect(trendsSource).toContain(
      "trends.latestConsecutiveActivePeriods",
    );
    expect(trendsSource).toContain("trends.longestConsecutiveActivePeriods");
    expect(trendsSource).toContain("periodOverPeriod.percentageChange");
    expect(trendsSource).toContain("periodOverPeriod.previousEventCount");
    expect(trendsSource).toContain("periodOverPeriod.currentEventCount");
    expect(trendsSource).toContain("periodOverPeriod.hasPredecessor");
    expect(trendsSource).toContain("trends.totalPeriodCount");
  });

  it("uses the approved A28 presentation vocabulary", () => {
    for (const label of [
      "Active",
      "Inactive",
      "Current Run",
      "Longest Run",
      "Change",
      "Previous",
      "Current",
      "Viewing Activity",
    ]) {
      expect(trendsSource).toContain(label);
    }
  });

  it("keeps the recorded-activity supporting wording", () => {
    expect(trendsSource).toContain(
      "Consecutive periods with recorded activity.",
    );
  });

  it("never substitutes recorded activity with Watched", () => {
    expect(trendsSource).not.toMatch(/\bWatched\b/);
  });
});
describe("WatchActivityTrends change presentation", () => {
  it("formats positive, negative, and zero percentage changes", () => {
    expect(trendsSource).toContain("formatPercentage");
    expect(trendsSource).toContain('rounded > 0 ? "+" : ""');
    expect(trendsSource).toContain("${rounded}%");
  });

  it("renders a placeholder instead of a percentage when the ratio is null", () => {
    expect(trendsSource).toContain("percentageChange === null");
    expect(trendsSource).toContain("PLACEHOLDER");
    expect(trendsSource).toContain("Number.isFinite(percentageChange)");
  });

  it("never renders a misleading zero percent for an undefined ratio", () => {
    expect(trendsSource).toMatch(
      /percentageChange === null[\s\S]{0,120}PLACEHOLDER/,
    );
  });

  it("omits the comparison values when there is no predecessor", () => {
    expect(trendsSource).toContain("periodOverPeriod.hasPredecessor");
    expect(trendsSource).toContain("previousEventCount !== null");
  });
});

describe("WatchActivityTrends empty and loading behavior", () => {
  it("suppresses the metric cards when no period was recorded", () => {
    expect(trendsSource).toContain("trends.totalPeriodCount > 0");
    expect(trendsSource).toContain("No recorded activity to compare yet.");
    expect(trendsSource).toContain("border-dashed");
  });

  it("renders the Viewing Activity label alongside the empty message", () => {
    expect(trendsSource).toMatch(
      /Viewing Activity[\s\S]{0,400}No recorded activity to compare yet\./,
    );
  });

  it("uses the established loading placeholder", () => {
    expect(trendsSource).toContain('const PLACEHOLDER = "—"');
    expect(trendsSource).toContain("isLoading ? PLACEHOLDER : value");
  });

  it("introduces no trend-specific error state or extra request", () => {
    expect(trendsSource).not.toContain('role="alert"');
    // The component may NAME the service loader in prose, but must never call
    // one: it receives fully computed trends and never reads storage.
    expect(trendsSource).not.toMatch(/loadWatchActivity\w*\s*\(/);
    expect(trendsSource).not.toContain("useState");
    expect(trendsSource).not.toContain("useEffect");
  });
});
describe("WatchActivityTrends boundary and independence", () => {
  it("performs no trend arithmetic in the view", () => {
    // Formatting a ratio is allowed; deriving one is not. The view may scale a
    // ratio for display (`x * 100`), but it must never add, subtract, divide,
    // or aggregate any trend field, and must not re-derive a ratio.
    expect(trendsSource).not.toMatch(
      /(activePeriodCount|inactivePeriodCount|percentageChange|absoluteChange|currentEventCount|previousEventCount|latestConsecutiveActivePeriods|longestConsecutiveActivePeriods|totalPeriodCount)\s*[-+/]/,
    );
    expect(trendsSource).not.toContain("Math.max");
    expect(trendsSource).not.toContain("Math.min");
    expect(trendsSource).not.toContain(".reduce(");
    expect(trendsSource).not.toContain(".filter(");
    expect(trendsSource).not.toContain("buildWatchActivityTrends");
  });

  it("stays independent of the timeline and its bucket cap", () => {
    expect(trendsSource).not.toContain("WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS");
    expect(trendsSource).not.toContain("truncated");
    expect(trendsSource).not.toContain("omittedBucketCount");
    expect(trendsSource).not.toContain("buckets");
    expect(trendsSource).not.toContain("WatchActivityTimelineProjection");
  });

  it("reads no repository, network, or clock dependency", () => {
    expect(trendsSource).not.toContain("watchHistoryRepository");
    expect(trendsSource).not.toContain('from "dexie"');
    expect(trendsSource).not.toContain("fetch(");
    expect(trendsSource).not.toContain("Date.now(");
    expect(trendsSource).not.toContain("localStorage");
  });
});

describe("WatchActivityTrends accessibility and layout", () => {
  it("adds no chart, SVG, canvas, or progressbar role", () => {
    expect(trendsSource).not.toContain("<svg");
    expect(trendsSource).not.toContain("viewBox");
    expect(trendsSource).not.toContain("<canvas");
    expect(trendsSource).not.toContain('role="progressbar"');
    expect(trendsSource).not.toContain("recharts");
    expect(trendsSource).not.toContain("chart.js");
  });

  it("adds no interaction, button, or hover-only information", () => {
    expect(trendsSource).not.toContain("<button");
    expect(trendsSource).not.toContain("onClick");
    expect(trendsSource).not.toContain("onKeyDown");
    expect(trendsSource).not.toMatch(/hover:/);
  });

  it("hides decorative icons from assistive technology", () => {
    expect(trendsSource).toContain('aria-hidden="true"');
  });

  it("creates no new heading hierarchy", () => {
    expect(trendsSource).not.toMatch(/<h[1-6]/);
  });

  it("uses the established semantic statistics theme tokens", () => {
    for (const token of [
      "border-border",
      "bg-surface",
      "text-primary",
      "text-muted",
      "text-accent-text",
      "rounded-xl",
    ]) {
      expect(trendsSource).toContain(token);
    }
  });

  it("uses the responsive grid convention with no fixed or scrollable widths", () => {
    expect(trendsSource).toContain("grid gap-4 md:grid-cols-");
    expect(trendsSource).not.toContain("min-w-[");
    expect(trendsSource).not.toContain("max-w-[");
    expect(trendsSource).not.toContain("overflow-x");
    expect(trendsSource).not.toMatch(/w-\[\d/);
  });
});
describe("StatisticsPage trends integration", () => {
  it("passes the already-loaded trends to the new presentation", () => {
    expect(watchingActivitySectionSource).toContain(
      'import WatchActivityTrends from "./WatchActivityTrends"',
    );
    expect(watchingActivitySectionSource).toContain("<WatchActivityTrends");
    expect(watchingActivitySectionSource).toContain(
      "trends={activitySection.trends}",
    );
    expect(watchingActivitySectionSource).toContain(
      "isLoading={isActivityLoading}",
    );
    expect(pageSource).toContain("<WatchingActivitySection");
  });

  it("introduces no additional service call or activity state", () => {
    const sectionCalls =
      pageSource.split("loadWatchActivitySection(activityPeriod)").length - 1;

    expect(sectionCalls).toBe(1);
    expect(pageSource).toContain("WatchActivitySection");
    expect(pageSource).not.toContain("loadWatchActivityTrends");
  });

  it("keeps the summary, trends, and timeline in the established order", () => {
    expect(watchingActivitySectionSource).toMatch(
      /<HistoricalViewingActivity[\s\S]*<WatchActivityTrends[\s\S]*<WatchActivityTimeline/,
    );
  });
});