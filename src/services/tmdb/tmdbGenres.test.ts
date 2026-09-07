import { describe, expect, it } from "vitest";

import { mapTmdbGenreIdsToNames } from "./tmdbGenres";

describe("mapTmdbGenreIdsToNames", () => {
  it("maps known movie genre IDs through the movie mapping", () => {
    expect(mapTmdbGenreIdsToNames([28, 878, 10770], "movie")).toEqual([
      "Action",
      "Science Fiction",
      "TV Movie",
    ]);
  });

  it("maps known TV genre IDs through the TV mapping", () => {
    expect(mapTmdbGenreIdsToNames([10759, 18, 10762], "tv")).toEqual([
      "Action & Adventure",
      "Drama",
      "Kids",
    ]);
  });

  it("maps shared genre IDs to the same names for both media types", () => {
    expect(mapTmdbGenreIdsToNames([18, 10751, 37], "movie")).toEqual([
      "Drama",
      "Family",
      "Western",
    ]);

    expect(mapTmdbGenreIdsToNames([18, 10751, 37], "tv")).toEqual([
      "Drama",
      "Family",
      "Western",
    ]);
  });

  it("drops unknown genre IDs", () => {
    expect(mapTmdbGenreIdsToNames([28, 999999, -1], "movie")).toEqual([
      "Action",
    ]);
  });

  it("returns an empty array for missing or empty genre IDs", () => {
    expect(mapTmdbGenreIdsToNames(undefined, "movie")).toEqual([]);
    expect(mapTmdbGenreIdsToNames([], "tv")).toEqual([]);
  });

  it("never resolves TV-specific IDs against the movie mapping", () => {
    expect(mapTmdbGenreIdsToNames([10765], "movie")).toEqual([]);
    expect(mapTmdbGenreIdsToNames([10765], "tv")).toEqual([
      "Sci-Fi & Fantasy",
    ]);
  });
});
