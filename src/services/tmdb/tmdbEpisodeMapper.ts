import type { Episode } from "../../types";

import type { TmdbTvEpisodeDetails } from "./tmdbTvTypes";

export function mapTmdbEpisodeToEpisode(
  episode: TmdbTvEpisodeDetails,
  showId: number,
  now: Date = new Date(),
): Episode {
  return {
    showId,
    tmdbId: episode.id,
    seasonNumber: episode.season_number,
    episodeNumber: episode.episode_number,
    title: episode.name,
    overview: episode.overview || undefined,
    runtime: episode.runtime ?? undefined,
    stillPath: episode.still_path ?? undefined,
    airDate: episode.air_date ?? undefined,
    voteAverage: episode.vote_average,
    watched: false,
    watchedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
}
