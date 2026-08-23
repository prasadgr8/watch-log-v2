import { describe, expect, it, vi } from "vitest";

import type { Episode, WatchHistory } from "../../types";

import { db } from "../db";

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

  it("marks an episode as watched and creates a watch history event", async () => {
    const episodeId = await episodeRepository.add(createEpisode());

    const originalEpisode = await episodeRepository.getById(episodeId);

    await episodeRepository.markWatched(episodeId);

    const watchedEpisode = await episodeRepository.getById(episodeId);

    const watchHistoryEvents = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    expect(watchedEpisode?.watched).toBe(true);
    expect(watchedEpisode?.watchedAt).toBeInstanceOf(Date);

    expect(watchedEpisode?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalEpisode?.updatedAt.getTime() ?? 0,
    );

    expect(watchHistoryEvents).toHaveLength(1);

    expect(watchHistoryEvents[0]).toMatchObject({
      episodeId,
      watchedAt: watchedEpisode?.watchedAt,
      source: "manual",
    });

    expect(watchHistoryEvents[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("marks an episode as unwatched and removes its watch history", async () => {
    const episodeId = await episodeRepository.add(createEpisode());

    await episodeRepository.markWatched(episodeId);
    await episodeRepository.markWatched(episodeId);

    const watchHistoryBefore = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    expect(watchHistoryBefore).toHaveLength(2);

    await episodeRepository.markUnwatched(episodeId);

    const unwatchedEpisode = await episodeRepository.getById(episodeId);

    const watchHistoryAfter = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    expect(unwatchedEpisode?.watched).toBe(false);
    expect(unwatchedEpisode?.watchedAt).toBeUndefined();
    expect(watchHistoryAfter).toHaveLength(0);
  });

  it("does not create watch history when marking a missing episode as watched", async () => {
    await expect(episodeRepository.markWatched(999)).rejects.toThrow(
      "Episode 999 was not found.",
    );

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(watchHistoryEvents).toHaveLength(0);
  });

  it("rejects marking a missing episode as unwatched", async () => {
    await expect(episodeRepository.markUnwatched(999)).rejects.toThrow(
      "Episode 999 was not found.",
    );

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(watchHistoryEvents).toHaveLength(0);
  });

  it("marks multiple unwatched episodes as watched with a single operation timestamp", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2, title: "Cat's in the Bag..." }),
    );

    const thirdEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 3, title: "...And the Bag's in the River" }),
    );

    const result = await episodeRepository.markEpisodesWatched([
      firstEpisodeId,
      secondEpisodeId,
      thirdEpisodeId,
    ]);

    const [firstEpisode, secondEpisode, thirdEpisode] = await Promise.all([
      episodeRepository.getById(firstEpisodeId),
      episodeRepository.getById(secondEpisodeId),
      episodeRepository.getById(thirdEpisodeId),
    ]);

    expect(result).toMatchObject({
      newlyWatchedCount: 3,
      alreadyWatchedCount: 0,
      missingCount: 0,
    });

    expect(firstEpisode).toMatchObject({ watched: true });
    expect(secondEpisode).toMatchObject({ watched: true });
    expect(thirdEpisode).toMatchObject({ watched: true });

    expect(firstEpisode?.watchedAt).toBeInstanceOf(Date);
    expect(firstEpisode?.watchedAt).toEqual(secondEpisode?.watchedAt);
    expect(secondEpisode?.watchedAt).toEqual(thirdEpisode?.watchedAt);
  });

  it("creates exactly one manual watch history event per newly watched episode", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    const result = await episodeRepository.markEpisodesWatched([
      firstEpisodeId,
      secondEpisodeId,
    ]);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(result.newlyWatchedCount).toBe(2);
    expect(watchHistoryEvents).toHaveLength(2);

    expect(
      watchHistoryEvents.map((event) => event.episodeId).sort((a, b) => a - b),
    ).toEqual([firstEpisodeId, secondEpisodeId]);

    for (const watchHistoryEvent of watchHistoryEvents) {
      expect(watchHistoryEvent.source).toBe("manual");
      expect(watchHistoryEvent.watchedAt).toBeInstanceOf(Date);
      expect(watchHistoryEvent.createdAt).toBeInstanceOf(Date);
    }
  });

  it("skips already watched episodes without creating extra history", async () => {
    const watchedEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const unwatchedEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    await episodeRepository.markWatched(watchedEpisodeId);

    const watchedBefore = await episodeRepository.getById(watchedEpisodeId);

    const result = await episodeRepository.markEpisodesWatched([
      watchedEpisodeId,
      unwatchedEpisodeId,
    ]);

    const watchedAfter = await episodeRepository.getById(watchedEpisodeId);

    const watchedEpisodeHistory = await db.watchHistory
      .where("episodeId")
      .equals(watchedEpisodeId)
      .toArray();

    expect(result).toMatchObject({
      newlyWatchedCount: 1,
      alreadyWatchedCount: 1,
      missingCount: 0,
    });

    expect(watchedAfter?.watchedAt).toEqual(watchedBefore?.watchedAt);
    expect(watchedEpisodeHistory).toHaveLength(1);
  });

  it("preserves existing watchedAt values during a bulk mark", async () => {
    const importedWatchedAt = new Date("2026-01-15T12:00:00.000Z");

    const importedEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const freshEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    await episodeRepository.markWatchedFromImport(
      importedEpisodeId,
      importedWatchedAt,
    );

    const result = await episodeRepository.markEpisodesWatched([
      importedEpisodeId,
      freshEpisodeId,
    ]);

    const importedEpisode = await episodeRepository.getById(importedEpisodeId);

    const importedEpisodeHistory = await db.watchHistory
      .where("episodeId")
      .equals(importedEpisodeId)
      .toArray();

    expect(result).toMatchObject({
      newlyWatchedCount: 1,
      alreadyWatchedCount: 1,
    });

    expect(importedEpisode?.watchedAt).toEqual(importedWatchedAt);
    expect(importedEpisodeHistory).toHaveLength(1);
    expect(importedEpisodeHistory[0]).toMatchObject({
      watchedAt: importedWatchedAt,
      source: "import",
    });
  });

  it("ignores missing episode IDs safely", async () => {
    const realEpisodeId = await episodeRepository.add(createEpisode());

    const result = await episodeRepository.markEpisodesWatched([
      realEpisodeId,
      99991,
    ]);

    const realEpisode = await episodeRepository.getById(realEpisodeId);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(result).toMatchObject({
      newlyWatchedCount: 1,
      alreadyWatchedCount: 0,
      missingCount: 1,
    });

    expect(realEpisode?.watched).toBe(true);
    expect(watchHistoryEvents).toHaveLength(1);
  });

  it("marks an entire season as watched", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    const thirdEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 3 }),
    );

    await episodeRepository.markWatched(firstEpisodeId);

    const result = await episodeRepository.markSeasonWatched(1, 1);

    const [firstEpisode, secondEpisode, thirdEpisode] = await Promise.all([
      episodeRepository.getById(firstEpisodeId),
      episodeRepository.getById(secondEpisodeId),
      episodeRepository.getById(thirdEpisodeId),
    ]);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(result).toMatchObject({
      newlyWatchedCount: 2,
      alreadyWatchedCount: 1,
    });

    expect(firstEpisode?.watched).toBe(true);
    expect(secondEpisode?.watched).toBe(true);
    expect(thirdEpisode?.watched).toBe(true);
    expect(watchHistoryEvents).toHaveLength(3);
  });

  it("does not affect episodes from another season when marking a season watched", async () => {
    await episodeRepository.add(createEpisode({ episodeNumber: 1 }));

    await episodeRepository.add(createEpisode({ episodeNumber: 2 }));

    const seasonTwoEpisodeId = await episodeRepository.add(
      createEpisode({
        seasonNumber: 2,
        episodeNumber: 1,
        title: "Seven Thirty-Seven",
      }),
    );

    const result = await episodeRepository.markSeasonWatched(1, 1);

    const seasonTwoEpisode =
      await episodeRepository.getById(seasonTwoEpisodeId);

    const seasonTwoHistory = await db.watchHistory
      .where("episodeId")
      .equals(seasonTwoEpisodeId)
      .toArray();

    expect(result.newlyWatchedCount).toBe(2);
    expect(seasonTwoEpisode?.watched).toBe(false);
    expect(seasonTwoEpisode?.watchedAt).toBeUndefined();
    expect(seasonTwoHistory).toHaveLength(0);
  });

  it("does not affect episodes from another show when marking a season watched", async () => {
    const breakingBadEpisodeId = await episodeRepository.add(createEpisode());

    const otherShowEpisodeId = await episodeRepository.add(
      createEpisode({
        showId: 2,
        tmdbId: 66732,
        title: "Stranger Things Pilot",
      }),
    );

    const result = await episodeRepository.markSeasonWatched(1, 1);

    const breakingBadEpisode = await episodeRepository.getById(
      breakingBadEpisodeId,
    );

    const otherShowEpisode =
      await episodeRepository.getById(otherShowEpisodeId);

    const otherShowHistory = await db.watchHistory
      .where("episodeId")
      .equals(otherShowEpisodeId)
      .toArray();

    expect(result.newlyWatchedCount).toBe(1);
    expect(breakingBadEpisode?.watched).toBe(true);
    expect(otherShowEpisode?.watched).toBe(false);
    expect(otherShowHistory).toHaveLength(0);
  });

  it("marks an entire season as unwatched and clears its watch history", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    const thirdEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 3 }),
    );

    await episodeRepository.markWatched(firstEpisodeId);

    await episodeRepository.markWatched(secondEpisodeId);
    await episodeRepository.markWatched(secondEpisodeId);

    const result = await episodeRepository.markSeasonUnwatched(1, 1);

    const [firstEpisode, secondEpisode, thirdEpisode] = await Promise.all([
      episodeRepository.getById(firstEpisodeId),
      episodeRepository.getById(secondEpisodeId),
      episodeRepository.getById(thirdEpisodeId),
    ]);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(result).toMatchObject({
      newlyUnwatchedCount: 2,
      alreadyUnwatchedCount: 1,
    });

    expect(firstEpisode).toMatchObject({ watched: false });
    expect(secondEpisode).toMatchObject({ watched: false });
    expect(thirdEpisode).toMatchObject({ watched: false });

    expect(firstEpisode?.watchedAt).toBeUndefined();
    expect(secondEpisode?.watchedAt).toBeUndefined();
    expect(thirdEpisode?.watchedAt).toBeUndefined();
    expect(watchHistoryEvents).toHaveLength(0);
  });

  it("leaves already unwatched episodes unchanged when marking a season unwatched", async () => {
    const watchedEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const unwatchedEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    await episodeRepository.markWatched(watchedEpisodeId);

    const unwatchedBefore = await episodeRepository.getById(unwatchedEpisodeId);

    const result = await episodeRepository.markSeasonUnwatched(1, 1);

    const unwatchedAfter = await episodeRepository.getById(unwatchedEpisodeId);

    expect(result).toMatchObject({
      newlyUnwatchedCount: 1,
      alreadyUnwatchedCount: 1,
    });

    expect(unwatchedAfter).toEqual(unwatchedBefore);
  });

  it("removes only the unwatched season's watch history entries", async () => {
    const targetEpisodeId = await episodeRepository.add(createEpisode());

    const otherShowEpisodeId = await episodeRepository.add(
      createEpisode({
        showId: 2,
        tmdbId: 66732,
        title: "Stranger Things Pilot",
      }),
    );

    await episodeRepository.markWatched(targetEpisodeId);
    await episodeRepository.markWatched(otherShowEpisodeId);

    const result = await episodeRepository.markSeasonUnwatched(1, 1);

    const remainingHistory = await db.watchHistory.toArray();

    expect(result.newlyUnwatchedCount).toBe(1);
    expect(remainingHistory).toHaveLength(1);
    expect(remainingHistory[0]).toMatchObject({
      episodeId: otherShowEpisodeId,
      source: "manual",
    });
  });

  it("performs a safe no-op for an empty or nonexistent season", async () => {
    await episodeRepository.add(
      createEpisode({ seasonNumber: 1, episodeNumber: 1 }),
    );

    const watchedResult = await episodeRepository.markSeasonWatched(1, 7);

    const unwatchedResult = await episodeRepository.markSeasonUnwatched(1, 7);

    const missingShowWatchedResult =
      await episodeRepository.markSeasonWatched(999, 1);

    const missingShowUnwatchedResult =
      await episodeRepository.markSeasonUnwatched(999, 1);

    const watchHistoryEvents = await db.watchHistory.toArray();

    const storedEpisodes = await db.episodes.toArray();

    expect(watchedResult).toMatchObject({
      newlyWatchedCount: 0,
      alreadyWatchedCount: 0,
    });

    expect(unwatchedResult).toMatchObject({
      newlyUnwatchedCount: 0,
      alreadyUnwatchedCount: 0,
    });

    expect(missingShowWatchedResult).toMatchObject({
      newlyWatchedCount: 0,
      alreadyWatchedCount: 0,
    });

    expect(missingShowUnwatchedResult).toMatchObject({
      newlyUnwatchedCount: 0,
      alreadyUnwatchedCount: 0,
    });

    expect(watchHistoryEvents).toHaveLength(0);
    expect(storedEpisodes.every((episode) => !episode.watched)).toBe(true);
  });

  it("rolls back episodes and watch history together when a bulk mark fails midway", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    const originalAdd = db.watchHistory.add.bind(db.watchHistory);

    const addSpy = vi
      .spyOn(db.watchHistory, "add")
      .mockImplementation((watchHistory: WatchHistory) => {
        if (watchHistory.episodeId === secondEpisodeId) {
          throw new Error("Simulated watch history failure.");
        }

        return originalAdd(watchHistory);
      });

    await expect(
      episodeRepository.markEpisodesWatched([firstEpisodeId, secondEpisodeId]),
    ).rejects.toThrow("Simulated watch history failure.");

    addSpy.mockRestore();

    const [firstAfterRollback, secondAfterRollback] = await Promise.all([
      episodeRepository.getById(firstEpisodeId),
      episodeRepository.getById(secondEpisodeId),
    ]);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(firstAfterRollback?.watched).toBe(false);
    expect(firstAfterRollback?.watchedAt).toBeUndefined();
    expect(secondAfterRollback?.watched).toBe(false);
    expect(watchHistoryEvents).toHaveLength(0);
  });

  it("rolls back episodes and watch history together when a season unwatch fails midway", async () => {
    const firstEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 1 }),
    );

    const secondEpisodeId = await episodeRepository.add(
      createEpisode({ episodeNumber: 2 }),
    );

    await episodeRepository.markWatched(firstEpisodeId);

    await episodeRepository.markWatched(secondEpisodeId);
    await episodeRepository.markWatched(secondEpisodeId);

    const firstBefore = await episodeRepository.getById(firstEpisodeId);
    const secondBefore = await episodeRepository.getById(secondEpisodeId);

    const originalUpdate = db.episodes.update.bind(db.episodes);

    const updateSpy = vi
      .spyOn(db.episodes, "update")
      .mockImplementation((key, changes) => {
        if (key === secondEpisodeId) {
          throw new Error("Simulated episode update failure.");
        }

        return originalUpdate(key, changes);
      });

    await expect(episodeRepository.markSeasonUnwatched(1, 1)).rejects.toThrow(
      "Simulated episode update failure.",
    );

    updateSpy.mockRestore();

    const firstAfterRollback = await episodeRepository.getById(firstEpisodeId);

    const secondAfterRollback =
      await episodeRepository.getById(secondEpisodeId);

    const watchHistoryEvents = await db.watchHistory.toArray();

    expect(firstAfterRollback?.watched).toBe(true);
    expect(firstAfterRollback?.watchedAt).toEqual(firstBefore?.watchedAt);
    expect(secondAfterRollback?.watched).toBe(true);
    expect(secondAfterRollback?.watchedAt).toEqual(secondBefore?.watchedAt);
    expect(watchHistoryEvents).toHaveLength(3);
  });
});
