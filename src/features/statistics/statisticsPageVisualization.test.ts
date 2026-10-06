import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));
const statisticsPageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const watchingActivitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

describe("StatisticsPage A29 Step 3 visualization integration", () => {
  it("imports the native visualization component and Step 1 projection builder", () => {
    expect(watchingActivitySectionSource).toContain(
      'import WatchActivityVisualization from "./WatchActivityVisualization";',
    );
    expect(watchingActivitySectionSource).toContain(
      'import { buildWatchActivityVisualizationProjection } from "../watchActivityVisualization";',
    );
    expect(statisticsPageSource).toContain(
      'import WatchingActivitySection from "./components/WatchingActivitySection";',
    );
  });

  it("derives visualization data from the existing activity timeline", () => {
    expect(watchingActivitySectionSource).toContain(
      "buildWatchActivityVisualizationProjection(",
    );
    expect(watchingActivitySectionSource).toContain("activitySection.timeline");
  });

  it("passes the existing activity loading state to the visualization", () => {
    expect(watchingActivitySectionSource).toContain(
      "<WatchActivityVisualization",
    );
    expect(watchingActivitySectionSource).toContain(
      "isLoading={isActivityLoading}",
    );
  });

  it("keeps the existing period selector as the only activity period control", () => {
    expect(watchingActivitySectionSource).toContain("<StatisticsPeriodSelector");
    expect(watchingActivitySectionSource).not.toContain(
      "<WatchActivityVisualizationSelector",
    );
  });

  it("does not add a second activity read or service call", () => {
    const matches = statisticsPageSource.match(
      /loadWatchActivitySection\(activityPeriod\)/g,
    );
    expect(matches).toHaveLength(1);
    expect(statisticsPageSource).not.toContain(
      "loadWatchActivitySection(visualization",
    );
  });

  it("renders the visualization before trends and the existing timeline", () => {
    const visualizationIndex = watchingActivitySectionSource.indexOf(
      "<WatchActivityVisualization",
    );
    const trendsIndex = watchingActivitySectionSource.indexOf(
      "<WatchActivityTrends",
    );
    const timelineIndex = watchingActivitySectionSource.indexOf(
      "<WatchActivityTimeline",
    );

    expect(visualizationIndex).toBeGreaterThan(-1);
    expect(trendsIndex).toBeGreaterThan(visualizationIndex);
    expect(timelineIndex).toBeGreaterThan(trendsIndex);
  });

  it("does not introduce a second activity state or visualization-specific effect", () => {
    expect(statisticsPageSource).not.toContain("visualizationPeriod");
    expect(statisticsPageSource).not.toContain("visualizationSection");
    expect(statisticsPageSource).not.toContain("useVisualizationEffect");
  });
});
