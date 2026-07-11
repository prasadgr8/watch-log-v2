import { db } from "../db";

import type { Episode } from "../../types";

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
    return db.episodes.where("showId").equals(showId).toArray();
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
};