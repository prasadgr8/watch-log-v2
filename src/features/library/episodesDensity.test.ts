import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const tvDetailsPageSource = readFileSync(
  join(featureDirectory, "TvShowDetailsPage.tsx"),
  "utf-8",
);

const episodeListSource = readFileSync(
  join(featureDirectory, "components/EpisodeList.tsx"),
  "utf-8",
);

const episodeCardSource = readFileSync(
  join(featureDirectory, "components/EpisodeCard.tsx"),
  "utf-8",
);

const densitySource = readFileSync(
  join(featureDirectory, "..", "ui", "density.ts"),
  "utf-8",
);

/*
 * Source-level regression coverage for episode card density, matching the
 * episodesViewMode and libraryViewMode test conventions. Verifies that the
 * shared CardDensity contract drives the episode grid without a duplicate
 * density system or fixed-width card constraints.
 */
describe("episodes card density", () => {
  it("uses the episode-card-density persistence key", () => {
    expect(tvDetailsPageSource).toContain('EPISODE_DENSITY_KEY = "episode-card-density"');
  });

  it("loads episode density through the shared useDensity hook", () => {
    expect(tvDetailsPageSource).toContain('useDensity(EPISODE_DENSITY_KEY)');
    expect(tvDetailsPageSource).toContain('import { useDensity } from "../ui/useDensity"');
  });

  it("renders DensityToggle in the episodes section alongside the view toggle", () => {
    expect(tvDetailsPageSource).toContain("<DensityToggle");
    expect(tvDetailsPageSource).toContain('label="Episode density"');
    expect(tvDetailsPageSource).toContain("<ViewModeToggle");
    expect(tvDetailsPageSource).toContain('label="Episode view"');
  });

  it("propagates density from page through EpisodeList to EpisodeCard", () => {
    expect(tvDetailsPageSource).toContain("density={density}");
    expect(episodeListSource).toContain("density={density}");
  });

  it("uses EPISODE_GRID_COLUMNS in the episode grid", () => {
    expect(episodeListSource).toContain("EPISODE_GRID_COLUMNS[density]");
  });

  it("uses CARD_GAP in the episode grid", () => {
    expect(episodeListSource).toContain("CARD_GAP[density]");
  });

  it("keeps the list branch as space-y-3 with no density pass-through", () => {
    expect(episodeListSource).toContain('viewMode === "list"');
    expect(episodeListSource).toContain("space-y-3");
  });

  it("keeps episode cards free of fixed-width overflow constraints", () => {
    expect(episodeCardSource).not.toMatch(/min-w-\[|max-w-\[|w-\[\d+px\]/);
  });

  it("preserves all episode information and actions across densities", () => {
    expect(episodeCardSource).toContain("episode.title");
    expect(episodeCardSource).toContain("episode.episodeNumber");
    expect(episodeCardSource).toContain("episode.seasonNumber");
    expect(episodeCardSource).toContain("episode.runtime");
    expect(episodeCardSource).toContain("episode.airDate");
    expect(episodeCardSource).toContain("episode.watched");
    expect(episodeCardSource).toContain("episode.overview");
    expect(episodeCardSource).toContain("Mark Watched");
    expect(episodeCardSource).toContain("Mark Unwatched");
  });

  it("supports all three density values in the episode grid mapping", () => {
    expect(densitySource).toContain("EPISODE_GRID_COLUMNS");
    expect(densitySource).toContain("compact:");
    expect(densitySource).toContain("comfortable:");
    expect(densitySource).toContain("large:");
    expect(densitySource).toContain("240px");
    expect(densitySource).toContain("320px");
    expect(densitySource).toContain("400px");
  });

  it("keeps episode card height content-driven without stretching", () => {
    expect(episodeCardSource).toMatch(/<article className="overflow-hidden rounded-xl border border-border bg-surface">/);
    expect(episodeCardSource).not.toMatch(/<article[^>]*h-full/);
    expect(episodeCardSource).not.toMatch(/<article[^>]*flex-1/);
  });
});