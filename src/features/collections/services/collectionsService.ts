import { collectionRepository } from "../../../database/repositories/collectionRepository";
import { mediaRepository } from "../../../database/repositories/mediaRepository";
import { smartCollectionRepository } from "../../../database/repositories/smartCollectionRepository";

import type {
  PersistedCollection,
  PersistedCollectionMedia,
  PersistedMedia,
  PersistedSmartCollectionDefinition,
} from "../../../types";

export interface CollectionWithMedia {
  collection: PersistedCollection;
  media: PersistedMedia[];
}

export interface CollectionClassification {
  collection: PersistedCollection;
  isSmart: boolean;
  definition?: PersistedSmartCollectionDefinition;
}

export const collectionsService = {
  async createCollection(name: string): Promise<number> {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new Error("Collection name is required.");
    }

    const now = new Date();

    return collectionRepository.add({
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
  },

  async createSmartCollection(
    name: string,
    filters: PersistedSmartCollectionDefinition["filters"],
  ): Promise<{ collection: PersistedCollection; definition: PersistedSmartCollectionDefinition }> {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new Error("Collection name is required.");
    }

    return smartCollectionRepository.createSmartCollection(trimmed, filters);
  },

  async updateSmartCollectionFilters(
    collectionId: number,
    filters: PersistedSmartCollectionDefinition["filters"],
  ): Promise<void> {
    await smartCollectionRepository.update(collectionId, { filters });
  },

  async getSmartCollectionDefinition(
    collectionId: number,
  ): Promise<PersistedSmartCollectionDefinition | undefined> {
    return smartCollectionRepository.getByCollectionId(collectionId);
  },

  async classifyCollection(
    collection: PersistedCollection,
  ): Promise<CollectionClassification> {
    const definition = await smartCollectionRepository.getByCollectionId(
      collection.id,
    );

    return {
      collection,
      isSmart: definition !== undefined,
      definition,
    };
  },

  async classifyCollections(
    collections: PersistedCollection[],
  ): Promise<CollectionClassification[]> {
    const classifications = await Promise.all(
      collections.map((collection) => this.classifyCollection(collection)),
    );

    return classifications;
  },

  async renameCollection(id: number, name: string): Promise<void> {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      throw new Error("Collection name is required.");
    }

    await collectionRepository.update(id, { name: trimmed });
  },

  async deleteCollection(id: number): Promise<void> {
    await collectionRepository.remove(id);
  },

  async deleteSmartCollection(id: number): Promise<void> {
    // collectionRepository.remove runs the atomic Dexie transaction that
    // removes the collection row, its media links AND the smart definition,
    // so no separate definition removal is needed here.
    await collectionRepository.remove(id);
  },

  async listCollections(): Promise<PersistedCollection[]> {
    const collections = await collectionRepository.getAll();

    return collections.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  },

  async getCollectionWithMedia(
    id: number,
  ): Promise<CollectionWithMedia | null> {
    const collection = await collectionRepository.getById(id);

    if (!collection) {
      return null;
    }

    const memberships: PersistedCollectionMedia[] =
      await collectionRepository.getMembershipsByCollection(id);

    const mediaIds = memberships.map((membership) => membership.mediaId);

    const media = await mediaRepository.getByIds(mediaIds);

    // Defensively skip any memberships whose media no longer exists so the
    // detail view never renders a dangling reference (e.g. after a restore).
    const foundIds = new Set(media.map((item) => item.id));
    const presentMedia = media.filter(
      (item): item is PersistedMedia =>
        item.id !== undefined && foundIds.has(item.id),
    );

    return { collection, media: presentMedia };
  },

  async getCollectionsForMedia(
    mediaId: number,
  ): Promise<PersistedCollection[]> {
    const memberships =
      await collectionRepository.getMembershipsByMedia(mediaId);

    const collections = await Promise.all(
      memberships.map((membership) =>
        collectionRepository.getById(membership.collectionId),
      ),
    );

    return collections.filter(
      (collection): collection is PersistedCollection => collection !== undefined,
    );
  },

  async addMediaToCollection(
    collectionId: number,
    mediaId: number,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    return collectionRepository.addMedia(collectionId, mediaId);
  },

  async removeMediaFromCollection(
    collectionId: number,
    mediaId: number,
  ): Promise<void> {
    await collectionRepository.removeMedia(collectionId, mediaId);
  },

  async listLibraryMediaForPicker(
    collectionId: number,
  ): Promise<PersistedMedia[]> {
    const memberships =
      await collectionRepository.getMembershipsByCollection(collectionId);

    const memberIds = new Set(memberships.map((row) => row.mediaId));

    const allMedia = await mediaRepository.getAll();

    return allMedia.filter(
      (item): item is PersistedMedia => item.id !== undefined && !memberIds.has(item.id),
    );
  },

  async getAllLibraryMedia(): Promise<PersistedMedia[]> {
    const media = await mediaRepository.getAll();
    return media.filter((item): item is PersistedMedia => item.id !== undefined);
  },
};