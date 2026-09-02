import { episodeRepository, mediaRepository } from "../../../database/repositories";

import {
  mapTmdbEpisodeToEpisode,
  tmdbTvService,
  type TmdbTvDetails,
} from "../../../services/tmdb";

import type { Episode, Media, PersistedMedia } from "../../../types";

export interface TvShowDetailsResult {
  media: PersistedMedia;
  tvDetails: TmdbTvDetails | null;
  fromLocal: boolean;
  seasonSummaries: TvShowLocalSeason[];
}

export interface SeasonEpisodesResult {
  episodes: Episode[];
  fromLocal: boolean;
  needsOnlineNotice: boolean;
}

export interface TvShowLocalSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  watchedEpisodeCount: number;
}

export interface LoadTvShowDetailsOptions {
  canUseNetwork?: () => boolean;
  onLocalData?: (result: TvShowDetailsResult) => void;
}

export interface LoadSeasonEpisodesOptions {
  canUseNetwork?: () => boolean;
  onLocalData?: (result: SeasonEpisodesResult) => void;
}

function getDefaultNetworkAvailability(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function assertValidMedia(
  media: Media | undefined,
): asserts media is PersistedMedia {
  if (!media || media.id === undefined) {
    throw new Error("TV show was not found in the Library.");
  }

  if (media.mediaType !== "tv") {
    throw new Error("The selected Library item is not a TV show.");
  }
}

export function deriveSeasonSummaries(
  episodes: Episode[],
): TvShowLocalSeason[] {
  const bySeason = new Map<number, Episode[]>();

  for (const episode of episodes) {
    const seasonEpisodes = bySeason.get(episode.seasonNumber) ?? [];

    seasonEpisodes.push(episode);

    bySeason.set(episode.seasonNumber, seasonEpisodes);
  }

  const summaries: TvShowLocalSeason[] = [];

  for (const [seasonNumber, seasonEpisodes] of bySeason) {
    const watchedEpisodeCount = seasonEpisodes.filter(
      (episode) => episode.watched,
    ).length;

    summaries.push({
      seasonNumber,
      name: seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`,
      episodeCount: seasonEpisodes.length,
      watchedEpisodeCount,
    });
  }

  return summaries.sort(
    (firstSeason, secondSeason) =>
      firstSeason.seasonNumber - secondSeason.seasonNumber,
  );
}

export async function loadTvShowDetails(
  mediaId: number,
  options: LoadTvShowDetailsOptions = {},
): Promise<TvShowDetailsResult> {
  const canUseNetwork = options.canUseNetwork ?? getDefaultNetworkAvailability;

  const storedMedia = await mediaRepository.getById(mediaId);

  assertValidMedia(storedMedia);

  const localEpisodes = await episodeRepository.getByShowId(mediaId);

  const seasonSummaries = deriveSeasonSummaries(localEpisodes);

  const localResult: TvShowDetailsResult = {
    media: storedMedia,
    tvDetails: null,
    fromLocal: true,
    seasonSummaries,
  };

  if (options.onLocalData) {
    options.onLocalData(localResult);
  }

  if (!canUseNetwork() || storedMedia.tmdbId === undefined) {
    return localResult;
  }

  try {
    const tvDetails = await tmdbTvService.getTvDetails(storedMedia.tmdbId);

    return {
      media: storedMedia,
      tvDetails,
      fromLocal: false,
      seasonSummaries,
    };
  } catch (loadError) {
    console.error("Failed to refresh TV show details from TMDB:", loadError);

    return localResult;
  }
}

/*
 * Fetches the season from TMDB and persists it through synchronizeSeason(),
 * which preserves locally owned watch state (watched, watchedAt, createdAt).
 * Returns the persisted episodes sorted by episode number.
 */
async function synchronizeSeasonWithTmdb(
  tmdbId: number,
  mediaId: number,
  seasonNumber: number,
): Promise<Episode[]> {
  const seasonDetails = await tmdbTvService.getSeasonDetails(
    tmdbId,
    seasonNumber,
  );

  const now = new Date();

  const mappedEpisodes = seasonDetails.episodes.map((episode) =>
    mapTmdbEpisodeToEpisode(episode, mediaId, now),
  );

  const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
    mediaId,
    seasonNumber,
    mappedEpisodes,
  );

  return [...synchronizedEpisodes].sort(
    (firstEpisode, secondEpisode) =>
      firstEpisode.episodeNumber - secondEpisode.episodeNumber,
  );
}

export async function loadSeasonEpisodes(
  mediaId: number,
  seasonNumber: number,
  options: LoadSeasonEpisodesOptions = {},
): Promise<SeasonEpisodesResult> {
  const canUseNetwork = options.canUseNetwork ?? getDefaultNetworkAvailability;

  const storedMedia = await mediaRepository.getById(mediaId);

  assertValidMedia(storedMedia);

  const localEpisodes = await episodeRepository.getByShowSeason(
    mediaId,
    seasonNumber,
  );

  const localResult: SeasonEpisodesResult = {
    episodes: localEpisodes,
    fromLocal: true,
    needsOnlineNotice: false,
  };

  if (localEpisodes.length > 0) {
    // Serve saved episodes immediately so offline use is never blocked.
    if (options.onLocalData) {
      options.onLocalData(localResult);
    }

    if (!canUseNetwork() || storedMedia.tmdbId === undefined) {
      return localResult;
    }

    // Refresh from TMDB in the background; on failure keep the local
    // episodes that were already returned instead of surfacing an error.
    try {
      return {
        episodes: await synchronizeSeasonWithTmdb(
          storedMedia.tmdbId,
          mediaId,
          seasonNumber,
        ),
        fromLocal: false,
        needsOnlineNotice: false,
      };
    } catch (refreshError) {
      console.error("Failed to refresh season details:", refreshError);

      return localResult;
    }
  }

  if (!canUseNetwork() || storedMedia.tmdbId === undefined) {
    return {
      episodes: [],
      fromLocal: false,
      needsOnlineNotice: true,
    };
  }

  try {
    return {
      episodes: await synchronizeSeasonWithTmdb(
        storedMedia.tmdbId,
        mediaId,
        seasonNumber,
      ),
      fromLocal: false,
      needsOnlineNotice: false,
    };
  } catch (loadSeasonError) {
    console.error("Failed to load season details:", loadSeasonError);

    return {
      episodes: [],
      fromLocal: false,
      needsOnlineNotice: true,
    };
  }
}