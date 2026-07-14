import { db } from "../db";

import type { Episode, PersistedEpisode } from "../../types";

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

  async markWatched(id: number): Promise<number> {
    return db.episodes.update(id, {
      watched: true,
      watchedAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async markUnwatched(id: number): Promise<number> {
    return db.episodes.update(id, {
      watched: false,
      watchedAt: undefined,
      updatedAt: new Date(),
    });
  },

  async remove(id: number): Promise<void> {
    await db.episodes.delete(id);
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
