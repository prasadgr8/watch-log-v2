import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const overviewSource = readFileSync(
  join(featureDirectory, "components", "StatisticsOverview.tsx"),
  "utf-8",
);

const statisticCardSource = readFileSync(
  join(featureDirectory, "components", "StatisticCard.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the A30 Step 2 Statistics Overview
 * UI/UX refinement: every existing section stays in place but is grouped
 * into a named landmark bound to its heading, statistic values stop
 * masquerading as headings, the shared StatisticCard follows the app-wide
 * statistic convention, and grid density is tightened.
 *
 * This is presentation-only coverage: the data-flow boundary (type-only
 * service import, page-owned props, verbatim loading/error gates, no route
 * or persistence state, single statistics read) is pinned so the refinement
 * can never grow into a behavior change.
 */

const SECTION_IDS = [
  "statistics-overview-library",
  "statistics-overview-ratings",
  "statistics-overview-watch-status",
  "statistics-overview-progress",
  "statistics-overview-episodes",
  "statistics-overview-watch-time",
  "statistics-overview-tv-progress",
  "statistics-overview-recently-watched",
] as const;

const SECTION_HEADINGS = [
  "Library Overview",
  "Rating Statistics",
  "Watch Status",
  "Progress",
  "Episode Statistics",
  "Watch Time",
  "TV Progress",
  "Recently Watched",
] as const;

/* Whitespace-stripped view so assertions survive formatting line breaks. */
const compactOverviewSource = overviewSource.replace(/\s+/g, "");

describe("statistics overview section grouping", () => {
  it("keeps every existing Overview section in the established order", () => {
    let previousIndex = -1;

    for (const heading of SECTION_HEADINGS) {
      const compactHeading = heading.replace(/\s+/g, "");
      const index = compactOverviewSource.indexOf(`>${compactHeading}<`);

      expect(index, heading).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it("groups each section in a landmark named by its own heading", () => {
    expect(overviewSource.match(/<section/g)).toHaveLength(SECTION_IDS.length);
    expect(overviewSource.match(/className="space-y-4"/g)).toHaveLength(
      SECTION_IDS.length,
    );

    for (const sectionId of SECTION_IDS) {
      const landmarkIndex = overviewSource.indexOf(
        `aria-labelledby="${sectionId}"`,
      );
      const headingIndex = overviewSource.indexOf(`id="${sectionId}"`);

      expect(landmarkIndex, sectionId).toBeGreaterThan(-1);
      expect(headingIndex, sectionId).toBeGreaterThan(landmarkIndex);
    }
  });

  it("keeps headings as the only h2 elements and values as non-headings", () => {
    expect(overviewSource.match(/<h2/g)).toHaveLength(SECTION_IDS.length);
    expect(
      overviewSource.match(/<h2[^>]*id="statistics-overview-/g),
    ).toHaveLength(SECTION_IDS.length);
    expect(overviewSource).not.toContain("<h3");

    expect(statisticCardSource).not.toContain("<h2");
    expect(statisticCardSource).toContain(
      'className="mt-2 text-3xl font-bold text-primary"',
    );
    expect(statisticCardSource).not.toContain("text-4xl");
  });
});

describe("statistics overview presentation density", () => {
  it("uses the tightened grid convention across all eight sections", () => {
    expect(overviewSource).not.toContain("grid gap-6");
    expect(overviewSource.match(/grid gap-4 /g)).toHaveLength(8);
  });

  it("does not imply clickability on static statistic cards", () => {
    expect(statisticCardSource).not.toContain("hover:border-accent-hover");
    expect(statisticCardSource).toContain("shadow-sm");
  });
});

describe("statistics overview data-flow boundary", () => {
  it("consumes the computed dashboard through a type-only import", () => {
    expect(overviewSource).toContain(
      'import type { StatisticsDashboard } from "../services/statisticsService";',
    );
    expect(overviewSource).not.toContain("loadStatistics(");
    expect(overviewSource).not.toContain("loadWatchActivitySection(");
  });

  it("keeps loading and error semantics verbatim", () => {
    expect(overviewSource).toContain('role="alert"');
    expect(overviewSource).toContain('isLoading ? "—" : value');
    expect(overviewSource.match(/\{!isLoading &&/g)).toHaveLength(2);
    expect(overviewSource).toContain(
      "<ShowProgressTable shows={stats.showProgress.shows} />",
    );
    expect(overviewSource).toContain(
      "<RecentlyWatchedList activity={stats.recentActivity} />",
    );
  });

  it("retains every supporting note and detail", () => {
    expect(overviewSource).toContain(
      "Season 0 specials are excluded from show progress.",
    );
    expect(overviewSource).toContain("Based on available runtime metadata.");
    expect(overviewSource).toContain(
      "Completed shows are derived from every regular episode",
    );
    expect(overviewSource).toContain("Watch events are raw watch-history rows");
  });

  it("introduces no route, persistence, or second statistics read", () => {
    for (const pattern of [
      "useNavigate",
      "useSearchParams",
      "window.location",
      "URLSearchParams",
      "localStorage",
      "sessionStorage",
    ]) {
      expect(overviewSource, pattern).not.toContain(pattern);
      expect(pageSource, pattern).not.toContain(pattern);
    }

    expect(pageSource.match(/await loadStatistics\(\)/g)).toHaveLength(1);
  });

  it("keeps the page as the orchestration boundary", () => {
    expect(pageSource).toContain("<StatisticsOverview");
    expect(pageSource).toContain("stats={stats}");
    expect(pageSource).toContain("isLoading={isLoading}");
    expect(pageSource).toContain("error={error}");
    expect(overviewSource).not.toContain("Historical Viewing Activity");
    expect(overviewSource).not.toContain("StatisticsPeriodSelector");
  });
});
