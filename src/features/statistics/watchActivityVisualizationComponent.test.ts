import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));
const visualizationSource = readFileSync(
  join(featureDirectory, "components", "WatchActivityVisualization.tsx"),
  "utf-8",
);

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

describe("WatchActivityVisualization contracts", () => {
  it("consumes a precomputed visualization and recorded activity summary", () => {
    expect(visualizationSource).toContain(
      "visualization: WatchActivityVisualizationProjection",
    );
    expect(visualizationSource).toContain("summary: ViewingActivitySummary");
    expect(visualizationSource).toContain("isLoading: boolean");
    expect(visualizationSource).toContain("error: string | null");
  });

  it("reads no persistence, network, or service layer directly", () => {
    expect(visualizationSource).not.toContain("watchHistoryRepository");
    expect(visualizationSource).not.toContain('from "dexie"');
    expect(visualizationSource).not.toContain("fetch(");
    expect(visualizationSource).not.toContain("watchActivityService");
    expect(visualizationSource).not.toContain("statisticsService");
    expect(visualizationSource).not.toContain("new Date()");
    expect(visualizationSource).not.toContain("Date.now()");
  });

  it("renders the three requested summary values and recorded source labels", () => {
    for (const text of [
      "Total Events",
      "Active Months",
      "Manual / Imported Source Ratio",
      "visualization.totalEventCount",
      "visualization.activeMonthCount",
      "visualization.manualEventCount",
      "visualization.importedEventCount",
      "currently recorded history",
      "last 12 months",
    ]) {
      expect(visualizationSource).toContain(text);
    }
  });

  it("exposes accessible ephemeral month selection", () => {
    expect(visualizationSource).toContain("useState<string | null>");
    expect(visualizationSource).toContain('role="group"');
    expect(visualizationSource).toContain("aria-pressed={isSelected}");
    expect(visualizationSource).toContain("onClick={() => setSelectedMonthKey");
    expect(visualizationSource).toContain("focus-visible:ring-2");
    expect(visualizationSource).toContain('type="button"');
    expect(visualizationSource).not.toContain("localStorage");
    expect(visualizationSource).not.toContain("sessionStorage");
  });

  it("keeps inactive months visible and communicates event volume", () => {
    expect(visualizationSource).toContain("visualization.months.map((month)");
    expect(visualizationSource).toContain("month.eventCount > 0");
    expect(visualizationSource).toContain("{month.eventCount}");
    expect(visualizationSource).toContain("{month.activeDayCount} active days");
    expect(visualizationSource).toContain("month.relativeIntensity");
  });

  it("omits the removed selected-month daily activity section", () => {
    expect(visualizationSource).not.toContain("Daily Activity");
    expect(visualizationSource).not.toContain("Daily recorded activity");
    expect(visualizationSource).not.toContain("selectedMonth.days");
    expect(visualizationSource).not.toContain("WEEKDAYS");
  });

  it("preserves loading, error, and safe empty states", () => {
    expect(visualizationSource).toContain("if (isLoading)");
    expect(visualizationSource).toContain("if (error !== null)");
    expect(visualizationSource).toContain('role="alert"');
    expect(visualizationSource).toContain("visualization.months.length === 0");
    expect(visualizationSource).toContain(
      "No recorded activity to visualize yet.",
    );
  });

  it("adds no heading of its own or visualization dependency", () => {
    expect(visualizationSource).not.toMatch(/<h[1-3]/);
    expect(visualizationSource).not.toContain("recharts");
    expect(visualizationSource).not.toContain("chart.js");
    expect(visualizationSource).not.toContain("d3");
  });

  it("uses semantic theme tokens without hard-coded dark colors", () => {
    for (const pattern of HARD_CODED_DARK_PATTERNS) {
      expect(visualizationSource, pattern).not.toMatch(new RegExp(pattern));
    }
  });
});
