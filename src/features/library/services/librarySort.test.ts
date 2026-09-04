import { describe, expect, it } from "vitest";

import { sortLibrary } from "./librarySort";

import type { Movie, PersistedMedia, TVShow } from "../../../types/media";

function createTvShow(overrides: Partial<TVShow> = {}): PersistedMedia {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: 1,
    mediaType: "tv",
    title: "Test Show",
    userStatus: "completed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PersistedMedia;
}

function createMovie(overrides: Partial<Movie> = {}): PersistedMedia {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: 1,
    mediaType: "movie",
    title: "Test Movie",
    userStatus: "completed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PersistedMedia;
}

describe("sortLibrary - year sorting", () => {
  it("sorts TV shows ascending by firstAirDate year (oldest first)", () => {
    const media = [
      createTvShow({ id: 1, title: "Show C", firstAirDate: "2005-03-14" }),
      createTvShow({ id: 2, title: "Show A", firstAirDate: "2020-09-20" }),
      createTvShow({ id: 3, title: "Show B", firstAirDate: "2010-09-20" }),
    ];

    const sorted = sortLibrary(media, "year-asc");

    expect(sorted.map((m) => m.id)).toEqual([1, 3, 2]);
  });

  it("sorts movies descending by releaseDate year (newest first)", () => {
    const media = [
      createMovie({ id: 1, title: "Movie C", releaseDate: "2005-03-14" }),
      createMovie({ id: 2, title: "Movie A", releaseDate: "2020-09-20" }),
      createMovie({ id: 3, title: "Movie B", releaseDate: "2010-09-20" }),
    ];

    const sorted = sortLibrary(media, "year-desc");

    expect(sorted.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("places items with missing year at the end in ascending order", () => {
    const media = [
      createTvShow({ id: 1, title: "Show No Date" }),
      createTvShow({ id: 2, title: "Show 2020", firstAirDate: "2020-09-20" }),
      createTvShow({ id: 3, title: "Show No Date 2" }),
      createTvShow({ id: 4, title: "Show 2005", firstAirDate: "2005-03-14" }),
    ];

    const sorted = sortLibrary(media, "year-asc");

    expect(sorted.map((m) => m.id)).toEqual([4, 2, 1, 3]);
  });

  it("places items with missing year at the end in descending order", () => {
    const media = [
      createTvShow({ id: 1, title: "Show No Date" }),
      createTvShow({ id: 2, title: "Show 2020", firstAirDate: "2020-09-20" }),
      createTvShow({ id: 3, title: "Show No Date 2" }),
      createTvShow({ id: 4, title: "Show 2005", firstAirDate: "2005-03-14" }),
    ];

    const sorted = sortLibrary(media, "year-desc");

    expect(sorted.map((m) => m.id)).toEqual([2, 4, 1, 3]);
  });

  it("derives year from firstAirDate for TV shows", () => {
    const media = [
      createTvShow({ id: 1, title: "Show 2010", firstAirDate: "2010-09-20" }),
      createMovie({ id: 2, title: "Movie 2005", releaseDate: "2005-03-14" }),
    ];

    const sorted = sortLibrary(media, "year-asc");

    expect(sorted.map((m) => m.id)).toEqual([2, 1]);
  });

  it("derives year from releaseDate for movies", () => {
    const media = [
      createMovie({ id: 1, title: "Movie 2010", releaseDate: "2010-09-20" }),
      createMovie({ id: 2, title: "Movie 2005", releaseDate: "2005-03-14" }),
    ];

    const sorted = sortLibrary(media, "year-desc");

    expect(sorted.map((m) => m.id)).toEqual([1, 2]);
  });

  it("preserves original order for items with the same year (stable sort)", () => {
    const media = [
      createTvShow({ id: 1, title: "Show A", firstAirDate: "2010-01-01" }),
      createTvShow({ id: 2, title: "Show B", firstAirDate: "2010-05-15" }),
      createTvShow({ id: 3, title: "Show C", firstAirDate: "2010-09-20" }),
    ];

    const sorted = sortLibrary(media, "year-asc");

    expect(sorted.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("does not throw on malformed or empty date values", () => {
    const media = [
      createTvShow({ id: 1, title: "Bad Date", firstAirDate: "abcd" }),
      createTvShow({ id: 2, title: "Good Date", firstAirDate: "2010-01-01" }),
      createMovie({ id: 3, title: "Empty String", releaseDate: "" }),
      createMovie({ id: 4, title: "Null Date", releaseDate: null as unknown as string }),
      createTvShow({ id: 5, title: "Undefined", firstAirDate: undefined }),
    ];

    expect(() => sortLibrary(media, "year-asc")).not.toThrow();
    expect(() => sortLibrary(media, "year-desc")).not.toThrow();

    const sorted = sortLibrary(media, "year-asc");
    expect(sorted.length).toBe(5);
    // Item with valid year should be first
    expect(sorted[0].id).toBe(2);
  });
});
