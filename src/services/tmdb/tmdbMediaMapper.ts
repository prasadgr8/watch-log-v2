import type {
  Media,
  WatchStatus,
} from "../../types";

import type { TmdbMediaSearchResult } from "./tmdbTypes";
import { TMDB_MOVIE_GENRES, TMDB_TV_GENRES } from "./tmdbGenres";

interface MapTmdbMediaOptions {
  userStatus?: WatchStatus;
  favorite?: boolean;
}

function mapGenreIdsToNames(
  genreIds: number[] | undefined,
  genreMap: Record<number, string>,
): string[] {
  if (!genreIds || genreIds.length === 0) {
    return [];
  }
  return genreIds
    .map((id) => genreMap[id])
    .filter((name): name is string => name !== undefined);
}

export function mapTmdbResultToMedia(
  result: TmdbMediaSearchResult,
  options: MapTmdbMediaOptions = {},
): Media {
  const now = new Date();
  const userStatus = options.userStatus ?? "planned";

  if ("title" in result) {
    const genres = mapGenreIdsToNames(result.genre_ids, TMDB_MOVIE_GENRES);

    return {
      tmdbId: result.id,
      mediaType: "movie",
      title: result.title,
      overview: result.overview,
      posterPath: result.poster_path ?? undefined,
      backdropPath: result.backdrop_path ?? undefined,
      userStatus,
      favorite: options.favorite,
      releaseDate: result.release_date || undefined,
      genres: genres.length > 0 ? genres : undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  const genres = mapGenreIdsToNames(result.genre_ids, TMDB_TV_GENRES);

  return {
    tmdbId: result.id,
    mediaType: "tv",
    title: result.name,
    overview: result.overview,
    posterPath: result.poster_path ?? undefined,
    backdropPath: result.backdrop_path ?? undefined,
    userStatus,
    favorite: options.favorite,
    firstAirDate: result.first_air_date || undefined,
    genres: genres.length > 0 ? genres : undefined,
    createdAt: now,
    updatedAt: now,
  };
}
