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
