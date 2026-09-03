import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const dashboardSource = readFileSync(
  join(featureDirectory, "DashboardPage.tsx"),
  "utf-8",
);

const progressBarSource = readFileSync(
  join(featureDirectory, "..", "statistics", "components", "ProgressBar.tsx"),
  "utf-8",
);

const continueWatchingSource = readFileSync(
  join(featureDirectory, "services", "continueWatchingService.ts"),
  "utf-8",
);

/*
 * Source-level accessibility coverage for the Dashboard's Continue Watching
 * progress bars, matching the libraryTheme and settingsResponsive test
 * conventions. The Dashboard reuses the shared Statistics ProgressBar so the
 * bars expose progressbar semantics without duplicating the raw markup; these
 * assertions pin the wiring contract instead of repeating the component
 * implementation.
 */
describe("dashboard continue watching progress accessibility", () => {
  it("renders Continue Watching bars through the shared ProgressBar", () => {
    expect(dashboardSource).toContain(
      'import ProgressBar from "../statistics/components/ProgressBar";',
    );
    expect(dashboardSource).toContain("<ProgressBar");
  });

  it("names each Continue Watching bar after its show", () => {
    expect(dashboardSource).toContain('label={`${item.media.title} progress`}');
  });

  it("wires the derived Continue Watching percentage into the bar", () => {
    expect(dashboardSource).toContain("value={item.progressPercentage}");
    expect(dashboardSource).toContain("continueWatchingItems.map");
  });

  it("exposes progressbar semantics through the shared component", () => {
    expect(progressBarSource).toContain('role="progressbar"');
    expect(progressBarSource).toContain("aria-label={label}");
    expect(progressBarSource).toContain("aria-valuenow={clampedValue}");
    expect(progressBarSource).toContain("aria-valuemin={0}");
    expect(progressBarSource).toContain("aria-valuemax={100}");
  });

  it("keeps the service as the single source of the progress calculation", () => {
    expect(continueWatchingSource).toContain(
      "(watchedEpisodeCount / totalEpisodeCount) * 100",
    );
    expect(dashboardSource).not.toContain(
      "watchedEpisodeCount / totalEpisodeCount",
    );
  });

  it("keeps the shared inline percentage width behavior", () => {
    expect(progressBarSource).toContain("width: `${clampedValue}%`");
    expect(dashboardSource).not.toContain(
      "width: `${item.progressPercentage}%`",
    );
  });

  it("preserves the dashboard spacing around the shared bar", () => {
    expect(dashboardSource).toContain('<div className="mt-4">');
  });
});
