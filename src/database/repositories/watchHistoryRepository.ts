import { db } from "../db";

import type { PersistedWatchHistory, WatchHistory } from "../../types";

export const watchHistoryRepository = {
  async add(watchHistory: WatchHistory): Promise<number> {
    return db.watchHistory.add(watchHistory);
  },

  async getByEpisode(episodeId: number): Promise<PersistedWatchHistory[]> {
    const watchHistoryEvents = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    return watchHistoryEvents.sort(
      (firstEvent, secondEvent) =>
        firstEvent.watchedAt.getTime() - secondEvent.watchedAt.getTime(),
    ) as PersistedWatchHistory[];
  },

  async getLatestByEpisode(
    episodeId: number,
  ): Promise<PersistedWatchHistory | undefined> {
    const watchHistoryEvents =
      await watchHistoryRepository.getByEpisode(episodeId);

    return watchHistoryEvents.at(-1);
  },

  async removeByEpisode(episodeId: number): Promise<void> {
    await db.watchHistory.where("episodeId").equals(episodeId).delete();
  },

  async count(): Promise<number> {
    return db.watchHistory.count();
  },
};
