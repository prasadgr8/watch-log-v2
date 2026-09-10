import type { MediaFilterState } from "../domain/filters/mediaFilterModel";

export interface Collection {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PersistedCollection = Collection & {
  id: number;
};

export interface CollectionMedia {
  id?: number;
  collectionId: number;
  mediaId: number;
  createdAt: Date;
}

export type PersistedCollectionMedia = CollectionMedia & {
  id: number;
};

/**
 * A Smart Collection's stored filter definition. A collection is Smart when
 * exactly one of these rows references it; collections without one remain
 * Manual. Only the filter intent is persisted — matching media is always
 * evaluated live from the local library, never cached.
 */
export interface SmartCollectionDefinition {
  id?: number;
  collectionId: number;
  filters: MediaFilterState;
  createdAt: Date;
  updatedAt: Date;
}

export type PersistedSmartCollectionDefinition =
  SmartCollectionDefinition & {
    id: number;
  };
