import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";

import type { PersistedEpisode, PersistedMedia } from "../../../types";

export interface ContinueWatchingItem {
  media: PersistedMedia;
  watchedEpisodeCount: number;
  totalEpisodeCount: number;
  progressPercentage: number;
  nextEpisode: PersistedEpisode;
  lastWatchedAt: Date;
}

function isPersistedMedia(media: { id?: number }): media is PersistedMedia {
  return media.id !== undefined;
}

function isPersistedEpisode(episode: {
  id?: number;
}): episode is PersistedEpisode {
  return episode.id !== undefined;
}

function sortEpisodes(
  firstEpisode: PersistedEpisode,
  secondEpisode: PersistedEpisode,
): number {
  if (firstEpisode.seasonNumber !== secondEpisode.seasonNumber) {
    return firstEpisode.seasonNumber - secondEpisode.seasonNumber;
  }

  return firstEpisode.episodeNumber - secondEpisode.episodeNumber;
}

function getLatestWatchedAt(episodes: PersistedEpisode[]): Date | undefined {
  return episodes.reduce<Date | undefined>((latestWatchedAt, episode) => {
    if (!episode.watched || !episode.watchedAt) {
      return latestWatchedAt;
    }

    if (
      !latestWatchedAt ||
      episode.watchedAt.getTime() > latestWatchedAt.getTime()
    ) {
      return episode.watchedAt;
    }

    return latestWatchedAt;
  }, undefined);
}

export const continueWatchingService = {
  async getItems(): Promise<ContinueWatchingItem[]> {
    const tvShows = await mediaRepository.getByType("tv");

    const continueWatchingItems = await Promise.all(
      tvShows.filter(isPersistedMedia).map(async (media) => {
        const episodes = await episodeRepository.getByShowId(media.id);

        const regularEpisodes = episodes
          .filter(isPersistedEpisode)
          .filter((episode) => episode.seasonNumber > 0)
          .sort(sortEpisodes);

        const watchedEpisodeCount = regularEpisodes.filter(
          (episode) => episode.watched,
        ).length;

        const totalEpisodeCount = regularEpisodes.length;

        const nextEpisode = regularEpisodes.find((episode) => !episode.watched);

        const lastWatchedAt = getLatestWatchedAt(regularEpisodes);

        if (
          totalEpisodeCount === 0 ||
          watchedEpisodeCount === 0 ||
          watchedEpisodeCount === totalEpisodeCount ||
          !nextEpisode ||
          !lastWatchedAt
        ) {
          return undefined;
        }

        return {
          media,
          watchedEpisodeCount,
          totalEpisodeCount,
          progressPercentage: Math.round(
            (watchedEpisodeCount / totalEpisodeCount) * 100,
          ),
          nextEpisode,
          lastWatchedAt,
        };
      }),
    );

    return continueWatchingItems
      .filter((item): item is ContinueWatchingItem => item !== undefined)
      .sort(
        (firstItem, secondItem) =>
          secondItem.lastWatchedAt.getTime() -
          firstItem.lastWatchedAt.getTime(),
      );
  },
};
