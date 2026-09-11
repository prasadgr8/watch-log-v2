import { describe, expect, it } from "vitest";

import { collectionRepository } from "./collectionRepository";
import { smartCollectionRepository } from "./smartCollectionRepository";

import { EMPTY_MEDIA_FILTERS } from "../../domain/filters/mediaFilterModel";
import type { MediaFilterState } from "../../domain/filters/mediaFilterModel";

const sampleFilters: MediaFilterState = {
  ...EMPTY_MEDIA_FILTERS,
  search: "matrix",
  mediaType: "movie",
  status: "completed",
  minRating: 7,
  favoritesOnly: true,
  selectedGenres: ["Action", "Sci-Fi"],
};

describe("smartCollectionRepository - CRUD", () => {
  it("creates a Smart Collection atomically (collection + definition)", async () => {
    const result = await smartCollectionRepository.createSmartCollection(
      "Action Favorites",
      sampleFilters,
    );

    expect(result.collection.id).toBeGreaterThan(0);
    expect(result.collection.name).toBe("Action Favorites");
    expect(result.definition.collectionId).toBe(result.collection.id);
    expect(result.definition.filters).toEqual(sampleFilters);
  });

  it("retrieves a definition by collectionId", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Drama",
        EMPTY_MEDIA_FILTERS,
      );

    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );

    expect(definition).toBeDefined();
    expect(definition?.collectionId).toBe(collection.id);
    expect(definition?.filters).toEqual(EMPTY_MEDIA_FILTERS);
  });

  it("returns undefined for a collection without a definition", async () => {
    const id = await collectionRepository.add({
      name: "Manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const definition = await smartCollectionRepository.getByCollectionId(id);

    expect(definition).toBeUndefined();
  });

  it("retrieves all definitions", async () => {
    await smartCollectionRepository.createSmartCollection(
      "One",
      EMPTY_MEDIA_FILTERS,
    );
    await smartCollectionRepository.createSmartCollection(
      "Two",
      EMPTY_MEDIA_FILTERS,
    );

    const all = await smartCollectionRepository.getAll();

    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("updates the filter definition", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Editable",
        EMPTY_MEDIA_FILTERS,
      );

    await smartCollectionRepository.update(collection.id, {
      filters: {
        search: "updated",
        minRating: 5,
      },
    });

    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );

    expect(definition?.filters.search).toBe("updated");
    expect(definition?.filters.minRating).toBe(5);
  });

  it("removes a definition by collectionId", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Removable",
        EMPTY_MEDIA_FILTERS,
      );

    const removed =
      await smartCollectionRepository.removeByCollectionId(collection.id);

    expect(removed).toBe(true);

    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );
    expect(definition).toBeUndefined();
  });

  it("returns false when removing a definition for a Manual collection", async () => {
    const id = await collectionRepository.add({
      name: "Manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const removed = await smartCollectionRepository.removeByCollectionId(id);

    expect(removed).toBe(false);
  });
});

describe("smartCollectionRepository - constraints and data integrity", () => {
  it("enforces a unique collectionId per definition", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Unique",
        EMPTY_MEDIA_FILTERS,
      );

    await expect(
      smartCollectionRepository.add({
        collectionId: collection.id,
        filters: EMPTY_MEDIA_FILTERS,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("persists MediaFilterState as structured data, not evaluated media IDs", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Structured",
        sampleFilters,
      );

    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );

    expect(definition?.filters).toEqual(sampleFilters);
    expect(Object.keys(definition?.filters ?? {})).toEqual([
      "search",
      "mediaType",
      "status",
      "minRating",
      "favoritesOnly",
      "selectedGenres",
    ]);
    expect(JSON.stringify(definition)).not.toMatch(/"mediaIds"/);
    expect(JSON.stringify(definition)).not.toMatch(/"members"/);
  });
});

describe("smartCollectionRepository - deletion consistency", () => {
  it("removes the Smart Collection definition when its collection is deleted", async () => {
    const { collection } =
      await smartCollectionRepository.createSmartCollection(
        "Doomed",
        EMPTY_MEDIA_FILTERS,
      );

    await collectionRepository.remove(collection.id);

    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );
    expect(definition).toBeUndefined();

    const existing = await collectionRepository.getById(collection.id);
    expect(existing).toBeUndefined();
  });

  it("leaves Manual Collection deletion behavior intact", async () => {
    const id = await collectionRepository.add({
      name: "Manual Only",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await collectionRepository.remove(id);

    const existing = await collectionRepository.getById(id);
    expect(existing).toBeUndefined();
  });
});
