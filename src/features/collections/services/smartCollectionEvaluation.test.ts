import { describe, expect, it } from "vitest";

import { EMPTY_MEDIA_FILTERS } from "../../../domain/filters/mediaFilterModel";
import { applyMediaFilters } from "../../../domain/filters/mediaFilterEngine";

import type { MediaFilterState } from "../../../domain/filters/mediaFilterModel";
import type {
  PersistedMedia,
  PersistedSmartCollectionDefinition,
} from "../../../types";

import { evaluateSmartCollection } from "./smartCollectionEvaluation";

function createMedia(overrides: Partial<PersistedMedia> = {}): PersistedMedia {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    id: 1,
    tmdbId: 100,
    mediaType: "movie",
    title: "Test Movie",
    userStatus: "completed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createDefinition(
  filters: MediaFilterState,
): PersistedSmartCollectionDefinition {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    id: 1,
    collectionId: 1,
    filters,
    createdAt: now,
    updatedAt: now,
  };
}

function baseFilters(): MediaFilterState {
  return { ...EMPTY_MEDIA_FILTERS };
}

describe("evaluateSmartCollection - basic", () => {
  it("returns all media when filters are empty", () => {
    const media = [
      createMedia({ id: 1, title: "Alpha" }),
      createMedia({ id: 2, title: "Beta" }),
      createMedia({ id: 3, title: "Gamma" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition(EMPTY_MEDIA_FILTERS),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("returns [] when the library is empty", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...EMPTY_MEDIA_FILTERS, search: "matrix" }),
      [],
    );

    expect(result).toEqual([]);
  });

  it("returns [] when no media matches", () => {
    const media = [
      createMedia({ id: 1, title: "Alpha" }),
      createMedia({ id: 2, title: "Beta" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...EMPTY_MEDIA_FILTERS, search: "matrix" }),
      media,
    );

    expect(result).toEqual([]);
  });

  it("can match all media", () => {
    const media = [
      createMedia({ id: 1, title: "Matrix" }),
      createMedia({ id: 2, title: "Matrix Reloaded" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...EMPTY_MEDIA_FILTERS, search: "matrix" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("preserves input order", () => {
    const media = [
      createMedia({ id: 3, title: "Gamma Movie", rating: 8 }),
      createMedia({ id: 1, title: "Alpha Movie", rating: 8 }),
      createMedia({ id: 2, title: "Beta Movie", rating: 2 }),
      createMedia({ id: 4, title: "Delta Movie", rating: 9 }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...EMPTY_MEDIA_FILTERS, minRating: 7 }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([3, 1, 4]);
  });
});

describe("evaluateSmartCollection - search", () => {
  it("matches case-insensitively", () => {
    const media = [
      createMedia({ id: 1, title: "The Matrix" }),
      createMedia({ id: 2, title: "the godfather" }),
      createMedia({ id: 3, title: "Inception" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), search: "THE" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("trims the search term", () => {
    const media = [
      createMedia({ id: 1, title: "The Matrix" }),
      createMedia({ id: 2, title: "Inception" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), search: "   matrix   " }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("matches on substring", () => {
    const media = [
      createMedia({ id: 1, title: "The Matrix" }),
      createMedia({ id: 2, title: "The Matrix Reloaded" }),
      createMedia({ id: 3, title: "Inception" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), search: "load" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([2]);
  });
});

describe("evaluateSmartCollection - media type", () => {
  const media = [
    createMedia({ id: 1, mediaType: "tv" }),
    createMedia({ id: 2, mediaType: "movie" }),
  ];

  it("restricts to TV", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), mediaType: "tv" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("restricts to Movie", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), mediaType: "movie" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it("returns all when type is all", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), mediaType: "all" }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe("evaluateSmartCollection - status", () => {
  const statuses = [
    "planned",
    "watching",
    "completed",
    "on-hold",
    "dropped",
  ] as const;

  it("filters to each supported status", () => {
    const media = statuses.map((status, index) =>
      createMedia({ id: index + 1, userStatus: status }),
    );

    for (const status of statuses) {
      const result = evaluateSmartCollection(
        createDefinition({ ...baseFilters(), status }),
        media,
      );

      expect(result.map((item) => item.userStatus)).toEqual([status]);
    }
  });

  it("returns all when status is all", () => {
    const media = statuses.map((status, index) =>
      createMedia({ id: index + 1, userStatus: status }),
    );

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), status: "all" }),
      media,
    );

    expect(result).toHaveLength(5);
  });
});

describe("evaluateSmartCollection - rating", () => {
  const media = [
    createMedia({ id: 1, title: "Exact", rating: 7 }),
    createMedia({ id: 2, title: "Above", rating: 9 }),
    createMedia({ id: 3, title: "Below", rating: 4 }),
  ];

  it("includes media at the exact threshold", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 7 }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("includes media above the threshold", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 5 }),
      media,
    );

    expect(result.map((item) => item.id).sort()).toEqual([1, 2]);
  });

  it("excludes media below the threshold", () => {
    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 8 }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it("treats undefined rating as zero", () => {
    const mediaWithUndefined = [
      createMedia({ id: 1, title: "Rated", rating: 8 }),
      createMedia({ id: 2, title: "Unrated", rating: undefined }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 1 }),
      mediaWithUndefined,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("supports fractional thresholds", () => {
    const fractionalMedia = [
      createMedia({ id: 1, title: "Just Below", rating: 7.4 }),
      createMedia({ id: 2, title: "Exact", rating: 7.5 }),
      createMedia({ id: 3, title: "Above", rating: 7.6 }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 7.5 }),
      fractionalMedia,
    );

    expect(result.map((item) => item.id)).toEqual([2, 3]);
  });
});

describe("evaluateSmartCollection - favorites", () => {
  it("matches favorite items", () => {
    const media = [
      createMedia({ id: 1, title: "Fav", favorite: true }),
      createMedia({ id: 2, title: "Not Fav", favorite: false }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), favoritesOnly: true }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("excludes non-favorites", () => {
    const media = [
      createMedia({ id: 1, title: "Not Fav", favorite: false }),
      createMedia({ id: 2, title: "Also Not", favorite: false }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), favoritesOnly: true }),
      media,
    );

    expect(result).toEqual([]);
  });

  it("excludes items with undefined favorite", () => {
    const media = [
      createMedia({ id: 1, title: "Fav", favorite: true }),
      createMedia({ id: 2, title: "Undefined", favorite: undefined }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), favoritesOnly: true }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });
});

describe("evaluateSmartCollection - genres", () => {
  it("matches a single selected genre", () => {
    const media = [
      createMedia({ id: 1, title: "Action Film", genres: ["Action"] }),
      createMedia({ id: 2, title: "Drama Film", genres: ["Drama"] }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), selectedGenres: ["Action"] }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("matches multiple selected genres using OR", () => {
    const media = [
      createMedia({ id: 1, title: "Action", genres: ["Action"] }),
      createMedia({ id: 2, title: "Drama", genres: ["Drama"] }),
      createMedia({ id: 3, title: "Comedy", genres: ["Comedy"] }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        selectedGenres: ["Action", "Drama"],
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("excludes items with missing/empty genres when a genre is active", () => {
    const media = [
      createMedia({ id: 1, title: "Action", genres: ["Action"] }),
      createMedia({ id: 2, title: "No Genres", genres: undefined }),
      createMedia({ id: 3, title: "Empty Genres", genres: [] }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({ ...baseFilters(), selectedGenres: ["Action"] }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });
});

describe("evaluateSmartCollection - combinations (AND across categories)", () => {
  it("ANDs search + media type", () => {
    const media = [
      createMedia({ id: 1, title: "Matrix", mediaType: "movie" }),
      createMedia({ id: 2, title: "Matrix", mediaType: "tv" }),
      createMedia({ id: 3, title: "Other Movie", mediaType: "movie" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        search: "matrix",
        mediaType: "movie",
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("ANDs status + rating", () => {
    const media = [
      createMedia({ id: 1, title: "A", userStatus: "completed", rating: 8 }),
      createMedia({ id: 2, title: "B", userStatus: "watching", rating: 8 }),
      createMedia({ id: 3, title: "C", userStatus: "completed", rating: 4 }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        status: "completed",
        minRating: 7,
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("ANDs favorite + rating", () => {
    const media = [
      createMedia({ id: 1, title: "A", favorite: true, rating: 9 }),
      createMedia({ id: 2, title: "B", favorite: false, rating: 9 }),
      createMedia({ id: 3, title: "C", favorite: true, rating: 4 }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        favoritesOnly: true,
        minRating: 7,
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("ANDs genre + media type", () => {
    const media = [
      createMedia({
        id: 1,
        title: "A",
        genres: ["Action"],
        mediaType: "movie",
      }),
      createMedia({ id: 2, title: "B", genres: ["Action"], mediaType: "tv" }),
      createMedia({ id: 3, title: "C", genres: ["Drama"], mediaType: "movie" }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        selectedGenres: ["Action"],
        mediaType: "movie",
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("ANDs multiple categories together", () => {
    const media = [
      createMedia({
        id: 1,
        title: "The Matrix",
        genres: ["Action", "Sci-Fi"],
        userStatus: "completed",
        rating: 9,
        favorite: true,
      }),
      createMedia({
        id: 2,
        title: "The Matrix Reloaded",
        genres: ["Action"],
        userStatus: "watching",
        rating: 9,
        favorite: true,
      }),
      createMedia({
        id: 3,
        title: "The Matrix Revolutions",
        genres: ["Action"],
        userStatus: "completed",
        rating: 7,
        favorite: true,
      }),
      createMedia({
        id: 4,
        title: "The Animatrix",
        genres: ["Animation"],
        userStatus: "completed",
        rating: 9,
        favorite: true,
      }),
      createMedia({
        id: 5,
        title: "The Matrix Resurrections",
        genres: ["Action"],
        userStatus: "completed",
        rating: 9,
        favorite: false,
      }),
    ];

    const result = evaluateSmartCollection(
      createDefinition({
        search: "matrix",
        mediaType: "movie",
        status: "completed",
        minRating: 8.5,
        favoritesOnly: true,
        selectedGenres: ["Action", "Sci-Fi"],
      }),
      media,
    );

    expect(result.map((item) => item.id)).toEqual([1]);
  });
});

describe("evaluateSmartCollection - immutability", () => {
  it("does not mutate the input array", () => {
    const media = [
      createMedia({ id: 1, rating: 9, favorite: true, genres: ["Action"] }),
      createMedia({ id: 2, mediaType: "tv", userStatus: "watching" }),
    ];
    const snapshot = structuredClone(media);

    evaluateSmartCollection(
      createDefinition({
        ...baseFilters(),
        search: "test",
        mediaType: "movie",
        status: "completed",
        minRating: 7,
        favoritesOnly: true,
        selectedGenres: ["Action"],
      }),
      media,
    );

    expect(media).toEqual(snapshot);
  });

  it("does not mutate media objects", () => {
    const media = [
      createMedia({ id: 1, title: "Alpha", rating: 8 }),
      createMedia({ id: 2, title: "Beta", rating: 3 }),
    ];
    const snapshot = structuredClone(media);

    evaluateSmartCollection(
      createDefinition({ ...baseFilters(), minRating: 7 }),
      media,
    );

    expect(media).toEqual(snapshot);
  });

  it("does not mutate the definition or filter state", () => {
    const filters: MediaFilterState = {
      ...baseFilters(),
      search: "matrix",
      selectedGenres: ["Action"],
    };
    const definition = createDefinition(filters);
    const filtersSnapshot = structuredClone(filters);
    const definitionSnapshot = structuredClone(definition);

    evaluateSmartCollection(definition, [
      createMedia({ id: 1, title: "The Matrix" }),
    ]);

    expect(definition).toEqual(definitionSnapshot);
    expect(filters).toEqual(filtersSnapshot);
  });
});

describe("evaluateSmartCollection - uses shared A24.3 filter engine", () => {
  it("produces the same result as calling applyMediaFilters directly", () => {
    const filters: MediaFilterState = {
      search: "matrix",
      mediaType: "movie",
      status: "completed",
      minRating: 7.5,
      favoritesOnly: true,
      selectedGenres: ["Action", "Sci-Fi"],
    };

    const media = [
      createMedia({
        id: 1,
        title: "The Matrix",
        mediaType: "movie",
        userStatus: "completed",
        rating: 9,
        favorite: true,
        genres: ["Action", "Sci-Fi"],
      }),
      createMedia({
        id: 2,
        title: "Inception",
        mediaType: "movie",
        userStatus: "completed",
        rating: 9,
        favorite: true,
        genres: ["Action", "Sci-Fi"],
      }),
      createMedia({
        id: 3,
        title: "The Matrix Reloaded",
        mediaType: "movie",
        userStatus: "watching",
        rating: 9,
        favorite: true,
        genres: ["Action"],
      }),
    ];

    const definition = createDefinition(filters);

    const evaluated = evaluateSmartCollection(definition, media);
    const direct = applyMediaFilters(media, filters);

    expect(evaluated).toEqual(direct);
    expect(evaluated.map((item) => item.id)).toEqual([1]);
  });
});
