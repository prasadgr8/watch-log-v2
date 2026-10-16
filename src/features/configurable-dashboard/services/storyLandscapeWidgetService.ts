/**
 * Configurable Dashboard — Your Story Landscape widget data (Step 3).
 *
 * Lightweight genre distribution snapshot derived from local WatchLog data.
 * Bubbles represent the genres of titles the user has watched, sized by
 * relative contribution and shown with percentages. "View All" leads to
 * Statistics. This is deliberately not a replacement for the detailed
 * Statistics analytics experience.
 *
 * Reuses the watch-history and media repositories; no new store, no network,
 * no duplicated statistics logic.
 */

import {
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";

import type { PersistedMedia, PersistedWatchHistory } from "../../../types";

export type StoryLandscapeMediaType = "tv" | "movie" | "all";

/** One bubble of the genre distribution. */
export interface StoryLandscapeBubble {
  /** Genre name. */
  genre: string;
  /** Distinct watched titles attributed to this genre. */
  titleCount: number;
  /** Share of watched titles, 0-100, rounded to whole percent. */
  percentage: number;
  /** Relative bubble size, 0-1 (1 = largest bubble). */
  relativeSize: number;
}

export interface StoryLandscapeData {
  /** Bubbles sorted by title count descending, then genre name ascending. */
  bubbles: StoryLandscapeBubble[];
  /** Distinct watched titles across all genres. */
  totalTitles: number;
}

/** Maximum bubbles rendered in the compact widget. */
export const STORY_LANDSCAPE_BUBBLE_LIMIT = 8 as const;

/** Minimum relative bubble size so small genres remain visible. */
export const STORY_LANDSCAPE_MIN_RELATIVE_SIZE = 0.35 as const;

function isPersistedWatchHistory(
  record: { id?: number },
): record is PersistedWatchHistory {
  return record.id !== undefined;
}

/**
 * Returns the genre distribution for watched titles. Only titles with at least
 * one watch event and at least one genre are represented. Titles carrying
 * multiple genres contribute to each of those genres.
 */
export async function getStoryLandscapeData(
  mediaType: StoryLandscapeMediaType = "all",
): Promise<StoryLandscapeData> {
  const [events, allMedia] = await Promise.all([
    watchHistoryRepository.getAll(),
    mediaRepository.getAll(),
  ]);

  const persistedEvents = events.filter(isPersistedWatchHistory);

  // Distinct media ids that have at least one watch event.
  const watchedMediaIds = new Set<number>();
  for (const event of persistedEvents) {
    if (event.mediaId !== undefined) {
      watchedMediaIds.add(event.mediaId);
    }
  }

  const watchedMedia = allMedia.filter(
    (record): record is PersistedMedia =>
      record.id !== undefined && watchedMediaIds.has(record.id),
  );

  let filteredMedia = watchedMedia;
  if (mediaType === "tv") {
    filteredMedia = filteredMedia.filter((record) => record.mediaType === "tv");
  } else if (mediaType === "movie") {
    filteredMedia = filteredMedia.filter(
      (record) => record.mediaType === "movie",
    );
  }

  // Genre -> count of distinct titles carrying that genre.
  const genreCounts = new Map<string, number>();
  for (const record of filteredMedia) {
    const genres = (record as PersistedMedia).genres;
    if (!genres || genres.length === 0) {
      continue;
    }
    for (const genre of genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const totalTitles = filteredMedia.length;
  const totalGenreAttributions = Array.from(genreCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const maxCount =
    genreCounts.size > 0 ? Math.max(...genreCounts.values()) : 0;

  const bubbles: StoryLandscapeBubble[] = Array.from(genreCounts.entries())
    .map(([genre, titleCount]) => {
      const percentage =
        totalGenreAttributions > 0
          ? Math.round((titleCount / totalGenreAttributions) * 100)
          : 0;
      const relativeSize =
        maxCount > 0
          ? Math.max(
              STORY_LANDSCAPE_MIN_RELATIVE_SIZE,
              titleCount / maxCount,
            )
          : 0;

      return { genre, titleCount, percentage, relativeSize };
    })
    .sort((first, second) => {
      if (second.titleCount !== first.titleCount) {
        return second.titleCount - first.titleCount;
      }
      return first.genre.localeCompare(second.genre);
    })
    .slice(0, STORY_LANDSCAPE_BUBBLE_LIMIT);

  return {
    bubbles,
    totalTitles,
  };
}
