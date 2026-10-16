/**
 * Configurable Dashboard — Your Top Stories widget data (Step 3).
 *
 * Ranked top stories based on local watch activity, with a deterministic
 * ordering and a TV Shows / Movies toggle. For each story the widget shows
 * the title, type, watch count, and (for TV) distinct episodes watched.
 * "View All" leads to Library. This is not a detailed Statistics report.
 *
 * Reuses the watch-history, media, and episode repositories. Ranking is
 * deterministic: watch count descending, then title ascending, so the same
 * data always yields the same order.
 */

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";

import type { PersistedEpisode, PersistedMedia, PersistedWatchHistory } from "../../../types";

export type TopStoriesMediaType = "tv" | "movie" | "all";

/** One ranked top story. */
export interface TopStoryItem {
  /** Owning library record id. */
  mediaId: number;
  /** TV or movie. */
  mediaType: "tv" | "movie";
  /** Show or movie title. */
  title: string;
  /** Number of watch events recorded against this title. */
  watchCount: number;
  /** Distinct watched regular episodes (TV only; 0 for movies). */
  distinctEpisodesWatched: number;
}

export interface TopStoriesData {
  /** Ranked items, most watched first. */
  items: TopStoryItem[];
  /** Total distinct titles with at least one watch event. */
  totalTitles: number;
}

export const TOP_STORIES_PREVIEW_LIMIT = 6 as const;

function isPersistedMedia(media: { id?: number }): media is PersistedMedia {
  return media.id !== undefined;
}

function isPersistedEpisode(episode: { id?: number }): episode is PersistedEpisode {
  return episode.id !== undefined;
}

function isPersistedWatchHistory(
  record: { id?: number },
): record is PersistedWatchHistory {
  return record.id !== undefined;
}

/**
 * Returns the ranked top stories for the requested media type, capped at the
 * preview limit. Empty history yields an empty list.
 */
export async function getTopStoriesData(
  mediaType: TopStoriesMediaType = "all",
): Promise<TopStoriesData> {
  const [events, allMedia, allEpisodes] = await Promise.all([
    watchHistoryRepository.getAll(),
    mediaRepository.getAll(),
    episodeRepository.getAll(),
  ]);

  const persistedEvents = events.filter(isPersistedWatchHistory);
  const persistedMedia = allMedia.filter(isPersistedMedia);
  const persistedEpisodes = allEpisodes.filter(isPersistedEpisode);

  const titleByMediaId = new Map<number, string>();
  const typeByMediaId = new Map<number, "tv" | "movie">();
  for (const record of persistedMedia) {
    if (record.id !== undefined) {
      titleByMediaId.set(record.id, record.title);
      typeByMediaId.set(record.id, record.mediaType);
    }
  }

  // Distinct watched regular episodes per show id.
  const watchedEpisodeByShowId = new Map<number, Set<number>>();
  for (const episode of persistedEpisodes) {
    if (episode.watched && episode.seasonNumber > 0 && episode.id !== undefined) {
      const set = watchedEpisodeByShowId.get(episode.showId) ?? new Set<number>();
      set.add(episode.id);
      watchedEpisodeByShowId.set(episode.showId, set);
    }
  }

  // Watch count per media id.
  const watchCountByMediaId = new Map<number, number>();
  for (const event of persistedEvents) {
    if (event.mediaId !== undefined) {
      watchCountByMediaId.set(
        event.mediaId,
        (watchCountByMediaId.get(event.mediaId) ?? 0) + 1,
      );
    }
  }

  const items: TopStoryItem[] = [];
  for (const [mediaId, watchCount] of watchCountByMediaId.entries()) {
    const resolvedType = typeByMediaId.get(mediaId);
    if (resolvedType === undefined) {
      continue;
    }
    if (mediaType !== "all" && resolvedType !== mediaType) {
      continue;
    }

    const title = titleByMediaId.get(mediaId) ?? "Unknown title";
    const distinctEpisodesWatched =
      resolvedType === "tv"
        ? watchedEpisodeByShowId.get(mediaId)?.size ?? 0
        : 0;

    items.push({
      mediaId,
      mediaType: resolvedType,
      title,
      watchCount,
      distinctEpisodesWatched,
    });
  }

  // Deterministic ranking: watch count descending, then title ascending.
  items.sort((first, second) => {
    if (second.watchCount !== first.watchCount) {
      return second.watchCount - first.watchCount;
    }
    return first.title.localeCompare(second.title);
  });

  return {
    items: items.slice(0, TOP_STORIES_PREVIEW_LIMIT),
    totalTitles: watchCountByMediaId.size,
  };
}
