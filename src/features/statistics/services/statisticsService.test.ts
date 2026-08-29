import { describe, expect, it } from "vitest";

import { db } from "../../../database/db";

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";

import type {
  Episode,
  Media,
  Movie,
  TVShow,
  WatchHistory,
} from "../../../types";

import {
  calculateEpisodeStatistics,
  calculateLibraryStatistics,
  calculateRecentActivity,
  calculateShowProgress,
  calculateWatchTimeStatistics,
  loadStatistics,
} from "./statisticsService";

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
    tmdbId: 603,
    mediaType: "movie",
    title: "The Matrix",
    userStatus: "completed",
    rating: 9,
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
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    runtime: 45,
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createWatchHistory(
  overrides: Partial<WatchHistory> = {},
): WatchHistory {
  return {
    episodeId: 1,
    watchedAt: new Date("2026-07-15T00:00:00.000Z"),
    source: "manual",
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
  };
}

async function seedTvShow(overrides: Partial<TVShow> = {}): Promise<number> {
  return mediaRepository.add(createTvShow(overrides));
}

describe("calculateEpisodeStatistics", () => {
  it("handles an empty episode set without producing NaN", () => {
    expect(calculateEpisodeStatistics([])).toEqual({
      totalEpisodes: 0,
      specialEpisodes: 0,
      watchedEpisodes: 0,
      unwatchedEpisodes: 0,
      watchedPercentage: 0,
      regularEpisodes: 0,
      watchedRegularEpisodes: 0,
      regularWatchedPercentage: 0,
    });
  });

  it("counts a movies-only library as having no episodes", async () => {
    await mediaRepository.add(createMovie());

    const stats = calculateEpisodeStatistics(await episodeRepository.getAll());

    expect(stats.totalEpisodes).toBe(0);
    expect(stats.watchedPercentage).toBe(0);
    expect(stats.regularWatchedPercentage).toBe(0);
  });

  it("counts total, watched, unwatched, and Season 0 specials", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 0,
        episodeNumber: 1,
        title: "Special",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const stats = calculateEpisodeStatistics(await episodeRepository.getAll());

    expect(stats.totalEpisodes).toBe(3);
    expect(stats.specialEpisodes).toBe(1);
    expect(stats.watchedEpisodes).toBe(2);
    expect(stats.unwatchedEpisodes).toBe(1);
    expect(stats.watchedPercentage).toBe(67);
    expect(stats.regularEpisodes).toBe(2);
    expect(stats.watchedRegularEpisodes).toBe(1);
    expect(stats.regularWatchedPercentage).toBe(50);
  });
});

describe("calculateWatchTimeStatistics", () => {
  it("returns safe zero values for an empty episode set", () => {
    const stats = calculateWatchTimeStatistics([]);

    expect(stats.watchedRuntimeMinutes).toBe(0);
    expect(stats.watchedHours).toBe(0);
    expect(stats.watchedEpisodesWithRuntime).toBe(0);
    expect(stats.averageRuntimePerWatchedEpisode).toBeNull();
    expect(stats.movieRuntimeMinutes).toBe(0);
  });

  it("sums runtime only for watched episodes", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        runtime: 58,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        runtime: 47,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    // Unwatched episode runtime must not contribute.
    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 3,
        runtime: 60,
      }),
    );

    const stats = calculateWatchTimeStatistics(await episodeRepository.getAll());

    expect(stats.watchedRuntimeMinutes).toBe(105);
    expect(stats.watchedHours).toBe(1.8);
    expect(stats.watchedEpisodesWithRuntime).toBe(2);
    expect(stats.averageRuntimePerWatchedEpisode).toBe(52.5);
  });

  it("treats missing runtime as zero minutes", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        runtime: 58,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        runtime: undefined,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const stats = calculateWatchTimeStatistics(await episodeRepository.getAll());

    expect(stats.watchedRuntimeMinutes).toBe(58);
    expect(stats.watchedHours).toBe(1);
    expect(stats.watchedEpisodesWithRuntime).toBe(1);
    expect(stats.averageRuntimePerWatchedEpisode).toBe(58);
  });

  it("returns null average when no watched episode has runtime", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        runtime: undefined,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        runtime: undefined,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const stats = calculateWatchTimeStatistics(await episodeRepository.getAll());

    expect(stats.watchedRuntimeMinutes).toBe(0);
    expect(stats.watchedEpisodesWithRuntime).toBe(0);
    expect(stats.averageRuntimePerWatchedEpisode).toBeNull();
  });
});

describe("calculateShowProgress", () => {
  it("handles an empty library with safe zero counts", async () => {
    const progress = calculateShowProgress([], []);

    expect(progress).toEqual({
      completedShows: 0,
      partiallyWatchedShows: 0,
      unwatchedShows: 0,
      showsWithoutEpisodes: 0,
      shows: [],
    });
  });

  it("reports no TV progress for a movies-only library", async () => {
    await mediaRepository.add(createMovie());

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.completedShows).toBe(0);
    expect(progress.showsWithoutEpisodes).toBe(0);
    expect(progress.shows).toEqual([]);
  });

  it("classifies a show with every regular episode watched as completed", async () => {
    const showId = await seedTvShow({ userStatus: "watching" });

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.completedShows).toBe(1);

    expect(progress.shows[0]).toMatchObject({
      status: "completed",
      watchedEpisodeCount: 2,
      totalEpisodeCount: 2,
      progressPercentage: 100,
    });

    // Episode-derived completion is distinct from Media.userStatus.
    expect(calculateLibraryStatistics(media).completed).toBe(0);
  });

  it("classifies a partially watched show", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2, title: "Cat's in the Bag..." }),
    );

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 3, title: "...And the Bag's in the River" }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.partiallyWatchedShows).toBe(1);

    expect(progress.shows[0]).toMatchObject({
      status: "partially-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 3,
      progressPercentage: 33,
    });
  });

  it("classifies a show without any watched episodes as unwatched", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(createEpisode(showId, { episodeNumber: 1 }));
    await episodeRepository.add(createEpisode(showId, { episodeNumber: 2 }));

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.unwatchedShows).toBe(1);

    expect(progress.shows[0]).toMatchObject({
      status: "unwatched",
      watchedEpisodeCount: 0,
      totalEpisodeCount: 2,
      progressPercentage: 0,
    });
  });

  it("reports a show without synchronized episodes as empty", async () => {
    await seedTvShow({ title: "Better Call Saul" });
    await seedTvShow({ title: "Breaking Bad", userStatus: "completed" });

    const media = await mediaRepository.getAll();
    const progress = calculateShowProgress(media, []);

    expect(progress.showsWithoutEpisodes).toBe(2);
    expect(progress.shows.every((show) => show.status === "empty")).toBe(true);
  });

  it("derives per-season progress across multiple seasons", async () => {
    const showId = await seedTvShow({ title: "Better Call Saul" });

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 3,
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 2,
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-12T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 2,
        episodeNumber: 2,
      }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    const show = progress.shows[0];

    expect(show?.seasons.map((season) => season.seasonNumber)).toEqual([1, 2]);

    expect(show?.seasons[0]).toMatchObject({
      seasonNumber: 1,
      status: "partially-watched",
      watchedEpisodeCount: 2,
      totalEpisodeCount: 3,
      progressPercentage: 67,
    });

    expect(show?.seasons[1]).toMatchObject({
      seasonNumber: 2,
      status: "partially-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
      progressPercentage: 50,
    });
  });

  it("keeps Season 0 specials out of regular progress while reporting them", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2 }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 0,
        episodeNumber: 1,
        title: "Special",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    const show = progress.shows[0];

    expect(show).toMatchObject({
      status: "partially-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
      specialEpisodeCount: 1,
      progressPercentage: 50,
    });

    // Season 0 remains available as a separate season row for display.
    expect(show?.seasons[0]).toMatchObject({
      seasonNumber: 0,
      status: "fully-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 1,
    });
  });

  it("includes specials in counts when includeSpecials is enabled", async () => {
    const showId = await seedTvShow();

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 1 }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 0,
        episodeNumber: 1,
        title: "Special",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const regular = calculateShowProgress(media, episodes);
    const withSpecials = calculateShowProgress(media, episodes, true);

    expect(regular.shows[0]).toMatchObject({
      status: "unwatched",
      watchedEpisodeCount: 0,
      totalEpisodeCount: 1,
      specialEpisodeCount: 1,
    });

    expect(withSpecials.shows[0]).toMatchObject({
      status: "partially-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
      specialEpisodeCount: 1,
    });
  });

  it("orders shows by most recent activity then title", async () => {
    const oldShowId = await seedTvShow({ title: "Old Show" });
    const newShowId = await seedTvShow({ title: "New Show" });

    await episodeRepository.add(
      createEpisode(oldShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(oldShowId, { episodeNumber: 2 }),
    );

    await episodeRepository.add(
      createEpisode(newShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-12T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(newShowId, { episodeNumber: 2 }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.shows.map((show) => show.title)).toEqual([
      "New Show",
      "Old Show",
    ]);
  });

  it("derives progress for a mixed library without mixing counts", async () => {
    await mediaRepository.add(createMovie());
    await mediaRepository.add(
      createMovie({ tmdbId: 12, title: "Inception" }),
    );

    const completedShowId = await seedTvShow({ title: "Firefly" });

    await episodeRepository.add(
      createEpisode(completedShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    const partialShowId = await seedTvShow({ title: "Lost" });

    await episodeRepository.add(
      createEpisode(partialShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(partialShowId, { episodeNumber: 2 }),
    );

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const progress = calculateShowProgress(media, episodes);

    expect(progress.completedShows).toBe(1);
    expect(progress.partiallyWatchedShows).toBe(1);
    expect(progress.shows).toHaveLength(2);
  });
});

describe("calculateRecentActivity", () => {
  it("returns safe empty values without any watched episodes", async () => {
    const activity = calculateRecentActivity([], []);

    expect(activity.recentlyWatched).toEqual([]);
    expect(activity.firstWatchDate).toBeNull();
    expect(activity.lastWatchDate).toBeNull();
  });

  it("orders recently watched episodes by most recent first and applies the limit", async () => {
    const showId = await seedTvShow({ title: "Breaking Bad" });

    for (let episodeNumber = 1; episodeNumber <= 12; episodeNumber += 1) {
      await episodeRepository.add(
        createEpisode(showId, {
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          watched: true,
          watchedAt: new Date(`2026-07-${String(episodeNumber).padStart(2, "0")}T18:30:00.000Z`),
        }),
      );
    }

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const activity = calculateRecentActivity(episodes, media);

    expect(activity.recentlyWatched).toHaveLength(10);

    expect(activity.recentlyWatched[0]).toMatchObject({
      showTitle: "Breaking Bad",
      seasonNumber: 1,
      episodeNumber: 12,
      title: "Episode 12",
    });

    expect(activity.recentlyWatched[9]).toMatchObject({
      episodeNumber: 3,
    });

    // A smaller explicit limit is honoured.
    const limited = calculateRecentActivity(episodes, media, 2);

    expect(limited.recentlyWatched.map((item) => item.episodeNumber)).toEqual([
      12, 11,
    ]);
  });

  it("reports first and last watch dates from the episode cache", async () => {
    const showId = await seedTvShow({ title: "Breaking Bad" });

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(createEpisode(showId, { episodeNumber: 3 }));

    const media = await mediaRepository.getAll();
    const episodes = await episodeRepository.getAll();

    const activity = calculateRecentActivity(episodes, media);

    expect(activity.firstWatchDate).toEqual(
      new Date("2026-07-10T18:30:00.000Z"),
    );

    expect(activity.lastWatchDate).toEqual(
      new Date("2026-07-11T18:30:00.000Z"),
    );
  });

  it("falls back to a friendly show label for orphaned episodes", () => {
    const episodes = [
      createEpisode(999, {
        id: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    ];

    const activity = calculateRecentActivity(episodes, []);

    expect(activity.recentlyWatched[0]?.showTitle).toBe("Unknown Show");
  });
});

describe("calculateLibraryStatistics (regression)", () => {
  it("preserves the existing rating and watch-status aggregates", () => {
    const media: Media[] = [
      createMovie(),
      createMovie({ tmdbId: 12, title: "Inception", rating: 8.5 }),
      createTvShow(),
    ];

    const stats = calculateLibraryStatistics(media);

    expect(stats.total).toBe(3);
    expect(stats.movies).toBe(2);
    expect(stats.tvShows).toBe(1);
    expect(stats.completed).toBe(2);
    expect(stats.activeTitles).toBe(1);
    expect(stats.remainingTitles).toBe(1);
    expect(stats.completionRate).toBe(67);
    expect(stats.ratedTitles).toBe(2);
    expect(stats.averageRating).toBe(8.8);
    expect(stats.highestRating).toBe(9);
  });

  it("keeps rating aggregates safe when no title is rated", () => {
    const stats = calculateLibraryStatistics([createTvShow(), createMovie({ rating: undefined })]);

    expect(stats.ratedTitles).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.highestRating).toBe(0);
  });
});

describe("loadStatistics", () => {
  it("builds a complete safe dashboard for an empty library", async () => {
    const stats = await loadStatistics();

    expect(stats.library.total).toBe(0);
    expect(stats.episodes.totalEpisodes).toBe(0);
    expect(stats.episodes.watchedPercentage).toBe(0);
    expect(stats.watchTime.watchedHours).toBe(0);
    expect(stats.watchTime.averageRuntimePerWatchedEpisode).toBeNull();
    expect(stats.showProgress.shows).toEqual([]);
    expect(stats.recentActivity.recentlyWatched).toEqual([]);
    expect(stats.recentActivity.firstWatchDate).toBeNull();
    expect(stats.recentActivity.lastWatchDate).toBeNull();
    expect(stats.watchEventCount).toBe(0);
  });

  it("loads every store and derives each statistics section", async () => {
    const showId = await seedTvShow({ title: "Breaking Bad" });

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        runtime: 58,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2 }),
    );

    await mediaRepository.add(createMovie());

    const stats = await loadStatistics();

    expect(stats.library.tvShows).toBe(1);
    expect(stats.library.movies).toBe(1);
    expect(stats.episodes.watchedEpisodes).toBe(1);
    expect(stats.watchTime.watchedRuntimeMinutes).toBe(58);
    expect(stats.showProgress.partiallyWatchedShows).toBe(1);
    expect(stats.recentActivity.lastWatchDate).toEqual(
      new Date("2026-07-10T18:30:00.000Z"),
    );
  });

  it("counts raw watch-history events while duplicate rows never alter episode progress", async () => {
    const showId = await seedTvShow();

    const episodeId = await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2 }),
    );

    // Simulate duplicate watch events for the same episode.
    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const stats = await loadStatistics();

    expect(stats.watchEventCount).toBe(2);
    expect(stats.episodes.watchedEpisodes).toBe(1);
    expect(stats.showProgress.shows[0]).toMatchObject({
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
    });
  });

  it("counts a large watch history accurately", async () => {
    const showId = await seedTvShow();

    const episodeId = await episodeRepository.add(createEpisode(showId));

    const events: WatchHistory[] = Array.from({ length: 5000 }, (_, index) => ({
      episodeId,
      watchedAt: new Date(2020, 0, 1 + index),
      source: "manual",
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
    }));

    await db.watchHistory.bulkAdd(events);

    const stats = await loadStatistics();

    expect(stats.watchEventCount).toBe(5000);
  });
});