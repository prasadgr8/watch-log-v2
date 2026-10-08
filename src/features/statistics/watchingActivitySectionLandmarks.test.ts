import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const watchingActivitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the A30 Step 3.1 Watching Activity
 * landmark refinement: the four existing content blocks are grouped in named
 * landmarks bound to their own sub-headings, mirroring the Statistics
 * Overview section pattern, while every child presentation stays intact.
 *
 * This is structural/accessibility presentation coverage only: data flow,
 * loading, empty-state, truncation, spacing, density, typography, and the
 * A28/A29 contracts are unchanged and remain pinned by their own tests.
 */

const SECTION_IDS = [
  "watching-activity-summary",
  "watching-activity-visualization",
  "watching-activity-trends",
  "watching-activity-timeline",
] as const;

const SECTION_HEADINGS = [
  "Historical Summary",
  "Activity Visualization",
  "Viewing Activity Trends",
  "Activity Timeline",
] as const;

describe("watching activity subsection landmarks", () => {
  it("groups each content block in a landmark named by its own heading", () => {
    expect(watchingActivitySectionSource.match(/<section/g)).toHaveLength(
      SECTION_IDS.length,
    );

    for (const sectionId of SECTION_IDS) {
      const landmarkIndex = watchingActivitySectionSource.indexOf(
        `aria-labelledby="${sectionId}"`,
      );
      const headingIndex = watchingActivitySectionSource.indexOf(
        `id="${sectionId}"`,
      );

      expect(landmarkIndex, sectionId).toBeGreaterThan(-1);
      expect(headingIndex, sectionId).toBeGreaterThan(landmarkIndex);
    }
  });

  it("keeps the tab-level h2 and adds exactly four h3 sub-headings", () => {
    expect(watchingActivitySectionSource).toContain(
      "Historical Viewing Activity",
    );
    expect(watchingActivitySectionSource.match(/<h2/g)).toHaveLength(1);
    expect(watchingActivitySectionSource.match(/<h3/g)).toHaveLength(
      SECTION_HEADINGS.length,
    );

    for (const heading of SECTION_HEADINGS) {
      expect(watchingActivitySectionSource).toContain(heading);
    }
  });

  it("keeps the subsections in the established presentation order", () => {
    const compactSectionSource = watchingActivitySectionSource.replace(
      /\s+/g,
      "",
    );
    let previousIndex = -1;

    for (const heading of SECTION_HEADINGS) {
      const compactHeading = heading.replace(/\s+/g, "");
      const index = compactSectionSource.indexOf(`>${compactHeading}<`);

      expect(index, heading).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    expect(watchingActivitySectionSource).toMatch(
      /<HistoricalViewingActivity[\s\S]*<WatchActivityVisualization[\s\S]*<WatchActivityTrends[\s\S]*<WatchActivityTimeline/,
    );
  });

  it("keeps every existing child presentation intact", () => {
    expect(watchingActivitySectionSource).toContain(
      "<HistoricalViewingActivity",
    );
    expect(watchingActivitySectionSource).toContain(
      "activity={activitySection.summary}",
    );
    expect(watchingActivitySectionSource).toContain(
      "<WatchActivityVisualization",
    );
    expect(watchingActivitySectionSource).toContain(
      "buildWatchActivityVisualizationProjection(",
    );
    expect(watchingActivitySectionSource).toContain("activitySection.timeline");
    expect(watchingActivitySectionSource).toContain("<WatchActivityTrends");
    expect(watchingActivitySectionSource).toContain(
      "trends={activitySection.trends}",
    );
    expect(watchingActivitySectionSource).toContain("<WatchActivityTimeline");
    expect(watchingActivitySectionSource).toContain(
      "timeline={activitySection.timeline}",
    );
    expect(watchingActivitySectionSource).toContain(
      "isLoading={isActivityLoading}",
    );
    expect(watchingActivitySectionSource).toContain("<StatisticsPeriodSelector");
    expect(watchingActivitySectionSource).toContain('role="alert"');
    expect(watchingActivitySectionSource).toContain("activitySection !== null");
  });
});
