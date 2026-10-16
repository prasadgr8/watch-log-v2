import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../database/repositories";

import type {
  PersistedEpisode,
  PersistedMedia,
  PersistedWatchHistory,
} from "../../types";

import {
  TOP_STORIES_PREVIEW_LIMIT,
  getTopStoriesData,
} from "./services/topStoriesWidgetService";

const componentSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "components",
    "TopStoriesWidget.tsx",
  ),
  "utf-8",
);

function createWatchHistory(
  overrides: Partial<PersistedWatchHistory> = {},
): PersistedWatchHistory {
  return {
    id: overrides.id ?? 1,
    episodeId: overrides.episodeId ?? null,
    mediaId: overrides.mediaId ?? 1,
    mediaType: overrides.mediaType ?? "tv",
    watchedAt: overrides.watchedAt ?? new Date("2026-07-15T18:30:00.000Z"),
    source: overrides.source ?? "manual",
    createdAt: overrides.createdAt ?? new Date("2026-07-15T18:30:00.000Z"),
    ...overrides,
  };
}

function createMedia(
  overrides: Partial<{ id: number; title: string; mediaType: "tv" | "movie" }>,
): PersistedMedia {
  return {
    id: overrides.id!,
    tmdbId: overrides.id! + 1000,
    mediaType: overrides.mediaType!,
    title: overrides.title!,
    userStatus: "completed",
    rating: undefined,
    favorite: false,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    genres: [],
  };
}

function createEpisode(
  overrides: Partial<{
    id: number;
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    watched: boolean;
    watchedAt: Date | undefined;
  }> = {},
): PersistedEpisode {
  return {
    id: overrides.id ?? 1,
    showId: overrides.showId ?? 1,
    seasonNumber: overrides.seasonNumber ?? 1,
    episodeNumber: overrides.episodeNumber ?? 1,
    title: overrides.title ?? "Pilot",
    watched: overrides.watched ?? true,
    watchedAt: overrides.watchedAt,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

async function seedData(
  history: PersistedWatchHistory[],
  media: PersistedMedia[],
  episodes: PersistedEpisode[],
) {
  for (const record of media) {
    await mediaRepository.add(record);
  }
  for (const record of episodes) {
    await episodeRepository.add(record);
  }
  for (const record of history) {
    await watchHistoryRepository.add(record);
  }
}

describe("top stories widget service", () => {
  it("uses an accessible native toggle-button group for the story type filter", () => {
    expect(componentSource).toContain('role="group"');
    expect(componentSource).toContain('aria-label="Story type filter"');
    expect(componentSource.match(/aria-pressed=\{mediaType ===/g)).toHaveLength(3);
    expect(componentSource).not.toContain('role="radio"');
    expect(componentSource).not.toContain("aria-checked=");
  });

  it("returns empty items and zero total for no watch history", async () => {
    const data = await getTopStoriesData();

    expect(data.items).toEqual([]);
    expect(data.totalTitles).toBe(0);
  });

  it("ranks by watch count descending, then title ascending", async () => {
    await seedData(
      [
        createWatchHistory({ id: 1, mediaId: 1, watchedAt: new Date("2026-07-15T10:00:00.000Z") }),
        createWatchHistory({ id: 2, mediaId: 1, watchedAt: new Date("2026-07-14T10:00:00.000Z") }),
        createWatchHistory({ id: 3, mediaId: 2, watchedAt: new Date("2026-07-15T10:00:00.000Z") }),
        createWatchHistory({ id: 4, mediaId: 2, watchedAt: new Date("2026-07-14T10:00:00.000Z") }),
        createWatchHistory({ id: 5, mediaId: 2, watchedAt: new Date("2026-07-13T10:00:00.000Z") }),
      ],
      [
        createMedia({ id: 1, title: "Show B", mediaType: "tv" }),
        createMedia({ id: 2, title: "Show A", mediaType: "tv" }),
      ],
      [],
    );

    const data = await getTopStoriesData("all");

    expect(data.items.length).toBe(2);
    expect(data.items[0].title).toBe("Show A");
    expect(data.items[0].watchCount).toBe(3);
    expect(data.items[1].title).toBe("Show B");
    expect(data.items[1].watchCount).toBe(2);
  });

  it("caps items at TOP_STORIES_PREVIEW_LIMIT", async () => {
    const media = [];
    const history = [];

    for (let i = 0; i < TOP_STORIES_PREVIEW_LIMIT + 2; i++) {
      media.push(createMedia({ id: i + 1, title: `Show ${i}`, mediaType: "tv" }));
      history.push(
        createWatchHistory({ id: i + 1, mediaId: i + 1, watchedAt: new Date(`2026-07-1${i}T10:00:00.000Z`) }),
      );
    }

    await seedData(history, media, []);

    const data = await getTopStoriesData("all");

    expect(data.items.length).toBe(TOP_STORIES_PREVIEW_LIMIT);
  });

  it("filters by TV media type", async () => {
    await seedData(
      [
        createWatchHistory({ id: 1, mediaId: 1, mediaType: "tv" }),
        createWatchHistory({ id: 2, mediaId: 2, mediaType: "movie" }),
      ],
      [
        createMedia({ id: 1, title: "TV Show", mediaType: "tv" }),
        createMedia({ id: 2, title: "Movie Film", mediaType: "movie" }),
      ],
      [],
    );

    const tvData = await getTopStoriesData("tv");
    expect(tvData.items).toHaveLength(1);
    expect(tvData.items[0].title).toBe("TV Show");

    const movieData = await getTopStoriesData("movie");
    expect(movieData.items).toHaveLength(1);
    expect(movieData.items[0].title).toBe("Movie Film");

    const allData = await getTopStoriesData("all");
    expect(allData.items).toHaveLength(2);
  });

  it("counts distinct watched episodes per TV show", async () => {
    await seedData(
      [
        createWatchHistory({ id: 1, mediaId: 1, mediaType: "tv" }),
        createWatchHistory({ id: 2, mediaId: 1, mediaType: "tv" }),
        createWatchHistory({ id: 3, mediaId: 1, mediaType: "tv" }),
      ],
      [createMedia({ id: 1, title: "Show A", mediaType: "tv" })],
      [
        createEpisode({ id: 1, showId: 1, seasonNumber: 1, episodeNumber: 1, watched: true }),
        createEpisode({ id: 2, showId: 1, seasonNumber: 1, episodeNumber: 2, watched: true }),
        createEpisode({ id: 3, showId: 1, seasonNumber: 2, episodeNumber: 1, watched: false }),
      ],
    );

    const data = await getTopStoriesData("tv");

    expect(data.items[0].distinctEpisodesWatched).toBe(2);
  });

  it("returns zero distinct episodes for movies", async () => {
    await seedData(
      [createWatchHistory({ id: 1, mediaId: 1, mediaType: "movie" })],
      [createMedia({ id: 1, title: "Movie A", mediaType: "movie" })],
      [],
    );

    const data = await getTopStoriesData("movie");

    expect(data.items[0].distinctEpisodesWatched).toBe(0);
  });

  it("excludes media with no title record", async () => {
    await seedData(
      [createWatchHistory({ id: 1, mediaId: 999, mediaType: "tv" })],
      [],
      [],
    );

    const data = await getTopStoriesData("all");

    // totalTitles counts all media IDs with watch events, even without a
    // matching media record, because it is derived from watch history alone.
    expect(data.items).toEqual([]);
    expect(data.totalTitles).toBe(1);
  });
});