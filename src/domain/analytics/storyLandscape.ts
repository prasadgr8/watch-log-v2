/**
 * Pure Story Landscape analytics derived from recorded watch history, media,
 * and episodes.
 */

import type { Episode, Media } from "../../types";
import type { WatchActivityEvent } from "./types";

/** One genre's attributed watch time in the Story Landscape. */
export interface StoryLandscapeGenre {
  readonly genre: string;
  readonly watchTimeMinutes: number;
  readonly percentage: number;
}

export type StoryLandscapeItem = StoryLandscapeGenre;
export type StoryLandscapeBubble = StoryLandscapeGenre;
export type StoryLandscapeEntry = StoryLandscapeGenre;

export interface StoryLandscapeResult {
  readonly genres: readonly StoryLandscapeGenre[];
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

export function buildStoryLandscape(
  events: readonly WatchActivityEvent[],
  media?: readonly Media[] | readonly Episode[],
  episodes?: readonly Media[] | readonly Episode[],
): StoryLandscapeResult {
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

  const genreMinutes = new Map<string, number>();
  let totalWatchTimeMinutes = 0;

  for (const event of events) {
    if (event.mediaType !== "tv") continue;
    if (event.mediaId === undefined) continue;

    const show = mediaById.get(event.mediaId);
    if (!show || show.mediaType !== "tv") continue;
    if (!show.genres || show.genres.length === 0) continue;

    const episode =
      event.episodeId !== null && event.episodeId !== undefined
        ? episodeById.get(event.episodeId)
        : undefined;
    if (!episode || episode.runtime === undefined || episode.runtime === null) {
      continue;
    }

    const runtime = episode.runtime;
    totalWatchTimeMinutes += runtime;

    const uniqueGenres = new Set<string>();
    for (const genre of show.genres) {
      if (genre) uniqueGenres.add(genre);
    }
    for (const genre of uniqueGenres) {
      genreMinutes.set(genre, (genreMinutes.get(genre) ?? 0) + runtime);
    }
  }

  const genres = Array.from(genreMinutes.entries())
    .map(([genre, minutes]) => ({
      genre,
      watchTimeMinutes: minutes,
      percentage:
        totalWatchTimeMinutes > 0
          ? Math.round((minutes / totalWatchTimeMinutes) * 100)
          : 0,
    }))
    .sort((first, second) => {
      if (second.watchTimeMinutes !== first.watchTimeMinutes) {
        return second.watchTimeMinutes - first.watchTimeMinutes;
      }
      return first.genre.localeCompare(second.genre);
    });

  return {
    genres,
    totalWatchTimeMinutes,
    isAvailable: events.length > 0,
  };
}

export const calculateStoryLandscape = buildStoryLandscape;
export const getStoryLandscape = buildStoryLandscape;
export const buildStoryLandscapeAnalytics = buildStoryLandscape;
