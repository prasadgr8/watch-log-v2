import type {
  Media,
  WatchStatus,
} from "../../types";

import type { TmdbMediaSearchResult } from "./tmdbTypes";

interface MapTmdbMediaOptions {
  userStatus?: WatchStatus;
}

export function mapTmdbResultToMedia(
  result: TmdbMediaSearchResult,
  options: MapTmdbMediaOptions = {},
): Media {
  const now = new Date();
  const userStatus = options.userStatus ?? "planned";

  if ("title" in result) {
    return {
      tmdbId: result.id,
      mediaType: "movie",
      title: result.title,
      overview: result.overview,
      posterPath: result.poster_path ?? undefined,
      backdropPath: result.backdrop_path ?? undefined,
      userStatus,
      releaseDate: result.release_date || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    tmdbId: result.id,
    mediaType: "tv",
    title: result.name,
    overview: result.overview,
    posterPath: result.poster_path ?? undefined,
    backdropPath: result.backdrop_path ?? undefined,
    userStatus,
    firstAirDate: result.first_air_date || undefined,
    createdAt: now,
    updatedAt: now,
  };
}