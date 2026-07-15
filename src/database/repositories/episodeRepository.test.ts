import { describe, expect, it } from "vitest";

import type { Episode } from "../../types";

import { episodeRepository } from "./episodeRepository";

function createEpisode(overrides: Partial<Episode> = {}): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId: 1,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    overview: "Original episode overview.",
    runtime: 58,
    stillPath: "/pilot.jpg",
    airDate: "2008-01-20",
    voteAverage: 8.2,
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("episodeRepository", () => {
  it("adds an episode and retrieves it by generated ID", async () => {
    const episodeId = await episodeRepository.add(createEpisode());

    const storedEpisode = await episodeRepository.getById(episodeId);

    expect(episodeId).toBeGreaterThan(0);

    expect(storedEpisode).toMatchObject({
      id: episodeId,
      showId: 1,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: false,
    });
  });

  it("returns season episodes ordered by episode number", async () => {
    await episodeRepository.add(
      createEpisode({
        tmdbId: 62087,
        episodeNumber: 3,
        title: "...And the Bag's in the River",
      }),
    );

    await episodeRepository.add(
      createEpisode({
        tmdbId: 62085,
        episodeNumber: 1,
        title: "Pilot",
      }),
    );

    await episodeRepository.add(
      createEpisode({
        tmdbId: 62086,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const episodes = await episodeRepository.getByShowSeason(1, 1);

    expect(episodes.map((episode) => episode.episodeNumber)).toEqual([1, 2, 3]);
  });

  it("synchronizes new season episodes into the database", async () => {
    const incomingEpisodes = [
      createEpisode(),
      createEpisode({
        tmdbId: 62086,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    ];

    const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
      1,
      1,
      incomingEpisodes,
    );

    expect(synchronizedEpisodes).toHaveLength(2);

    expect(
      synchronizedEpisodes.map((episode) => episode.episodeNumber),
    ).toEqual(expect.arrayContaining([1, 2]));

    expect(synchronizedEpisodes.every((episode) => episode.id > 0)).toBe(true);
  });

  it("refreshes TMDB metadata during season re-synchronization", async () => {
    const originalEpisode = createEpisode({
      title: "Old Episode Title",
      overview: "Old overview.",
      runtime: 55,
      voteAverage: 7.5,
    });

    await episodeRepository.synchronizeSeason(1, 1, [originalEpisode]);

    const refreshedEpisode = createEpisode({
      title: "Updated Episode Title",
      overview: "Updated overview from TMDB.",
      runtime: 58,
      voteAverage: 8.2,
    });

    const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
      1,
      1,
      [refreshedEpisode],
    );

    expect(synchronizedEpisodes).toHaveLength(1);

    expect(synchronizedEpisodes[0]).toMatchObject({
      title: "Updated Episode Title",
      overview: "Updated overview from TMDB.",
      runtime: 58,
      voteAverage: 8.2,
    });
  });

  it("preserves local watch state during season re-synchronization", async () => {
    const originalCreatedAt = new Date("2026-07-01T00:00:00.000Z");

    const watchedAt = new Date("2026-07-10T18:30:00.000Z");

    const episodeId = await episodeRepository.add(
      createEpisode({
        title: "Old Episode Title",
        watched: true,
        watchedAt,
        createdAt: originalCreatedAt,
        updatedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    const incomingEpisode = createEpisode({
      title: "Updated Episode Title",
      overview: "Fresh TMDB metadata.",
      runtime: 60,
      watched: false,
      watchedAt: undefined,
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    });

    const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
      1,
      1,
      [incomingEpisode],
    );

    expect(synchronizedEpisodes).toHaveLength(1);

    const synchronizedEpisode = synchronizedEpisodes[0];

    expect(synchronizedEpisode?.id).toBe(episodeId);
    expect(synchronizedEpisode?.watched).toBe(true);
    expect(synchronizedEpisode?.watchedAt).toEqual(watchedAt);
    expect(synchronizedEpisode?.createdAt).toEqual(originalCreatedAt);

    expect(synchronizedEpisode).toMatchObject({
      title: "Updated Episode Title",
      overview: "Fresh TMDB metadata.",
      runtime: 60,
    });
  });

  it("marks an episode as watched", async () => {
    const episodeId = await episodeRepository.add(createEpisode());

    const originalEpisode = await episodeRepository.getById(episodeId);

    await episodeRepository.markWatched(episodeId);

    const watchedEpisode = await episodeRepository.getById(episodeId);

    expect(watchedEpisode?.watched).toBe(true);
    expect(watchedEpisode?.watchedAt).toBeInstanceOf(Date);

    expect(watchedEpisode?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalEpisode?.updatedAt.getTime() ?? 0,
    );
  });

  it("marks an episode as unwatched and clears watchedAt", async () => {
    const episodeId = await episodeRepository.add(
      createEpisode({
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.markUnwatched(episodeId);

    const unwatchedEpisode = await episodeRepository.getById(episodeId);

    expect(unwatchedEpisode?.watched).toBe(false);
    expect(unwatchedEpisode?.watchedAt).toBeUndefined();
  });
});
