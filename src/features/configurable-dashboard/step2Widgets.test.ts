import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const cardSource = readFileSync(
  join(featureDirectory, "components", "DashboardWidgetCard.tsx"),
  "utf-8",
);

const continueWatchingSource = readFileSync(
  join(featureDirectory, "components", "ContinueWatchingWidget.tsx"),
  "utf-8",
);

const recentlyWatchedSource = readFileSync(
  join(featureDirectory, "components", "RecentlyWatchedWidget.tsx"),
  "utf-8",
);

const upcomingSource = readFileSync(
  join(featureDirectory, "components", "UpcomingReleasesWidget.tsx"),
  "utf-8",
);

const continueServiceSource = readFileSync(
  join(featureDirectory, "services", "continueWatchingWidgetService.ts"),
  "utf-8",
);

const recentServiceSource = readFileSync(
  join(featureDirectory, "services", "recentlyWatchedWidgetService.ts"),
  "utf-8",
);

/*
 * Step 2 integration contract: the three core content widgets render live
 * content through the shared card shell, honor their Step 2 constraints
 * (no progress percentage/bar, no statistics, no persistence, no drag/resize),
 * and stay visually distinct (forward-looking Continue Watching "Up Next"
 * vs. timestamped Recently Watched history).
 */
describe("configurable dashboard step 2 widget integration", () => {
  it("routes the three Step 2 widgets to live content", () => {
    expect(cardSource).toContain("ContinueWatchingWidget");
    expect(cardSource).toContain("RecentlyWatchedWidget");
    expect(cardSource).toContain("UpcomingReleasesWidget");
    expect(cardSource).toContain('"continue-watching"');
    expect(cardSource).toContain('"recently-watched"');
    expect(cardSource).toContain('"upcoming-releases"');
    expect(cardSource).toContain("aria-labelledby");
    expect(cardSource).toContain("data-widget-id");
  });

  it("never renders progress percentage, progress bars, or counts in Continue Watching", () => {
    expect(continueWatchingSource).not.toContain("progressPercentage");
    expect(continueWatchingSource).not.toContain("ProgressBar");
    expect(continueWatchingSource).not.toContain('role="progressbar"');
    expect(continueWatchingSource).not.toMatch(/%\s*(<|"|}|\)|$)/m);
    expect(continueWatchingSource).toContain("Up Next");
    expect(continueWatchingSource).toContain("Watch Next");
    expect(continueServiceSource).not.toContain("progressPercentage");
    expect(continueServiceSource).not.toContain("watchedEpisodeCount");
    expect(continueServiceSource).not.toContain("totalEpisodeCount");
    expect(continueServiceSource).toContain("continueWatchingService");
  });

  it("keeps Recently Watched as timestamped history, distinct from Continue Watching", () => {
    expect(recentlyWatchedSource).toContain("Watched {");
    expect(recentlyWatchedSource).not.toContain(">Up Next<");
    expect(recentlyWatchedSource).not.toContain("Watch Next");
    expect(recentlyWatchedSource).not.toContain("progressPercentage");
    expect(recentlyWatchedSource).not.toContain("ProgressBar");
    expect(recentServiceSource).toContain("watchHistoryRepository");
    expect(recentServiceSource).not.toContain("statisticsService");
  });

  it("keeps Upcoming Releases compact with a View action", () => {
    expect(upcomingSource).toContain("View Upcoming");
    expect(upcomingSource).toContain('to="/upcoming"');
    expect(upcomingSource).not.toContain("ProgressBar");
    expect(upcomingSource).not.toContain("progressPercentage");
  });

  it("introduces no Step 3+ behavior in Step 2 widget content", () => {
    for (const source of [
      continueWatchingSource,
      recentlyWatchedSource,
      upcomingSource,
    ]) {
      expect(source).not.toContain("onDrag");
      expect(source).not.toContain("onDrop");
      expect(source).not.toContain("onResize");
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("IndexedDB");
    }
  });
});
