import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const watchingActivitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

const periodSelectorSource = readFileSync(
  join(featureDirectory, "components", "StatisticsPeriodSelector.tsx"),
  "utf-8",
);

const activitySource = readFileSync(
  join(featureDirectory, "components", "HistoricalViewingActivity.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the Step 3.1 Statistics presentation
 * foundation, matching the repo's source-contract conventions (Upcoming,
 * theme, presentation tests): the page wires `loadWatchActivity` while
 * leaving `loadStatistics` intact, the period selector is ephemeral with a
 * month default, stale asynchronous responses cannot overwrite the current
 * period, history-derived labels stay distinct from current-state labels,
 * and no chart or SVG is introduced.
 */

describe("historical viewing activity section", () => {
  it("renders a Historical Viewing Activity section heading", () => {
    expect(watchingActivitySectionSource).toContain(
      "Historical Viewing Activity",
    );
    expect(pageSource).toContain("<WatchingActivitySection");
  });

  it("wires loadWatchActivitySection(period) while keeping loadStatistics", () => {
    expect(pageSource).toContain("loadWatchActivitySection(");
    expect(pageSource).toContain("loadWatchActivitySection(activityPeriod)");
    expect(pageSource).not.toContain("loadWatchActivity(activityPeriod)");
    expect(pageSource).toContain("loadStatistics()");
  });

  it("renders summary and timeline from one combined section snapshot", () => {
    expect(pageSource).toContain("WatchActivitySection");
    expect(watchingActivitySectionSource).toContain(
      'import WatchActivityTimeline from "./WatchActivityTimeline"',
    );
    expect(watchingActivitySectionSource).toContain("<WatchActivityTimeline");
    expect(watchingActivitySectionSource).toContain(
      "activity={activitySection.summary}",
    );
    expect(watchingActivitySectionSource).toContain(
      "timeline={activitySection.timeline}",
    );
    expect(watchingActivitySectionSource).toContain(
      "isLoading={isActivityLoading}",
    );
  });

  it("keeps current-state and history-derived loaders independent", () => {
    expect(pageSource).toContain("loadStatistics");
    expect(pageSource).toContain("loadWatchActivity");
    expect(pageSource).not.toContain("summarizeWatchActivity");
    expect(pageSource).not.toContain("groupEventsByPeriod");
  });

  it("protects activity state from stale asynchronous responses", () => {
    expect(pageSource).toContain("let isActive = true");
    expect(pageSource).toContain("if (!isActive)");
    expect(pageSource).toContain("isActive = false");
  });

  it("re-runs the activity loader when the selected period changes", () => {
    expect(pageSource).toContain("[activityPeriod]");
  });

  it("renders the activity error through role=alert", () => {
    expect(pageSource).toContain("Unable to load viewing activity.");
    expect(watchingActivitySectionSource).toContain('role="alert"');
    expect(watchingActivitySectionSource).toContain("{activityError &&");
  });

  it("leaves zero-history presentation to the section components", () => {
    expect(watchingActivitySectionSource).not.toContain(
      "No recorded watch history yet.",
    );
    expect(watchingActivitySectionSource).not.toContain("activity === null");
    expect(watchingActivitySectionSource).toContain(
      "activitySection !== null",
    );
  });
});

describe("period selector", () => {
  it("offers exactly day, week, month, and year", () => {
    expect(periodSelectorSource).toContain('"day"');
    expect(periodSelectorSource).toContain('"week"');
    expect(periodSelectorSource).toContain('"month"');
    expect(periodSelectorSource).toContain('"year"');
  });

  it("follows the accessible Toggle conventions", () => {
    expect(periodSelectorSource).toContain('role="group"');
    expect(periodSelectorSource).toContain("aria-pressed");
    expect(periodSelectorSource).toContain("aria-label");
    expect(periodSelectorSource).toContain("title");
    expect(periodSelectorSource).toContain("focus-visible:ring-2");
  });

  it("keeps selection ephemeral with a month default", () => {
    expect(pageSource).toContain('useState<AnalyticsPeriod>("month")');
    expect(periodSelectorSource).not.toContain("localStorage");
    expect(periodSelectorSource).not.toContain("useSearchParams");
    expect(pageSource).not.toContain("statistics-period");
  });
});

describe("history-derived presentation", () => {
  it("uses recorded-event wording distinct from current-state labels", () => {
    expect(activitySource).toContain("Recorded watch events");
    expect(activitySource).toContain("Distinct episodes with recorded events");
    expect(activitySource).toContain("Active viewing days");
    expect(activitySource).toContain("Events per active day");
    expect(activitySource).toContain("Recorded history begins");
    expect(activitySource).toContain("Recorded history ends");
    expect(activitySource).toContain("Most active recorded period");
    expect(activitySource).not.toContain("First Watch Date");
    expect(activitySource).not.toContain("Last Watch Date");
    expect(activitySource).not.toContain("Watch Events");
  });

  it("exposes manual and import source counts", () => {
    expect(activitySource).toContain("Manual events");
    expect(activitySource).toContain("Imported events");
    expect(activitySource).toContain("sourceEventCounts.manual");
    expect(activitySource).toContain("sourceEventCounts.import");
  });

  it("suppresses optional values when the recorded history is empty", () => {
    expect(activitySource).toContain("firstWatchedAt !== undefined");
    expect(activitySource).toContain("lastWatchedAt !== undefined");
    expect(activitySource).toContain("mostActivePeriod !== undefined");
  });

  it("hides decorative icons from assistive technology", () => {
    expect(activitySource).toContain('aria-hidden="true"');
  });

  it("adds no chart or SVG visualization", () => {
    expect(activitySource).not.toContain("<svg");
    expect(activitySource).not.toContain("viewBox");
    expect(pageSource).not.toContain("<svg");
    expect(periodSelectorSource).not.toContain("<svg");
  });

  it("reads no persistence or network layer directly from the UI", () => {
    expect(pageSource).not.toContain("watchHistoryRepository");
    expect(pageSource).not.toContain('from "dexie"');
    expect(pageSource).not.toContain("fetch(");
    expect(activitySource).not.toContain("watchHistoryRepository");
  });
});