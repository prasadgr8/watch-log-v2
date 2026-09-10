import { describe, expect, it } from "vitest";

import { validateAndHydrateBackup } from "./backupValidation";

interface TestBackup {
  format: string;
  version: number;
  databaseVersion: number;
  exportedAt: string;
  data: {
    media: unknown[];
    episodes: unknown[];
    watchHistory: unknown[];
    settings: unknown[];
    collections: Array<{
      id: number;
      name: string;
      createdAt: string;
      updatedAt: string;
    }>;
    collectionMedia: unknown[];
    smartCollectionDefinitions: Array<{
      id: number;
      collectionId: number;
      filters: {
        search: string;
        mediaType: string;
        status: string;
        minRating: unknown;
        favoritesOnly: boolean;
        selectedGenres: unknown[];
      };
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

function createValidBackup(): TestBackup {
  return {
    format: "watch-log-v2-backup",
    version: 2,
    databaseVersion: 6,
    exportedAt: "2026-07-15T16:00:00.000Z",
    data: {
      media: [],
      episodes: [],
      watchHistory: [],
      settings: [],
      collections: [
        {
          id: 1,
          name: "Test Collection",
          createdAt: "2026-07-15T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
        },
      ],
      collectionMedia: [],
      smartCollectionDefinitions: [
        {
          id: 1,
          collectionId: 1,
          filters: {
            search: "",
            mediaType: "all",
            status: "all",
            minRating: null,
            favoritesOnly: false,
            selectedGenres: [],
          },
          createdAt: "2026-07-15T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
        },
      ],
    },
  };
}

describe("backupValidation - Smart Collection minRating", () => {
  it("accepts null minRating (no restriction)", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = null;

    const result = validateAndHydrateBackup(backup);

    expect(result.smartCollectionDefinitions[0]!.filters.minRating).toBeNull();
  });

  it("accepts 0 as a valid minRating", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = 0;

    const result = validateAndHydrateBackup(backup);

    expect(result.smartCollectionDefinitions[0]!.filters.minRating).toBe(0);
  });

  it("accepts fractional ratings like 7.5", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = 7.5;

    const result = validateAndHydrateBackup(backup);

    expect(result.smartCollectionDefinitions[0]!.filters.minRating).toBe(7.5);
  });

  it("rejects non-numeric minRating values", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = "high";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "filters.minRating must be a finite number",
    );
  });

  it("rejects NaN minRating", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = NaN;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "filters.minRating must be a finite number",
    );
  });

  it("rejects Infinity minRating", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.filters.minRating = Infinity;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "filters.minRating must be a finite number",
    );
  });
});

describe("backupValidation - Smart Collection definition relationships", () => {
  it("rejects an orphan Smart Collection definition", () => {
    const backup = createValidBackup();
    backup.data.smartCollectionDefinitions[0]!.collectionId = 999;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Smart Collection definition 1 references missing collection 999",
    );
  });

  it("accepts definitions that reference existing collections", () => {
    const backup = createValidBackup();
    backup.data.collections.push({
      id: 2,
      name: "Second Collection",
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
    });
    backup.data.smartCollectionDefinitions.push({
      id: 2,
      collectionId: 2,
      filters: {
        search: "",
        mediaType: "all",
        status: "all",
        minRating: null,
        favoritesOnly: false,
        selectedGenres: [],
      },
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
    });

    const result = validateAndHydrateBackup(backup);

    expect(result.smartCollectionDefinitions).toHaveLength(2);
  });
});
