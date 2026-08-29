import { db } from "../db";

import type { Episode, PersistedEpisode } from "../../types";

export interface BulkMarkWatchedResult {
  newlyWatchedCount: number;
  alreadyWatchedCount: number;
  missingCount: number;
}

export interface BulkMarkUnwatchedResult {
  newlyUnwatchedCount: number;
  alreadyUnwatchedCount: number;
}

interface ManualWatchOutcome {
  newlyWatchedCount: number;
  alreadyWatchedCount: number;
  missingCount: number;
}

/*
 * Applies the markWatched() semantics to a list of episode IDs and reports
 * how many transitioned. Already watched episodes are skipped so their
 * cached watchedAt and history remain untouched; unknown IDs are skipped.
 * Must run inside an active read-write transaction spanning db.episodes and
 * db.watchHistory so episode updates and history events stay atomic.
 */
async function applyManualWatch(
  episodeIds: number[],
  watchedAt: Date,
  operationCreatedAt: Date,
): Promise<ManualWatchOutcome> {
  let newlyWatchedCount = 0;
  let alreadyWatchedCount = 0;
  let missingCount = 0;

  for (const episodeId of episodeIds) {
    const episode = await db.episodes.get(episodeId);

    if (!episode) {
      missingCount++;

      continue;
    }

    if (episode.watched) {
      alreadyWatchedCount++;

      continue;
    }

    await db.watchHistory.add({
      episodeId,
      watchedAt,
      source: "manual",
      createdAt: operationCreatedAt,
    });

    await db.episodes.update(episodeId, {
      watched: true,
      watchedAt,
      updatedAt: operationCreatedAt,
    });

    newlyWatchedCount++;
  }

  return { newlyWatchedCount, alreadyWatchedCount, missingCount };
}

export const episodeRepository = {
  async add(episode: Episode): Promise<number> {
    const id = await db.episodes.add(episode);

    if (id === undefined) {
      throw new Error("Failed to generate episode ID.");
    }

    return id;
  },

  async getById(id: number): Promise<Episode | undefined> {
    return db.episodes.get(id);
  },

  async getByShowId(showId: number): Promise<Episode[]> {
    return db.episodes.where("showId").equals(showId).sortBy("episodeNumber");
  },

  async getByShowSeason(
    showId: number,
    seasonNumber: number,
  ): Promise<Episode[]> {
    const episodes = await db.episodes
      .where("showId")
      .equals(showId)
      .filter((episode) => episode.seasonNumber === seasonNumber)
      .toArray();

    return episodes.sort(
      (firstEpisode, secondEpisode) =>
        firstEpisode.episodeNumber - secondEpisode.episodeNumber,
    );
  },

  async getByShowSeasonAndEpisode(
    showId: number,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<Episode | undefined> {
    return db.episodes
      .where("[showId+seasonNumber+episodeNumber]")
      .equals([showId, seasonNumber, episodeNumber])
      .first();
  },

  async synchronizeSeason(
    showId: number,
    seasonNumber: number,
    incomingEpisodes: Episode[],
  ): Promise<PersistedEpisode[]> {
    return db.transaction("rw", db.episodes, async () => {
      const existingEpisodes = await db.episodes
        .where("showId")
        .equals(showId)
        .filter((episode) => episode.seasonNumber === seasonNumber)
        .toArray();

      const existingByEpisodeNumber = new Map(
        existingEpisodes.map((episode) => [episode.episodeNumber, episode]),
      );

      const synchronizedEpisodes = incomingEpisodes.map((episode) => {
        const existingEpisode = existingByEpisodeNumber.get(
          episode.episodeNumber,
        );

        if (!existingEpisode) {
          return episode;
        }

        return {
          ...episode,
          id: existingEpisode.id,
          watched: existingEpisode.watched,
          watchedAt: existingEpisode.watchedAt,
          createdAt: existingEpisode.createdAt,
          updatedAt: new Date(),
        };
      });

      await db.episodes.bulkPut(synchronizedEpisodes);

      return db.episodes
        .where("showId")
        .equals(showId)
        .filter((episode) => episode.seasonNumber === seasonNumber)
        .toArray() as Promise<PersistedEpisode[]>;
    });
  },

  async markWatched(id: number): Promise<void> {
    const now = new Date();

    await db.transaction("rw", db.episodes, db.watchHistory, async () => {
      const episode = await db.episodes.get(id);

      if (!episode) {
        throw new Error(`Episode ${id} was not found.`);
      }

      await db.watchHistory.add({
        episodeId: id,
        watchedAt: now,
        source: "manual",
        createdAt: now,
      });

      await db.episodes.update(id, {
        watched: true,
        watchedAt: now,
        updatedAt: now,
      });
    });
  },
  async markWatchedFromImport(id: number, watchedAt: Date): Promise<boolean> {
    const now = new Date();

    return db.transaction("rw", db.episodes, db.watchHistory, async () => {
      const episode = await db.episodes.get(id);

      if (!episode) {
        throw new Error(`Episode ${id} was not found.`);
      }

      if (episode.watched) {
        return false;
      }

      await db.watchHistory.add({
        episodeId: id,
        watchedAt,
        source: "import",
        createdAt: now,
      });

      await db.episodes.update(id, {
        watched: true,
        watchedAt,
        updatedAt: now,
      });
      return true;
    });
  },
  async markUnwatched(id: number): Promise<void> {
    const now = new Date();

    await db.transaction("rw", db.episodes, db.watchHistory, async () => {
      const episode = await db.episodes.get(id);

      if (!episode) {
        throw new Error(`Episode ${id} was not found.`);
      }

      await db.watchHistory.where("episodeId").equals(id).delete();

      await db.episodes.update(id, {
        watched: false,
        watchedAt: undefined,
        updatedAt: now,
      });
    });
  },

  async markEpisodesWatched(
    episodeIds: number[],
    watchedAt?: Date,
  ): Promise<BulkMarkWatchedResult> {
    const now = new Date();
    const effectiveWatchedAt = watchedAt ?? now;

    let outcome: BulkMarkWatchedResult = {
      newlyWatchedCount: 0,
      alreadyWatchedCount: 0,
      missingCount: 0,
    };

    await db.transaction("rw", db.episodes, db.watchHistory, async () => {
      outcome = await applyManualWatch(episodeIds, effectiveWatchedAt, now);
    });

    return outcome;
  },

  async markSeasonWatched(
    showId: number,
    seasonNumber: number,
    watchedAt?: Date,
  ): Promise<BulkMarkWatchedResult> {
    const now = new Date();
    const effectiveWatchedAt = watchedAt ?? now;

    let outcome: BulkMarkWatchedResult = {
      newlyWatchedCount: 0,
      alreadyWatchedCount: 0,
      missingCount: 0,
    };

    await db.transaction("rw", db.episodes, db.watchHistory, async () => {
      const seasonEpisodes = await db.episodes
        .where("showId")
        .equals(showId)
        .filter((episode) => episode.seasonNumber === seasonNumber)
        .toArray();

      const seasonEpisodeIds: number[] = [];

      for (const episode of seasonEpisodes) {
        if (episode.id !== undefined) {
          seasonEpisodeIds.push(episode.id);
        }
      }

      outcome = await applyManualWatch(
        seasonEpisodeIds,
        effectiveWatchedAt,
        now,
      );
    });

    return outcome;
  },

  async markSeasonUnwatched(
    showId: number,
    seasonNumber: number,
  ): Promise<BulkMarkUnwatchedResult> {
    const now = new Date();

    let newlyUnwatchedCount = 0;
    let alreadyUnwatchedCount = 0;

    await db.transaction("rw", db.episodes, db.watchHistory, async () => {
      const seasonEpisodes = await db.episodes
        .where("showId")
        .equals(showId)
        .filter((episode) => episode.seasonNumber === seasonNumber)
        .toArray();

      const watchedEpisodeIds: number[] = [];

      for (const episode of seasonEpisodes) {
        if (episode.id === undefined) {
          continue;
        }

        if (!episode.watched) {
          alreadyUnwatchedCount++;

          continue;
        }

        watchedEpisodeIds.push(episode.id);
      }

      if (watchedEpisodeIds.length > 0) {
        await db.watchHistory
          .where("episodeId")
          .anyOf(watchedEpisodeIds)
          .delete();
      }

      for (const episodeId of watchedEpisodeIds) {
        await db.episodes.update(episodeId, {
          watched: false,
          watchedAt: undefined,
          updatedAt: now,
        });

        newlyUnwatchedCount++;
      }
    });

    return { newlyUnwatchedCount, alreadyUnwatchedCount };
  },

  async remove(id: number): Promise<void> {
    await db.episodes.delete(id);
  },

  async getAll(): Promise<Episode[]> {
    return db.episodes.toArray();
  },

  async count(): Promise<number> {
    return db.episodes.count();
  },

  async countWatched(): Promise<number> {
    return db.episodes.filter((episode) => episode.watched).count();
  },

  async getWatchedRuntimeMinutes(): Promise<number> {
    const watchedEpisodes = await db.episodes
      .filter((episode) => episode.watched)
      .toArray();

    return watchedEpisodes.reduce(
      (totalMinutes, episode) => totalMinutes + (episode.runtime ?? 0),
      0,
    );
  },
};
