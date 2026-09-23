import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const dashboardSource = readFileSync(
  join(featureDirectory, "DashboardPage.tsx"),
  "utf-8",
);

const densityToggleSource = readFileSync(
  join(featureDirectory, "..", "..", "components", "ui", "DensityToggle.tsx"),
  "utf-8",
);

const densitySource = readFileSync(
  join(featureDirectory, "..", "ui", "density.ts"),
  "utf-8",
);

/*
 * The exported DASHBOARD_GRID_COLUMNS declaration only. The negative auto-fit
 * assertion below is scoped to this declaration: the approved JSDoc above it
 * documents in prose why auto-fit must not be used, so a whole-file assertion
 * would match that comment text instead of the emitted track classes.
 */
const dashboardTracksSource = densitySource
  .slice(densitySource.indexOf("export const DASHBOARD_GRID_COLUMNS"))
  .split("};")[0];

/*
 * Source-level contract coverage for the Dashboard Continue Watching card
 * density, matching the upcomingDensity and dashboardTheme test conventions.
 * Continue Watching reuses the shared density infrastructure (preference key,
 * hook, toggle) together with the Dashboard grid mapping, so these assertions
 * pin the wiring contract rather than repeating the shared implementation.
 */
describe("dashboard continue watching density", () => {
  it("reuses the shared library-card-density preference key", () => {
    expect(dashboardSource).toContain(
      'DASHBOARD_DENSITY_KEY = "library-card-density"',
    );
  });

  it("loads density through the shared useDensity hook", () => {
    expect(dashboardSource).toContain('from "../ui/useDensity"');
    expect(dashboardSource).toContain("useDensity(DASHBOARD_DENSITY_KEY)");
  });

  it("creates no second density abstraction or persistence path", () => {
    expect(dashboardSource.split("useDensity(").length - 1).toBe(1);
    expect(dashboardSource).not.toContain("settingsRepository");
    expect(dashboardSource).not.toContain("Record<CardDensity");
  });

  it("renders the shared DensityToggle with a Continue Watching label", () => {
    expect(dashboardSource).toContain("<DensityToggle");
    expect(dashboardSource).toContain('label="Continue Watching density"');
    expect(dashboardSource).toContain("density={density}");
    expect(dashboardSource).toContain("onChange={setDensity}");
  });

  it("keeps the density control accessible through the shared component", () => {
    expect(densityToggleSource).toContain('role="group"');
    expect(densityToggleSource).toContain("aria-pressed");
    expect(densityToggleSource).toContain("aria-label");
  });
});

describe("dashboard continue watching density presentation", () => {
  it("applies the shared density presentation mappings", () => {
    expect(dashboardSource).toContain('from "../ui/density"');
    expect(dashboardSource).toContain("CARD_GAP[density]");
    expect(dashboardSource).toContain("LIST_PADDING[density]");
    expect(dashboardSource).toContain("CARD_TITLE_SIZE[density]");
  });

  it("drives the card grid through the Dashboard density mapping", () => {
    expect(dashboardSource).toContain("DASHBOARD_GRID_COLUMNS");
    expect(dashboardSource).toContain("DASHBOARD_GRID_COLUMNS[density]");
    expect(dashboardSource).toContain(
      "grid ${CARD_GAP[density]} ${DASHBOARD_GRID_COLUMNS[density]}",
    );
    expect(dashboardSource).toContain("CARD_GAP[density]");
    expect(dashboardSource).toContain("DASHBOARD_GRID_COLUMNS[density]");
    expect(dashboardSource).not.toContain("lg:grid-cols-2");
    expect(dashboardSource).not.toContain("LIBRARY_GRID_COLUMNS");
    expect(dashboardSource).not.toContain("EPISODE_GRID_COLUMNS");
  });

  it("defines the approved density-specific fluid tracks", () => {
    expect(densitySource).toContain("DASHBOARD_GRID_COLUMNS");
    expect(dashboardTracksSource).toContain("auto-fill");
    expect(dashboardTracksSource).not.toContain("auto-fit");
    expect(densitySource).toContain(
      '"grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(240px,_1fr))]"',
    );
    expect(densitySource).toContain(
      '"grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))]"',
    );
    expect(densitySource).toContain(
      '"grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(400px,_1fr))]"',
    );
  });

  it("does not reuse the poster-oriented library cards", () => {
    expect(dashboardSource).not.toContain("MediaCard");
    expect(dashboardSource).not.toContain("MediaListItem");
  });
});

describe("dashboard continue watching density scope boundary", () => {
  it("introduces no viewport measurement JavaScript", () => {
    expect(dashboardSource).not.toContain("matchMedia");
    expect(dashboardSource).not.toContain("ResizeObserver");
    expect(dashboardSource).not.toContain("window.innerWidth");
    expect(dashboardSource).not.toContain("useMediaQuery");
  });

  it("introduces no network, TMDB, or online-status logic", () => {
    expect(dashboardSource).not.toContain("fetch(");
    expect(dashboardSource).not.toContain("tmdb");
    expect(dashboardSource).not.toContain("useOnlineStatus");
  });

  it("keeps the data load on a single empty-dependency effect", () => {
    expect(dashboardSource).toContain("continueWatchingService.getItems()");
    expect(dashboardSource).toContain("}, []);");
  });
});
