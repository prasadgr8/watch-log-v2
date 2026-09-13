import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "UpcomingPage.tsx"),
  "utf-8",
);

const listItemSource = readFileSync(
  join(featureDirectory, "components", "UpcomingEpisodeListItem.tsx"),
  "utf-8",
);

const densitySource = readFileSync(
  join(featureDirectory, "..", "ui", "density.ts"),
  "utf-8",
);

const dashboardSource = readFileSync(
  join(featureDirectory, "..", "dashboard", "DashboardPage.tsx"),
  "utf-8",
);

const serviceSource = readFileSync(
  join(featureDirectory, "services", "upcomingEpisodesService.ts"),
  "utf-8",
);

/*
 * Source-level contract coverage for Upcoming Episodes card density.
 * These assertions pin the implementation contract: Upcoming reuses the
 * existing density architecture, and density changes are presentation-only.
 */
describe("upcoming card density", () => {
  it("uses the existing useDensity hook", () => {
    expect(pageSource).toContain("useDensity");
    expect(pageSource).toContain(
      'import { useDensity } from "../ui/useDensity"',
    );
  });

  it("uses a dedicated Upcoming density key", () => {
    expect(pageSource).toContain("UPCOMING_DENSITY_KEY");
    expect(pageSource).toContain("upcoming-card-density");
  });

  it("renders DensityToggle in the page header", () => {
    expect(pageSource).toContain("DensityToggle");
    expect(pageSource).toContain('import DensityToggle from "../../components/ui/DensityToggle"');
  });

  it("uses UPCOMING_GRID_COLUMNS in the grid layout", () => {
    expect(pageSource).toContain("UPCOMING_GRID_COLUMNS");
    expect(pageSource).toContain(
      'import { CARD_GAP, UPCOMING_GRID_COLUMNS } from "../ui/density"',
    );
  });

  it("uses the shared CARD_GAP for spacing", () => {
    expect(pageSource).toContain("CARD_GAP");
  });

  it("defines UPCOMING_GRID_COLUMNS in density.ts", () => {
    expect(densitySource).toContain("UPCOMING_GRID_COLUMNS");
    expect(densitySource).toContain("compact:");
    expect(densitySource).toContain("comfortable:");
    expect(densitySource).toContain("large:");
  });

  it("does not alter existing density mappings", () => {
    expect(densitySource).toContain("LIBRARY_GRID_COLUMNS");
    expect(densitySource).toContain("SEARCH_GRID_COLUMNS");
    expect(densitySource).toContain("EPISODE_GRID_COLUMNS");
  });
});

describe("UpcomingEpisodeListItem density", () => {
  it("accepts an optional density prop", () => {
    expect(listItemSource).toContain("density");
    expect(listItemSource).toContain("CardDensity");
  });

  it("defaults density to comfortable for backward compatibility", () => {
    expect(listItemSource).toContain('density = "comfortable"');
  });

  it("applies density to the title typography", () => {
    expect(listItemSource).toContain("CARD_TITLE_SIZE");
  });

  it("preserves all existing episode metadata across densities", () => {
    expect(listItemSource).toContain("media.title");
    expect(listItemSource).toContain("episodeCode");
    expect(listItemSource).toContain("episode.title");
    expect(listItemSource).toContain("item.airDate");
    expect(listItemSource).toContain("relativeLabel");
    expect(listItemSource).toContain("episode.watched");
  });

  it("preserves the show-details link", () => {
    expect(listItemSource).toContain("/library/tv/${media.id}");
    expect(listItemSource).toContain("View ${media.title} details");
  });

  it("preserves the watched indicator", () => {
    expect(listItemSource).toContain("Watched");
    expect(listItemSource).toContain("Check");
  });
});

describe("density performance contract", () => {
  it("does not call getItems from density handlers", () => {
    // Density state is separate from data loading; getItems only appears in the effect
    const getItemsCalls = pageSource.match(/getItems/g) ?? [];
    // Should only appear once in the data-loading effect
    expect(getItemsCalls.length).toBe(1);
  });

  it("keeps upcomingEpisodesService unchanged", () => {
    expect(serviceSource).toContain("async getItems(");
    expect(serviceSource).toContain("compareUpcomingItems");
  });

  it("does not introduce network/TMDB logic", () => {
    expect(pageSource).not.toContain("fetch(");
    expect(pageSource).not.toContain("tmdbSearchService");
  });

  it("does not duplicate filtering/sorting/projection", () => {
    expect(pageSource).not.toContain("isValidAirDate");
    expect(pageSource).not.toContain("getAirDateRelation");
    expect(pageSource).not.toContain("compareAirDates");
  });
});

describe("Dashboard backward compatibility", () => {
  it("Dashboard uses UpcomingEpisodeListItem without density prop", () => {
    expect(dashboardSource).toContain("UpcomingEpisodeListItem");
    // Dashboard should not pass density (uses default)
    expect(dashboardSource).not.toContain("density={density}");
  });

  it("Dashboard behavior is preserved", () => {
    expect(dashboardSource).toContain('slice(0, 5)');
    expect(dashboardSource).toContain("getRelativeAirDateLabel");
  });
});
