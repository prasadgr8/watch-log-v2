import { describe, expect, it } from "vitest";

import { filterLibrary } from "./libraryFilter";

import type { LibraryFilters } from "./libraryFilter";
import type { Movie, PersistedMedia, TVShow } from "../../../types/media";

function createTvShow(overrides: Partial<TVShow> = {}): PersistedMedia {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: 1,
    mediaType: "tv",
    title: "Test Show",
    userStatus: "watching",
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

const baseFilters: LibraryFilters = {
  search: "",
  mediaType: "all",
  status: "all",
  minRating: null,
};

describe("filterLibrary - rating filtering", () => {
  it("returns all items when minRating is null", () => {
    const media = [
      createMovie({ id: 1, rating: 9 }),
      createMovie({ id: 2, rating: 5 }),
      createMovie({ id: 3, rating: undefined }),
    ];

    const result = filterLibrary(media, { ...baseFilters, minRating: null });

    expect(result.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("filters items below the threshold correctly", () => {
    const media = [
      createMovie({ id: 1, rating: 5 }),
      createMovie({ id: 2, rating: 6 }),
      createMovie({ id: 3, rating: 7 }),
      createMovie({ id: 4, rating: 8 }),
      createMovie({ id: 5, rating: 9 }),
      createMovie({ id: 6, rating: undefined }),
    ];

    const result = filterLibrary(media, { ...baseFilters, minRating: 7 });

    expect(result.map((m) => m.id)).toEqual([3, 4, 5]);
  });

  it("includes items with rating exactly at the boundary", () => {
    const media = [
      createMovie({ id: 1, rating: 6 }),
      createMovie({ id: 2, rating: 7 }),
      createMovie({ id: 3, rating: 8 }),
    ];

    const result = filterLibrary(media, { ...baseFilters, minRating: 7 });

    expect(result.map((m) => m.id)).toEqual([2, 3]);
  });

  it("excludes items with undefined rating when a positive threshold is active", () => {
    const media = [
      createMovie({ id: 1, rating: 7 }),
      createMovie({ id: 2, rating: undefined }),
      createMovie({ id: 3, rating: 8 }),
    ];

    const result = filterLibrary(media, { ...baseFilters, minRating: 7 });

    expect(result.map((m) => m.id)).toEqual([1, 3]);
  });

  it("combines with mediaType filter", () => {
    const media = [
      createTvShow({ id: 1, rating: 8 }),
      createMovie({ id: 2, rating: 5 }),
      createTvShow({ id: 3, rating: 9 }),
      createMovie({ id: 4, rating: 7 }),
    ];

    const result = filterLibrary(media, {
      ...baseFilters,
      mediaType: "tv",
      minRating: 7,
    });

    expect(result.map((m) => m.id)).toEqual([1, 3]);
  });

  it("combines with status filter", () => {
    const media = [
      createMovie({ id: 1, rating: 8, userStatus: "completed" }),
      createMovie({ id: 2, rating: 9, userStatus: "watching" }),
      createMovie({ id: 3, rating: 7, userStatus: "completed" }),
    ];

    const result = filterLibrary(media, {
      ...baseFilters,
      status: "completed",
      minRating: 7,
    });

    expect(result.map((m) => m.id)).toEqual([1, 3]);
  });

  it("combines with search filter", () => {
    const media = [
      createMovie({ id: 1, title: "The Matrix", rating: 8 }),
      createMovie({ id: 2, title: "The Godfather", rating: 9 }),
      createMovie({ id: 3, title: "Inception", rating: 7 }),
    ];

    const result = filterLibrary(media, {
      ...baseFilters,
      search: "the",
      minRating: 8,
    });

    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });
});
