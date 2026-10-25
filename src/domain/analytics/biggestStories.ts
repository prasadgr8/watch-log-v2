/**
 * Pure Biggest Stories analytics derived from recorded watch history, media,
 * and episodes.
 *
 * "Biggest Stories" ranks TV shows by total attributed recorded watch time.
 * The function is read-only: it never mutates inputs and performs no
 * repository, IndexedDB, React, or persistence access.
 */

import type { Episode, Media } from "../../types";
import type { WatchActivityEvent } from "./types";

/** One ranked TV story in the Biggest Stories result. */
export interface BiggestStory {
  readonly mediaId: number;
  readonly mediaType: "tv";
  readonly title: string;
  readonly watchTimeMinutes: number;
  readonly watchCount: number;
  readonly distinctEpisodesWatched: number;
  readonly percentage: number;
}

export type BiggestStoriesItem = BiggestStory;
export type BiggestStoriesEntry = BiggestStory;

export interface BiggestStoriesResult {
  readonly stories: readonly BiggestStory[];
  readonly totalWatchTimeMinutes: number;
  readonly isAvailable: boolean;
}

function isMediaArray(value: unknown): value is readonly Media[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 || (value[0] as { mediaType?: unknown })?.mediaType !== undefined)
  );
}

function isEpisodeArray(value: unknown): value is readonly Episode[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 ||
      (value[0] as { showId?: unknown })?.showId !== undefined ||
      (value[0] as { runtime?: unknown })?.runtime !== undefined)
  );
}

function normalizeInputs(
  second?: readonly Media[] | readonly Episode[],
  third?: readonly Media[] | readonly Episode[],
): { media: readonly Media[]; episodes: readonly Episode[] } {
  let media: readonly Media[] = [];
  let episodes: readonly Episode[] = [];

  const candidates = [second, third].filter((value) => value !== undefined);
  for (const candidate of candidates) {
    if (isMediaArray(candidate) && !isEpisodeArray(candidate)) {
      media = candidate;
    } else if (isEpisodeArray(candidate)) {
      episodes = candidate;
    } else if (isMediaArray(candidate)) {
      if (episodes.length === 0 && media.length > 0) {
        episodes = candidate as readonly Episode[];
      } else {
        media = candidate;
      }
    }
  }

  return { media, episodes };
}

export function buildBiggestStories(
  events: readonly WatchActivityEvent[],
  media?: readonly Media[] | readonly Episode[],
  episodes?: readonly Media[] | readonly Episode[],
): BiggestStoriesResult {
  const normalized = normalizeInputs(
    media as readonly Media[] | readonly Episode[] | undefined,
    episodes as readonly Media[] | readonly Episode[] | undefined,
  );

  const mediaById = new Map<number, Media>();
  for (const item of normalized.media) {
    if (item.id !== undefined) {
      mediaById.set(item.id, item);
    }
  }

  const episodeById = new Map<number, Episode>();
  for (const item of normalized.episodes) {
    if (item.id !== undefined) {
      episodeById.set(item.id, item);
    }
  }

  const byMedia = new Map<
    number,
    {
      title: string;
      watchTimeMinutes: number;
      watchCount: number;
      distinctEpisodes: Set<number>;
    }
  >();

  for (const event of events) {
    if (event.mediaType !== "tv") continue;
    if (event.mediaId === undefined) continue;

    const show = mediaById.get(event.mediaId);
    if (!show || show.mediaType !== "tv") continue;

    const episode =
      event.episodeId !== null && event.episodeId !== undefined
        ? episodeById.get(event.episodeId)
        : undefined;
    if (!episode || episode.runtime === undefined || episode.runtime === null) {
      continue;
    }

    const runtime = episode.runtime;
    const existing = byMedia.get(event.mediaId);
    if (existing) {
      existing.watchTimeMinutes += runtime;
      existing.watchCount += 1;
      if (event.episodeId !== null && event.episodeId !== undefined) {
        existing.distinctEpisodes.add(event.episodeId);
      }
    } else {
      const distinctEpisodes = new Set<number>();
      if (event.episodeId !== null && event.episodeId !== undefined) {
        distinctEpisodes.add(event.episodeId);
      }
      byMedia.set(event.mediaId, {
        title: show.title ?? "",
        watchTimeMinutes: runtime,
        watchCount: 1,
        distinctEpisodes,
      });
    }
  }

  let totalWatchTimeMinutes = 0;
  for (const story of byMedia.values()) {
    totalWatchTimeMinutes += story.watchTimeMinutes;
  }

  const stories = Array.from(byMedia.entries())
    .map(([mediaId, story]) => ({
      mediaId,
      mediaType: "tv" as const,
      title: story.title,
      watchTimeMinutes: story.watchTimeMinutes,
      watchCount: story.watchCount,
      distinctEpisodesWatched: story.distinctEpisodes.size,
      percentage:
        totalWatchTimeMinutes > 0
          ? Math.round((story.watchTimeMinutes / totalWatchTimeMinutes) * 100)
          : 0,
    }))
    .sort((first, second) => {
      if (second.watchTimeMinutes !== first.watchTimeMinutes) {
        return second.watchTimeMinutes - first.watchTimeMinutes;
      }
      if (second.watchCount !== first.watchCount) {
        return second.watchCount - first.watchCount;
      }
      const titleComparison = first.title.localeCompare(second.title);
      if (titleComparison !== 0) {
        return titleComparison;
      }
      return first.mediaId - second.mediaId;
    });

  return {
    stories,
    totalWatchTimeMinutes,
    isAvailable: events.length > 0,
  };
}

export const calculateBiggestStories = buildBiggestStories;
export const getBiggestStories = buildBiggestStories;
export const buildBiggestStoriesAnalytics = buildBiggestStories;