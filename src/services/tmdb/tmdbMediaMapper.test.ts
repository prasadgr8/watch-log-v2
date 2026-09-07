import { describe, expect, it } from "vitest";

import {
  TMDB_GENRES_LIST,
  TMDB_MOVIE_GENRES,
  TMDB_TV_GENRES,
} from "./tmdbGenres";
import { mapTmdbResultToMedia } from "./tmdbMediaMapper";

import type { TmdbMediaSearchResult } from "./tmdbTypes";

function createMovieResult(
  overrides: Partial<TmdbMediaSearchResult> = {},
): TmdbMediaSearchResult {
  return {
    id: 157336,
    overview: "A thief who steals corporate secrets...",
    poster_path: "/9gk7adHYeDvHReCflFhvEYoZx.jpg",
    backdrop_path: "/b6JrsZCZ2ZbLXCBWgVQaFZQam.jpg",
    popularity: 94.3,
    vote_average: 8.4,
    vote_count: 34579,
    media_type: "movie",
    title: "Inception",
    original_title: "Inception",
    release_date: "2010-07-15",
    ...overrides,
  } as TmdbMediaSearchResult;
}

function createTvShowResult(
  overrides: Partial<TmdbMediaSearchResult> = {},
): TmdbMediaSearchResult {
  return {
    id: 1396,
    overview: "A chemistry teacher diagnosed with inoperable lung cancer...",
    poster_path: "/ggFHVNu6EIVBYkh4c5sDaqBJz.jpg",
    backdrop_path: "/tsRy63Muqcu8DQrveOc8mQe1F.jpg",
    popularity: 318.6,
    vote_average: 8.9,
    vote_count: 14593,
    media_type: "tv",
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    first_air_date: "2008-01-20",
    ...overrides,
  } as TmdbMediaSearchResult;
}

describe("mapTmdbResultToMedia - genre mapping", () => {
  it("maps known movie genre IDs to names", () => {
    const media = mapTmdbResultToMedia(
      createMovieResult({ genre_ids: [28, 878, 10770] }),
    );

    expect(media.mediaType).toBe("movie");
    expect(media.genres).toEqual(["Action", "Science Fiction", "TV Movie"]);
  });

  it("maps known TV genre IDs to names", () => {
    const media = mapTmdbResultToMedia(
      createTvShowResult({ genre_ids: [10759, 18, 10762] }),
    );

    expect(media.mediaType).toBe("tv");
    expect(media.genres).toEqual([
      "Action & Adventure",
      "Drama",
      "Kids",
    ]);
  });

  it("maps shared genre IDs to the same names for movies and TV", () => {
    const movie = mapTmdbResultToMedia(
      createMovieResult({ genre_ids: [18, 10751, 37] }),
    );
    const tv = mapTmdbResultToMedia(
      createTvShowResult({ genre_ids: [18, 10751, 37] }),
    );

    expect(movie.genres).toEqual(["Drama", "Family", "Western"]);
    expect(tv.genres).toEqual(["Drama", "Family", "Western"]);
  });

  it("maps TV-specific genre IDs only for TV results", () => {
    const tv = mapTmdbResultToMedia(
      createTvShowResult({ genre_ids: [10762, 10765, 10768] }),
    );

    expect(tv.genres).toEqual([
      "Kids",
      "Sci-Fi & Fantasy",
      "War & Politics",
    ]);

    // TV-specific IDs are unknown to the movie mapping and are ignored.
    const movie = mapTmdbResultToMedia(
      createMovieResult({ genre_ids: [10762, 10765, 10768] }),
    );

    expect(movie.genres).toBeUndefined();
  });

  it("drops unknown genre IDs while keeping known ones", () => {
    const media = mapTmdbResultToMedia(
      createMovieResult({ genre_ids: [28, 999999, 878, -1] }),
    );

    expect(media.genres).toEqual(["Action", "Science Fiction"]);
  });

  it("leaves genres undefined when genre_ids is missing", () => {
    const media = mapTmdbResultToMedia(createMovieResult());

    expect(media.genres).toBeUndefined();
  });

  it("leaves genres undefined when genre_ids is empty", () => {
    const media = mapTmdbResultToMedia(createTvShowResult({ genre_ids: [] }));

    expect(media.genres).toBeUndefined();
  });

  it("keeps Movie and TV mappings separate without accidental collisions", () => {
    // 878 exists only in the movie mapping and 10765 only in the TV mapping.
    expect(TMDB_MOVIE_GENRES[878]).toBe("Science Fiction");
    expect(TMDB_TV_GENRES[878]).toBeUndefined();
    expect(TMDB_TV_GENRES[10765]).toBe("Sci-Fi & Fantasy");
    expect(TMDB_MOVIE_GENRES[10765]).toBeUndefined();

    // Shared IDs resolve to the same name in both mappings.
    expect(TMDB_MOVIE_GENRES[10751]).toBe("Family");
    expect(TMDB_TV_GENRES[10751]).toBe("Family");

    // The UI list carries names from both mappings, including the distinct
    // movie/TV genre names, proving neither mapping was flattened away.
    expect(TMDB_GENRES_LIST).toContain("Science Fiction");
    expect(TMDB_GENRES_LIST).toContain("Sci-Fi & Fantasy");
    expect(TMDB_GENRES_LIST).toContain("Action & Adventure");
  });
});
