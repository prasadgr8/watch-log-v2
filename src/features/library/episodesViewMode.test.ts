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

const episodeListItemSource = readFileSync(
  join(featureDirectory, "components/EpisodeListItem.tsx"),
  "utf-8",
);

const toggleSource = readFileSync(
  join(featureDirectory, "..", "..", "components", "ui", "ViewModeToggle.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the episodes Grid/List presentation
 * toggle, matching the libraryViewMode and searchViewMode test conventions.
 */
describe("episodes grid/list view mode", () => {
  it("renders both grid and list presentations from the same episodes array", () => {
    expect(episodeListSource).toContain('viewMode === "list"');
    expect(episodeListSource).toContain("episodes.map");
    expect(episodeListSource).toContain("<EpisodeCard");
    expect(episodeListSource).toContain("<EpisodeListItem");
  });

  it("persists the episodes view mode through the settings preference hook", () => {
    expect(tvDetailsPageSource).toContain("EPISODES_VIEW_MODE_SETTING_KEY");
    expect(tvDetailsPageSource).toContain("useViewMode");
  });

  it("places the view mode toggle in the episodes section header", () => {
    expect(tvDetailsPageSource).toContain("<ViewModeToggle");
    expect(tvDetailsPageSource).toContain('label="Episode view"');
  });

  it("renders the same episode fields in both presentations", () => {
    for (const source of [episodeCardSource, episodeListItemSource]) {
      expect(source).toContain("episode.title");
      expect(source).toContain("episode.episodeNumber");
      expect(source).toContain("episode.seasonNumber");
      expect(source).toContain("episode.watched");
      expect(source).toContain("episode.runtime");
      expect(source).toContain("episode.airDate");
      expect(source).toContain("episode.overview");
    }
  });

  it("renders the episode still image where available in both presentations", () => {
    expect(episodeCardSource).toContain("episode.stillPath");
    expect(episodeListItemSource).toContain("episode.stillPath");
    expect(episodeCardSource).toContain("aspect-video");
    expect(episodeListItemSource).toContain("aspect-video");
  });

  it("preserves the watched/unwatched action in both presentations", () => {
    expect(episodeCardSource).toContain("onToggleWatched(episode)");
    expect(episodeListItemSource).toContain("onToggleWatched(episode)");
    expect(episodeCardSource).toContain("Mark Watched");
    expect(episodeListItemSource).toContain("Mark Watched");
    expect(episodeCardSource).toContain("Mark Unwatched");
    expect(episodeListItemSource).toContain("Mark Unwatched");
    expect(episodeCardSource).toContain("Updating...");
    expect(episodeListItemSource).toContain("Updating...");
  });

  it("keeps episode ordering intact without filtering or season 0 logic", () => {
    expect(episodeListSource).not.toMatch(/\.sort\(/);
    expect(episodeListSource).not.toMatch(/\.filter\(/);
    expect(episodeCardSource).not.toMatch(/seasonNumber === 0/);
    expect(episodeListItemSource).not.toMatch(/seasonNumber === 0/);
  });

  it("applies the approved grid breakpoints and list density conventions", () => {
    expect(episodeListSource).toContain("sm:grid-cols-2");
    expect(episodeListSource).toContain("lg:grid-cols-3");
    expect(episodeListSource).toContain("space-y-3");
    expect(episodeListItemSource).toContain("min-w-0 flex-1");
    expect(episodeListItemSource).toContain("line-clamp-2");
  });

  it("styles the view mode toggle with accessible state semantics", () => {
    expect(toggleSource).toContain('role="group"');
    expect(toggleSource).toContain("aria-pressed");
    expect(toggleSource).toContain("aria-label");
    expect(toggleSource).toContain("title");
    expect(toggleSource).toContain("focus-visible:ring");
  });

  it("keeps episode cards and rows free of fixed-width overflow constraints", () => {
    for (const source of [episodeCardSource, episodeListItemSource]) {
      expect(source).not.toMatch(/min-w-\[|max-w-\[|w-\[\d+px\]/);
    }
  });
});
