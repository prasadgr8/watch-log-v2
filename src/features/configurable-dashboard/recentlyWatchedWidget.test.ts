import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../database/repositories";

import type { Episode, Movie, TVShow } from "../../types";

import {
  getRecentlyWatchedWidgetItems,
  RECENTLY_WATCHED_PREVIEW_LIMIT,
} from "./services/recentlyWatchedWidgetService";

function createTvShow(overrides: Partial<TVShow> = {}): TVShow {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMovie(overrides: Partial<Movie> = {}): Movie {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    tmdbId: 550,
    mediaType: "movie",
    title: "Fight Club",
    userStatus: "completed",
    watchedAt: new Date("2026-07-14T20:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createEpisode(
  showId: number,
  overrides: Partial<Episode> = {},
): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    watched: true,
    watchedAt: new Date("2026-07-10T18:30:00.000Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function recordEpisodeWatch(
  showId: number,
  episodeId: number,
  watchedAt: Date,
): Promise<number> {
  const { event } = await watchHistoryRepository.recordWatchEvent({
    mediaId: showId,
    mediaType: "tv",
    episodeId,
    watchedAt,
    source: "manual",
    createdAt: watchedAt,
  });

  return event.id;
}

describe("recently watched widget service", () => {
  it("orders recent activity newest first with title and watched time", async () => {
    const showId = await mediaRepository.add(createTvShow());

    const olderEpisodeId = await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 1, title: "Pilot" }),
    );
    const newerEpisodeId = await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2, title: "Second" }),
    );

    await recordEpisodeWatch(
      showId,
      olderEpisodeId,
      new Date("2026-07-10T18:30:00.000Z"),
    );
    await recordEpisodeWatch(
      showId,
      newerEpisodeId,
      new Date("2026-07-12T19:00:00.000Z"),
    );

    const items = await getRecentlyWatchedWidgetItems();

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "tv",
      title: "Breaking Bad",
      episodeCode: "S01E02",
      episodeTitle: "Second",
      mediaId: showId,
    });
    expect(items[0]?.watchedAt).toEqual(new Date("2026-07-12T19:00:00.000Z"));
    expect(items[1]).toMatchObject({
      episodeCode: "S01E01",
      episodeTitle: "Pilot",
    });
    expect(items[1]?.watchedAt).toEqual(new Date("2026-07-10T18:30:00.000Z"));
  });

  it("includes movies alongside episodes", async () => {
    const showId = await mediaRepository.add(createTvShow());
    const movieId = await mediaRepository.add(createMovie());

    const episodeId = await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 1 }),
    );
    await recordEpisodeWatch(
      showId,
      episodeId,
      new Date("2026-07-10T18:30:00.000Z"),
    );

    const movieWatchedAt = new Date("2026-07-14T20:00:00.000Z");
    await watchHistoryRepository.recordWatchEvent({
      mediaId: movieId,
      mediaType: "movie",
      episodeId: null,
      watchedAt: movieWatchedAt,
      source: "manual",
      createdAt: movieWatchedAt,
    });

    const items = await getRecentlyWatchedWidgetItems();

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "movie",
      title: "Fight Club",
      episodeCode: null,
      episodeTitle: null,
      mediaId: movieId,
    });
    expect(items[0]?.watchedAt).toEqual(movieWatchedAt);
    expect(items[1]).toMatchObject({ kind: "tv", title: "Breaking Bad" });
  });

  it("caps the widget to the compact preview limit", async () => {
    const showId = await mediaRepository.add(createTvShow());

    for (let index = 0; index < RECENTLY_WATCHED_PREVIEW_LIMIT + 2; index++) {
      const episodeId = await episodeRepository.add(
        createEpisode(showId, {
          episodeNumber: index + 1,
          title: `Episode ${index + 1}`,
        }),
      );
      await recordEpisodeWatch(
        showId,
        episodeId,
        new Date(Date.UTC(2026, 6, 10 + index, 18, 30)),
      );
    }

    const items = await getRecentlyWatchedWidgetItems();

    expect(items).toHaveLength(RECENTLY_WATCHED_PREVIEW_LIMIT);
    expect(items[0]?.episodeTitle).toBe(
      `Episode ${RECENTLY_WATCHED_PREVIEW_LIMIT + 2}`,
    );
  });
});
