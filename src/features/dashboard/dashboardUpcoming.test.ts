import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const dashboardSource = readFileSync(
  join(featureDirectory, "DashboardPage.tsx"),
  "utf-8",
);

const upcomingServiceSource = readFileSync(
  join(featureDirectory, "..", "upcoming", "services", "upcomingEpisodesService.ts"),
  "utf-8",
);

const upcomingListItemSource = readFileSync(
  join(featureDirectory, "..", "upcoming", "components", "UpcomingEpisodeListItem.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the Dashboard Upcoming Episodes preview.
 * These assertions pin the implementation contract: the Dashboard reuses the
 * existing upcoming projection and list item without duplicating business logic.
 */
describe("dashboard upcoming preview", () => {
  it("consumes upcomingEpisodesService.getItems", () => {
    expect(dashboardSource).toContain("upcomingEpisodesService");
    expect(dashboardSource).toContain("getItems");
    expect(dashboardSource).toContain(
      'from "../upcoming/services/upcomingEpisodesService"',
    );
  });

  it("renders the Upcoming Episodes section with heading", () => {
    expect(dashboardSource).toContain("Upcoming Episodes");
    expect(dashboardSource).toContain('id="upcoming-heading"');
    expect(dashboardSource).toContain('aria-labelledby="upcoming-heading"');
  });

  it("limits the preview to 5 items", () => {
    expect(dashboardSource).toContain("slice(0, 5)");
  });

  it("renders the section conditionally on available upcoming items", () => {
    expect(dashboardSource).toContain("upcomingItems.length > 0");
    expect(dashboardSource).toContain("!isLoading");
  });

  it("provides a View all link to /upcoming", () => {
    expect(dashboardSource).toContain('to="/upcoming"');
    expect(dashboardSource).toContain("View all");
    expect(dashboardSource).toContain("View all upcoming episodes");
  });

  it("reuses the existing UpcomingEpisodeListItem component", () => {
    expect(dashboardSource).toContain("UpcomingEpisodeListItem");
    expect(dashboardSource).toContain(
      'from "../upcoming/components/UpcomingEpisodeListItem"',
    );
  });

  it("reuses getRelativeAirDateLabel from the shared date utilities", () => {
    expect(dashboardSource).toContain("getRelativeAirDateLabel");
    expect(dashboardSource).toContain(
      'from "../../domain/dates/airDate"',
    );
  });

  it("does NOT duplicate upcoming-selection logic", () => {
    expect(dashboardSource).not.toContain("isValidAirDate");
    expect(dashboardSource).not.toContain("getAirDateRelation");
    expect(dashboardSource).not.toContain("compareAirDates");
  });

  it("does NOT add filters", () => {
    expect(dashboardSource).not.toContain("Filter");
    expect(dashboardSource).not.toContain("filter");
  });

  it("does NOT add Smart Collection coupling", () => {
    expect(dashboardSource).not.toContain("smartCollection");
    expect(dashboardSource).not.toContain("SmartCollection");
  });

  it("does NOT add watch/toggle controls", () => {
    expect(dashboardSource).not.toContain("onToggleWatched");
    expect(dashboardSource).not.toContain("Mark Watched");
    expect(dashboardSource).not.toContain("Mark Unwatched");
  });

  it("does NOT modify the upcoming service", () => {
    // Verify the service still has its original structure
    expect(upcomingServiceSource).toContain("async getItems(");
    expect(upcomingServiceSource).toContain("compareUpcomingItems");
  });

  it("does NOT modify the UpcomingEpisodeListItem component", () => {
    // Verify the component still has its original structure
    expect(upcomingListItemSource).toContain("UpcomingEpisodeListItem");
    expect(upcomingListItemSource).not.toContain("onToggleWatched");
  });
});
