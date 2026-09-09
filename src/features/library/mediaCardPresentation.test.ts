import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const libraryPageSource = readFileSync(
  join(featureDirectory, "LibraryPage.tsx"),
  "utf-8",
);

const mediaCardSource = readFileSync(
  join(featureDirectory, "components/MediaCard.tsx"),
  "utf-8",
);

const mediaListItemSource = readFileSync(
  join(featureDirectory, "components/MediaListItem.tsx"),
  "utf-8",
);

const progressBarSource = readFileSync(
  join(featureDirectory, "..", "statistics", "components", "ProgressBar.tsx"),
  "utf-8",
);

const componentSources = [
  { name: "MediaCard.tsx", source: mediaCardSource },
  { name: "MediaListItem.tsx", source: mediaListItemSource },
];

/*
 * Source-level regression coverage for the Alpha 23 richer media card
 * presentation, matching the libraryViewMode and collectionMediaCard test
 * conventions.
 */
describe("richer media card presentation", () => {
  it("renders poster artwork with lazy loading and async decoding", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain('loading="lazy"');
      expect(source, name).toContain('decoding="async"');
      expect(source, name).toContain("alt={`${media.title} poster`}");
      expect(source, name).toContain(
        "onError={() => setFailedPosterUrl(posterUrl)}",
      );
    }

    expect(mediaCardSource).toContain("/w342${posterPath}");
    expect(mediaListItemSource).toContain("/w92${posterPath}");
  });

  it("falls back to a type icon when the poster is missing or fails to load", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain("failedPosterUrl");
      expect(source, name).toContain('aria-hidden="true"');
      expect(source, name).toContain("<Tv");
      expect(source, name).toContain("<Film");
    }
  });

  it("derives the release year locally and omits it when unavailable", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain("firstAirDate");
      expect(source, name).toContain("releaseDate");
      expect(source, name).toContain("slice(0, 4)");
      expect(source, name).not.toContain("Release year unavailable");
    }
  });

  it("renders the user rating only when it is set above zero", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain(
        'typeof media.rating === "number" && media.rating > 0',
      );
    }
  });

  it("renders an accessible notes-present indicator for non-blank notes", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain(
        "media.notes !== undefined && media.notes.trim().length > 0",
      );
      expect(source, name).toContain(">Has notes</span>");
      expect(source, name).toContain("StickyNote");
    }
  });

  it("renders TV progress through the shared ProgressBar and never for movies", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain(
        'media.mediaType === "tv" && progress !== undefined',
      );
      expect(source, name).toContain("<ProgressBar");
      expect(source, name).toContain("label={`${media.title} progress`}");
      expect(source, name).toContain("episodes watched");
      expect(source, name).toContain(
        'from "../../statistics/components/ProgressBar"',
      );
    }

    expect(progressBarSource).toContain('role="progressbar"');
    expect(progressBarSource).toContain("aria-label={label}");
  });

  it("preserves the exact details navigation targets and labels", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain("/library/tv/${media.id}");
      expect(source, name).toContain("/library/movie/${media.id}");
      expect(source, name).toContain(
        "aria-label={`View ${media.title} details`}",
      );
    }
  });

  it("keeps selection and quick actions outside the navigation link", () => {
    for (const { name, source } of componentSources) {
      expect(source, name).toContain("aria-label={`Select ${media.title}`}");
      expect(source, name).toContain("onToggleFavorite(media)");
      expect(source, name).toContain("onEdit(media)");
      expect(source, name).toContain("onDelete(media.id)");
      expect(source, name).toContain("aria-pressed={media.favorite");
    }
  });

  it("passes the shared progress map to both presentations from LibraryPage", () => {
    const progressPropMatches = libraryPageSource.match(
      /progress=\{progressMap\?\.get\(item\.id\)\}/g,
    );

    expect(progressPropMatches).toHaveLength(2);
  });

  it("fetches episodes only when TV progress can be displayed", () => {
    expect(libraryPageSource).toContain("fetchLibraryData(");
    expect(libraryPageSource).toContain('lockedMediaType !== "movie"');
    expect(libraryPageSource).toContain(
      "includeEpisodes ? episodeRepository.getAll() : Promise.resolve([])",
    );
    expect(libraryPageSource).not.toContain("the one-time lazy load");
  });
});
