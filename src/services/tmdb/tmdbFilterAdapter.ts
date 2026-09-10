import type { TmdbMediaSearchResult } from "./tmdbTypes";
import { mapTmdbGenreIdsToNames } from "./tmdbGenres";

import type { FilterableMedia } from "../../domain/filters/mediaFilterEngine";

/**
 * Adapter boundary between raw TMDB search results and the shared domain
 * filter engine. TMDB results are NOT PersistedMedia — this adapter maps
 * only the fields TMDB genuinely provides and never invents user-owned
 * data (userStatus/favorite are undefined for remote results).
 */
export function toFilterableMedia(
  result: TmdbMediaSearchResult,
): FilterableMedia {
  const isMovie = "title" in result;

  const genres = mapTmdbGenreIdsToNames(
    result.genre_ids,
    isMovie ? "movie" : "tv",
  );

  return {
    title: isMovie ? result.title : result.name,
    mediaType: isMovie ? "movie" : "tv",
    rating: result.vote_average,
    genres: genres.length > 0 ? genres : undefined,
  };
}
