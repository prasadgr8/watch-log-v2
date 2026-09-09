import { describe, expect, it } from "vitest";

import { calculateShowProgress } from "../../statistics/services/statisticsService";

import { buildLibraryProgressMap } from "./libraryProgress";

import type { Episode, Movie, PersistedMedia, TVShow } from "../../../types";

function createTvShow(overrides: Partial<TVShow> = {}): PersistedMedia {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: 1,
    mediaType: "tv",
    title: "Test Show",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PersistedMedia;
}

function createMovie(overrides: Partial<Movie> = {}): PersistedMedia {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: 1,
    mediaType: "movie",
    title: "Test Movie",
    userStatus: "completed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PersistedMedia;
}

function createEpisode(overrides: Partial<Episode> = {}): Episode {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    showId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Test Episode",
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("buildLibraryProgressMap", () => {
  it("returns an empty map for empty inputs", () => {
    const progress = buildLibraryProgressMap([], []);

    expect(progress.size).toBe(0);
  });

  it("maps a TV show with no watched regular episodes to 0%", () => {
    const media = [createTvShow({ id: 1 })];
    const episodes = [
      createEpisode({ showId: 1, episodeNumber: 1, watched: false }),
      createEpisode({ showId: 1, episodeNumber: 2, watched: false }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.get(1)).toEqual({
      percentage: 0,
      watchedEpisodeCount: 0,
      totalEpisodeCount: 2,
    });
  });

  it("maps a partially watched TV show to the rounded percentage", () => {
    const media = [createTvShow({ id: 1 })];
    const episodes = [
      createEpisode({ showId: 1, episodeNumber: 1, watched: true }),
      createEpisode({ showId: 1, episodeNumber: 2, watched: false }),
      createEpisode({ showId: 1, episodeNumber: 3, watched: false }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.get(1)).toEqual({
      percentage: 33,
      watchedEpisodeCount: 1,
      totalEpisodeCount: 3,
    });
  });

  it("maps a fully watched TV show to 100%", () => {
    const media = [createTvShow({ id: 1 })];
    const episodes = [
      createEpisode({ showId: 1, episodeNumber: 1, watched: true }),
      createEpisode({ showId: 1, episodeNumber: 2, watched: true }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.get(1)).toEqual({
      percentage: 100,
      watchedEpisodeCount: 2,
      totalEpisodeCount: 2,
    });
  });

  it("excludes Season 0 specials from TV progress", () => {
    const media = [createTvShow({ id: 1 })];
    const episodes = [
      createEpisode({
        showId: 1,
        seasonNumber: 0,
        episodeNumber: 1,
        watched: true,
      }),
      createEpisode({ showId: 1, episodeNumber: 1, watched: false }),
      createEpisode({ showId: 1, episodeNumber: 2, watched: false }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.get(1)).toEqual({
      percentage: 0,
      watchedEpisodeCount: 0,
      totalEpisodeCount: 2,
    });
  });

  it("omits a TV show with no regular episodes (unknown progress)", () => {
    const media = [createTvShow({ id: 1 })];
    const episodes = [
      createEpisode({
        showId: 1,
        seasonNumber: 0,
        episodeNumber: 1,
        watched: true,
      }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.has(1)).toBe(false);
  });

  it("maps a completed movie to 100%", () => {
    const media = [createMovie({ id: 7, userStatus: "completed" })];

    const progress = buildLibraryProgressMap(media, []);

    expect(progress.get(7)).toEqual({
      percentage: 100,
      watchedEpisodeCount: 0,
      totalEpisodeCount: 0,
    });
  });

  it("maps a non-completed movie to 0%", () => {
    const media = [
      createMovie({ id: 7, userStatus: "planned" }),
      createMovie({ id: 8, userStatus: "watching" }),
      createMovie({ id: 9, userStatus: "on-hold" }),
      createMovie({ id: 10, userStatus: "dropped" }),
    ];

    const progress = buildLibraryProgressMap(media, []);

    expect(progress.get(7)).toEqual({
      percentage: 0,
      watchedEpisodeCount: 0,
      totalEpisodeCount: 0,
    });
    expect(progress.get(8)?.percentage).toBe(0);
    expect(progress.get(9)?.percentage).toBe(0);
    expect(progress.get(10)?.percentage).toBe(0);
  });

  it("maps a mixed TV and movie library", () => {
    const media = [
      createTvShow({ id: 1 }),
      createTvShow({ id: 2 }),
      createMovie({ id: 3, userStatus: "completed" }),
      createMovie({ id: 4, userStatus: "planned" }),
    ];
    const episodes = [
      createEpisode({ showId: 2, episodeNumber: 1, watched: true }),
      createEpisode({ showId: 2, episodeNumber: 2, watched: false }),
    ];

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.has(1)).toBe(false);
    expect(progress.get(2)).toEqual({
      percentage: 50,
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
    });
    expect(progress.get(3)).toEqual({
      percentage: 100,
      watchedEpisodeCount: 0,
      totalEpisodeCount: 0,
    });
    expect(progress.get(4)?.percentage).toBe(0);
  });

  it("matches calculateShowProgress semantics for TV shows (parity)", () => {
    const media = [createTvShow({ id: 1 }), createTvShow({ id: 2 })];
    const episodes = [
      createEpisode({ showId: 1, episodeNumber: 1, watched: true }),
      createEpisode({ showId: 1, episodeNumber: 2, watched: false }),
      createEpisode({ showId: 1, episodeNumber: 3, watched: false }),
      createEpisode({ showId: 2, episodeNumber: 1, watched: true }),
      createEpisode({
        showId: 2,
        seasonNumber: 0,
        episodeNumber: 1,
        watched: true,
      }),
    ];
    const showProgress = calculateShowProgress(media, episodes);

    const expected = new Map(
      showProgress.shows.map((show) => [show.showId, show.progressPercentage]),
    );

    const progress = buildLibraryProgressMap(media, episodes);

    expect(progress.get(1)?.percentage).toBe(expected.get(1));
    expect(progress.get(2)?.percentage).toBe(expected.get(2));
  });
});
