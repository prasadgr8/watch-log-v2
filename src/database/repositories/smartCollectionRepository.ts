import { db } from "../db";

import type {
  PersistedCollection,
  SmartCollectionDefinition,
  PersistedSmartCollectionDefinition,
} from "../../types";

/**
 * Data access for Smart Collection definitions. A collection is Smart when
 * exactly one definition row references it; collections without a definition
 * remain Manual. Only the filter intent is stored - matching media is always
 * evaluated live by the caller and never persisted here.
 */
export const smartCollectionRepository = {
  async add(
    definition: SmartCollectionDefinition,
  ): Promise<PersistedSmartCollectionDefinition> {
    const id = await db.smartCollectionDefinitions.add(definition);

    if (id === undefined) {
      throw new Error("Failed to generate Smart Collection definition ID.");
    }

    return { ...definition, id };
  },

  /**
   * Atomic Smart Collection creation: the Collection row and its definition
   * are written in one transaction, so a definition failure cannot leave an
   * orphan collection behind. Only filter intent is stored — matching media
   * is always evaluated live and never persisted.
   */
  async createSmartCollection(
    name: string,
    filters: SmartCollectionDefinition["filters"],
  ): Promise<{
    collection: PersistedCollection;
    definition: PersistedSmartCollectionDefinition;
  }> {
    const now = new Date();

    return db.transaction(
      "rw",
      [db.collections, db.smartCollectionDefinitions],
      async () => {
        const collectionId = await db.collections.add({
          name,
          createdAt: now,
          updatedAt: now,
        });

        if (collectionId === undefined) {
          throw new Error("Failed to generate collection ID.");
        }

        const definitionId = await db.smartCollectionDefinitions.add({
          collectionId,
          filters,
          createdAt: now,
          updatedAt: now,
        });

        if (definitionId === undefined) {
          throw new Error("Failed to generate Smart Collection definition ID.");
        }

        return {
          collection: {
            id: collectionId,
            name,
            createdAt: now,
            updatedAt: now,
          },
          definition: {
            id: definitionId,
            collectionId,
            filters,
            createdAt: now,
            updatedAt: now,
          },
        };
      },
    );
  },

  async getByCollectionId(
    collectionId: number,
  ): Promise<PersistedSmartCollectionDefinition | undefined> {
    const definition = await db.smartCollectionDefinitions
      .where("collectionId")
      .equals(collectionId)
      .first();

    return definition as PersistedSmartCollectionDefinition | undefined;
  },

  async getAll(): Promise<PersistedSmartCollectionDefinition[]> {
    return db.smartCollectionDefinitions.toArray() as Promise<
      PersistedSmartCollectionDefinition[]
    >;
  },

  /** Updates the filter definition (and timestamps) for a collection. */
  async update(
    collectionId: number,
    changes: { filters?: Partial<SmartCollectionDefinition["filters"]> },
  ): Promise<void> {
    const definition = await db.smartCollectionDefinitions
      .where("collectionId")
      .equals(collectionId)
      .first();

    if (definition?.id === undefined) {
      throw new Error("Smart Collection definition not found.");
    }

    const nextFilters = { ...definition.filters, ...changes.filters };

    await db.smartCollectionDefinitions.update(definition.id, {
      filters: nextFilters,
      updatedAt: new Date(),
    });
  },

  /**
   * Deletes a collection's definition. Returns false when the collection had
   * no definition (i.e. it was Manual) so callers can distinguish the no-op.
   */
  async removeByCollectionId(collectionId: number): Promise<boolean> {
    const definition = await db.smartCollectionDefinitions
      .where("collectionId")
      .equals(collectionId)
      .first();

    if (definition?.id === undefined) {
      return false;
    }

    await db.smartCollectionDefinitions.delete(definition.id);

    return true;
  },
};
