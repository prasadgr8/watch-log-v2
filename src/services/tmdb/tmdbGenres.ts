import type { MediaType } from "../../types/media";

/**
 * TMDB Movie genre ID → Name mapping.
 * Source: https://developer.themoviedb.org/reference/genre-movie-list
 */
export const TMDB_MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

/**
 * TMDB TV genre ID → Name mapping.
 * Source: https://developer.themoviedb.org/reference/genre-tv-list
 *
 * TV exposes its own genre IDs. Some IDs and names are shared with the
 * movie list (e.g. 16/Animation, 18/Drama, 37/Western, 10751/Family),
 * while others exist only on TV (e.g. 10759/Action & Adventure,
 * 10762/Kids). Movie and TV IDs are resolved against their own mapping so
 * an ID never bleeds across media-type boundaries.
 */
export const TMDB_TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

/**
 * Sorted, unique list of all Movie + TV genre names for UI select options.
 */
export const TMDB_GENRES_LIST: string[] = Array.from(
  new Set([
    ...Object.values(TMDB_MOVIE_GENRES),
    ...Object.values(TMDB_TV_GENRES),
  ]),
).sort();

/**
 * Converts TMDB genre IDs to the WatchLog genre names used by the genre
 * filter, resolving against the mapping for the given media type. Unknown
 * IDs are ignored, matching the TMDB search mapping behavior.
 */
export function mapTmdbGenreIdsToNames(
  genreIds: number[] | undefined,
  mediaType: MediaType,
): string[] {
  if (!genreIds || genreIds.length === 0) {
    return [];
  }

  const genreMap = mediaType === "movie" ? TMDB_MOVIE_GENRES : TMDB_TV_GENRES;

  return genreIds
    .map((id) => genreMap[id])
    .filter((name): name is string => name !== undefined);
}
