import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const summarySource = readFileSync(
  join(featureDirectory, "components", "HistoricalViewingActivity.tsx"),
  "utf-8",
);

const trendsSource = readFileSync(
  join(featureDirectory, "components", "WatchActivityTrends.tsx"),
  "utf-8",
);

const watchingActivitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the A30 Step 3.2 Watching Activity
 * density/typography alignment: summary and trends card grids follow the
 * tightened Statistics Overview convention, custom value typography matches
 * the refined StatisticCard-adjacent pattern, and date values are no longer
 * rendered as headings — while the Step 3.1 landmarks, order, props, and
 * the A28/A29 contracts stay intact.
 *
 * Presentation-only coverage: data flow, loading/empty-state, truncation,
 * period semantics, and analytics behavior are unchanged and remain pinned
 * by their own tests.
 */

describe("watching activity density alignment", () => {
  it("uses the tightened grid convention in summary and trends cards", () => {
    expect(summarySource).not.toContain("grid gap-6");
    expect(summarySource.match(/grid gap-4 /g)).toHaveLength(3);
    expect(trendsSource).not.toContain("grid gap-6");
    expect(trendsSource).toContain("grid gap-4 md:grid-cols-4");
    expect(trendsSource).toContain("grid gap-4 md:grid-cols-3");
  });

  it("aligns summary block spacing with the overview section convention", () => {
    expect(summarySource).toContain('className="space-y-4"');
    expect(summarySource).not.toContain("space-y-6");
  });
});

describe("watching activity typography alignment", () => {
  it("renders date and period values as non-heading text", () => {
    expect(summarySource).not.toContain("<h3");
    expect(summarySource).toContain(
      '<p className="mt-2 text-lg font-semibold text-primary">',
    );
  });

  it("avoids oversized numeric values in the custom trends cards", () => {
    expect(trendsSource).not.toContain("text-2xl");
    expect(trendsSource.match(/mt-2 text-lg font-semibold text-primary/g))
      .toHaveLength(2);
  });

  it("keeps the Step 3.1 heading hierarchy intact", () => {
    expect(watchingActivitySectionSource.match(/<h2/g)).toHaveLength(1);
    expect(watchingActivitySectionSource.match(/<h3/g)).toHaveLength(4);
    expect(watchingActivitySectionSource).toContain("Historical Summary");
    expect(watchingActivitySectionSource).toContain("Activity Visualization");
    expect(watchingActivitySectionSource).toContain("Viewing Activity Trends");
    expect(watchingActivitySectionSource).toContain("Activity Timeline");
  });
});

describe("watching activity static card affordances", () => {
  it("implies no clickability on static activity cards", () => {
    for (const source of [summarySource, trendsSource]) {
      expect(source).not.toContain("hover:border-accent-hover");
      expect(source).not.toContain("cursor-pointer");
    }
  });
});
