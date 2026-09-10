import { describe, expect, it } from "vitest";

import {
  applyMediaFilters,
  matchesMediaFilters,
} from "./mediaFilterEngine";
import { EMPTY_MEDIA_FILTERS } from "./mediaFilterModel";

import type { FilterableMedia } from "./mediaFilterEngine";
import type { MediaFilterState } from "./mediaFilterModel";

type TestItem = FilterableMedia & { id?: number };

function createItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    title: "Test Movie",
    mediaType: "movie",
    userStatus: "completed",
    ...overrides,
  };
}

const baseFilters: MediaFilterState = { ...EMPTY_MEDIA_FILTERS };

describe("applyMediaFilters - empty/default filters", () => {
  it("returns every item unchanged when all filters are empty", () => {
    const items = [
      createItem({ id: 1, title: "A" }),
      createItem({ id: 2, title: "B", mediaType: "tv", userStatus: "watching" }),
      createItem({ id: 3, title: "C", rating: 3 }),
    ];

    const result = applyMediaFilters(items, EMPTY_MEDIA_FILTERS);

    expect(result.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("returns an empty result for an empty input", () => {
    const result = applyMediaFilters([], EMPTY_MEDIA_FILTERS);

    expect(result).toEqual([]);
  });
});

describe("applyMediaFilters - title search", () => {
  it("performs a case-insensitive substring match against the title", () => {
    const items = [
      createItem({ id: 1, title: "The Matrix" }),
      createItem({ id: 2, title: "the godfather" }),
      createItem({ id: 3, title: "Inception" }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      search: "THE",
    });

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("trims surrounding whitespace from the search term", () => {
    const items = [
      createItem({ id: 1, title: "The Matrix" }),
      createItem({ id: 2, title: "Inception" }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      search: "   matrix   ",
    });

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("treats whitespace-only search as no restriction", () => {
    const items = [createItem({ id: 1, title: "A" }), createItem({ id: 2, title: "B" })];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      search: "   ",
    });

    expect(result).toHaveLength(2);
  });
});

describe("applyMediaFilters - media type", () => {
  const items = [
    createItem({ id: 1, mediaType: "tv" }),
    createItem({ id: 2, mediaType: "movie" }),
  ];

  it("restricts to tv", () => {
    const result = applyMediaFilters(items, { ...baseFilters, mediaType: "tv" });

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("restricts to movie", () => {
    const result = applyMediaFilters(items, { ...baseFilters, mediaType: "movie" });

    expect(result.map((item) => item.id)).toEqual([2]);
  });
});

describe("applyMediaFilters - watch status", () => {
  const statuses = [
    "planned",
    "watching",
    "completed",
    "on-hold",
    "dropped",
  ] as const;

  for (const status of statuses) {
    it(`filters to ${status}`, () => {
      const items = statuses.map((value, index) =>
        createItem({ id: index + 1, userStatus: value }),
      );

      const result = applyMediaFilters(items, { ...baseFilters, status });

      expect(result.map((item) => item.id)).toEqual([
        statuses.indexOf(status) + 1,
      ]);
    });
  }

  it("excludes items with undefined status when a status filter is active", () => {
    const items = [
      createItem({ id: 1, userStatus: "watching" }),
      createItem({ id: 2, userStatus: undefined }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      status: "watching",
    });

    expect(result.map((item) => item.id)).toEqual([1]);
  });
});

describe("applyMediaFilters - rating threshold", () => {
  it("uses an inclusive >= comparison at the boundary", () => {
    const items = [
      createItem({ id: 1, rating: 6 }),
      createItem({ id: 2, rating: 7 }),
      createItem({ id: 3, rating: 8 }),
    ];

    const result = applyMediaFilters(items, { ...baseFilters, minRating: 7 });

    expect(result.map((item) => item.id)).toEqual([2, 3]);
  });

  it("treats undefined rating as 0, excluding it from positive thresholds", () => {
    const items = [
      createItem({ id: 1, rating: undefined }),
      createItem({ id: 2, rating: 7 }),
    ];

    const result = applyMediaFilters(items, { ...baseFilters, minRating: 7 });

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it("applies no restriction when minRating is null", () => {
    const items = [
      createItem({ id: 1, rating: undefined }),
      createItem({ id: 2, rating: 3 }),
      createItem({ id: 3, rating: 10 }),
    ];

    const result = applyMediaFilters(items, { ...baseFilters, minRating: null });

    expect(result).toHaveLength(3);
  });
});

describe("applyMediaFilters - favorites", () => {
  it("returns only items with favorite === true (undefined is not a favorite)", () => {
    const items = [
      createItem({ id: 1, favorite: true }),
      createItem({ id: 2, favorite: false }),
      createItem({ id: 3, favorite: undefined }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      favoritesOnly: true,
    });

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("applies no restriction when favoritesOnly is false", () => {
    const items = [
      createItem({ id: 1, favorite: true }),
      createItem({ id: 2, favorite: false }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      favoritesOnly: false,
    });

    expect(result).toHaveLength(2);
  });
});

describe("applyMediaFilters - genres", () => {
  it("matches a single selected genre", () => {
    const items = [
      createItem({ id: 1, genres: ["Action"] }),
      createItem({ id: 2, genres: ["Drama"] }),
      createItem({ id: 3, genres: undefined }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      selectedGenres: ["Action"],
    });

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("uses OR semantics across multiple selected genres", () => {
    const items = [
      createItem({ id: 1, genres: ["Action"] }),
      createItem({ id: 2, genres: ["Drama"] }),
      createItem({ id: 3, genres: ["Horror"] }),
      createItem({ id: 4, genres: ["Comedy"] }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      selectedGenres: ["Action", "Drama"],
    });

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("applies no genre restriction when the selection is empty", () => {
    const items = [
      createItem({ id: 1, genres: ["Action"] }),
      createItem({ id: 2, genres: undefined }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      selectedGenres: [],
    });

    expect(result).toHaveLength(2);
  });

  it("excludes items with undefined or empty genres when a selection is active", () => {
    const items = [
      createItem({ id: 1, genres: undefined }),
      createItem({ id: 2, genres: [] }),
      createItem({ id: 3, genres: ["Action"] }),
    ];

    const result = applyMediaFilters(items, {
      ...baseFilters,
      selectedGenres: ["Action"],
    });

    expect(result.map((item) => item.id)).toEqual([3]);
  });
});

describe("applyMediaFilters - combined filters", () => {
  it("ANDs active filter categories together", () => {
    const items = [
      createItem({
        id: 1,
        title: "The Matrix",
        genres: ["Action", "Sci-Fi"],
        userStatus: "completed",
        rating: 9,
        favorite: true,
      }),
      createItem({
        id: 2,
        title: "The Matrix Reloaded",
        genres: ["Action"],
        userStatus: "watching",
        rating: 9,
        favorite: true,
      }),
      createItem({
        id: 3,
        title: "The Matrix Revolutions",
        genres: ["Action"],
        userStatus: "completed",
        rating: 7,
        favorite: true,
      }),
      createItem({
        id: 4,
        title: "The Animatrix",
        genres: ["Animation"],
        userStatus: "completed",
        rating: 9,
        favorite: true,
      }),
      createItem({
        id: 5,
        title: "The Matrix Resurrections",
        genres: ["Action"],
        userStatus: "completed",
        rating: 9,
        favorite: false,
      }),
    ];

    const result = applyMediaFilters(items, {
      search: "matrix",
      mediaType: "movie",
      status: "completed",
      minRating: 8.5,
      favoritesOnly: true,
      selectedGenres: ["Action", "Sci-Fi"],
    });

    expect(result.map((item) => item.id)).toEqual([1]);
  });
});

describe("applyMediaFilters - purity", () => {
  it("does not mutate the input collection", () => {
    const items = [
      createItem({ id: 1, rating: 9, favorite: true, genres: ["Action"] }),
      createItem({ id: 2, mediaType: "tv", userStatus: "watching" }),
    ];
    const snapshot = structuredClone(items);

    applyMediaFilters(items, {
      search: "test",
      mediaType: "movie",
      status: "completed",
      minRating: 7,
      favoritesOnly: true,
      selectedGenres: ["Action"],
    });

    expect(items).toEqual(snapshot);
  });

  it("preserves input order among matching items", () => {
    const items = [
      createItem({ id: 3, title: "Gamma", rating: 8 }),
      createItem({ id: 1, title: "Alpha", rating: 8 }),
      createItem({ id: 2, title: "Beta", rating: 2 }),
      createItem({ id: 4, title: "Delta", rating: 9 }),
    ];

    const result = applyMediaFilters(items, { ...baseFilters, minRating: 7 });

    expect(result.map((item) => item.id)).toEqual([3, 1, 4]);
  });

  it("returns a new array, not the input reference", () => {
    const items = [createItem()];

    const result = applyMediaFilters(items, EMPTY_MEDIA_FILTERS);

    expect(result).not.toBe(items);
    expect(result).toEqual(items);
  });
});

describe("matchesMediaFilters - single item predicate", () => {
  it("matches an item satisfying every active filter", () => {
    const item = createItem({
      title: "Dune",
      mediaType: "movie",
      userStatus: "planned",
      rating: 8,
      favorite: true,
      genres: ["Sci-Fi"],
    });

    expect(
      matchesMediaFilters(item, {
        search: "dun",
        mediaType: "movie",
        status: "planned",
        minRating: 8,
        favoritesOnly: true,
        selectedGenres: ["Sci-Fi", "Adventure"],
      }),
    ).toBe(true);
  });

  it("rejects an item failing any single active filter", () => {
    const item = createItem({ rating: 5 });

    expect(matchesMediaFilters(item, { ...baseFilters, minRating: 7 })).toBe(
      false,
    );
  });
});