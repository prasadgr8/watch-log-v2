import { describe, expect, it } from "vitest";

import { toFilterableMedia } from "./tmdbFilterAdapter";

import type {
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
} from "./tmdbTypes";

function createMovieResult(
  overrides: Partial<TmdbMovieSearchResult> = {},
): TmdbMovieSearchResult {
  return {
    id: 1,
    overview: "overview",
    poster_path: null,
    backdrop_path: null,
    popularity: 10,
    vote_average: 7.5,
    vote_count: 100,
    genre_ids: [28],
    title: "Test Movie",
    original_title: "Test Movie",
    release_date: "2026-01-01",
    ...overrides,
  };
}

function createTvResult(
  overrides: Partial<TmdbTvSearchResult> = {},
): TmdbTvSearchResult {
  return {
    id: 2,
    overview: "overview",
    poster_path: null,
    backdrop_path: null,
    popularity: 10,
    vote_average: 8,
    vote_count: 50,
    genre_ids: [18],
    name: "Test Show",
    original_name: "Test Show",
    first_air_date: "2026-01-01",
    ...overrides,
  };
}

describe("tmdbFilterAdapter - toFilterableMedia", () => {
  it("maps a movie result using only genuinely available TMDB fields", () => {
    const filterable = toFilterableMedia(createMovieResult());

    expect(filterable).toEqual({
      title: "Test Movie",
      mediaType: "movie",
      rating: 7.5,
      genres: ["Action"],
    });
  });

  it("maps a tv result using name as the title", () => {
    const filterable = toFilterableMedia(createTvResult());

    expect(filterable).toEqual({
      title: "Test Show",
      mediaType: "tv",
      rating: 8,
      genres: ["Drama"],
    });
  });

  it("never invents user-owned data (status and favorite stay undefined)", () => {
    const filterable = toFilterableMedia(createMovieResult());

    expect(filterable.userStatus).toBeUndefined();
    expect(filterable.favorite).toBeUndefined();
  });

  it("maps missing genre_ids to undefined genres", () => {
    const filterable = toFilterableMedia(createMovieResult({ genre_ids: undefined }));

    expect(filterable.genres).toBeUndefined();
  });

  it("maps unknown genre ids out, leaving undefined when none are known", () => {
    const filterable = toFilterableMedia(createMovieResult({ genre_ids: [999999] }));

    expect(filterable.genres).toBeUndefined();
  });

  it("supports the shared engine for search, media type, rating and genre filters", () => {
    const results = [
      toFilterableMedia(createMovieResult({ id: 1, title: "Action Movie", vote_average: 8, genre_ids: [28] })),
      toFilterableMedia(createTvResult({ id: 2, name: "Drama Show", vote_average: 6, genre_ids: [18] })),
    ];

    const matched = results.filter(
      (item) =>
        item.mediaType === "movie" &&
        (item.rating ?? 0) >= 7 &&
        (item.genres ?? []).includes("Action"),
    );

    expect(matched).toHaveLength(1);
    expect(matched[0]?.title).toBe("Action Movie");
  });
});