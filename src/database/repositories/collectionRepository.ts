import { db } from "../db";

import type {
  Collection,
  PersistedCollection,
  PersistedCollectionMedia,
} from "../../types";

/**
 * Result of adding media to a collection. Expected conditions are reported as
 * results instead of thrown errors so the UI can present them precisely.
 */
export type AddMembershipResult =
  | { ok: true }
  | {
      ok: false;
      reason: "collection-missing" | "media-missing" | "duplicate";
    };

function isConstraintError(error: unknown): boolean {
  const name = (error as { name?: string } | undefined)?.name;
  const innerName = (error as { inner?: { name?: string } } | undefined)?.inner
    ?.name;

  return name === "ConstraintError" || innerName === "ConstraintError";
}

export const collectionRepository = {
  async add(collection: Collection): Promise<number> {
    const id = await db.collections.add(collection);

    if (id === undefined) {
      throw new Error("Failed to generate collection ID.");
    }

    return id;
  },

  async getById(id: number): Promise<PersistedCollection | undefined> {
    return db.collections.get(id) as Promise<PersistedCollection | undefined>;
  },

  async getAll(): Promise<PersistedCollection[]> {
    return db.collections.toArray() as Promise<PersistedCollection[]>;
  },

  async update(id: number, changes: Partial<Collection>): Promise<number> {
    return db.collections.update(id, {
      ...changes,
      updatedAt: new Date(),
    });
  },

  async count(): Promise<number> {
    return db.collections.count();
  },

  /**
   * Deletes a collection and its membership rows. The underlying media,
   * episodes, ratings, and watch history are never touched.
   */
  async remove(id: number): Promise<void> {
    await db.transaction("rw", db.collections, db.collectionMedia, async () => {
      await db.collectionMedia.where("collectionId").equals(id).delete();
      await db.collections.delete(id);
    });
  },

  /**
   * Adds an existing library media item to a collection. Membership
   * uniqueness is enforced by the unique `[collectionId+mediaId]` index; the
   * in-transaction pre-check only provides the friendly result path, and a
   * `ConstraintError` from a concurrent writer is mapped to the same result.
   */
  async addMedia(
    collectionId: number,
    mediaId: number,
  ): Promise<AddMembershipResult> {
    try {
      return await db.transaction(
        "rw",
        [db.collections, db.collectionMedia, db.media],
        async (): Promise<AddMembershipResult> => {
          const collection = await db.collections.get(collectionId);

          if (!collection) {
            return { ok: false, reason: "collection-missing" };
          }

          const media = await db.media.get(mediaId);

          if (!media) {
            return { ok: false, reason: "media-missing" };
          }

          const existing = await db.collectionMedia
            .where("[collectionId+mediaId]")
            .equals([collectionId, mediaId])
            .first();

          if (existing) {
            return { ok: false, reason: "duplicate" };
          }

          await db.collectionMedia.add({
            collectionId,
            mediaId,
            createdAt: new Date(),
          });

          return { ok: true };
        },
      );
    } catch (error) {
      // The constraint violation aborted the transaction, so nothing was
      // written; the race loser is reported as a duplicate.
      if (isConstraintError(error)) {
        return { ok: false, reason: "duplicate" };
      }

      throw error;
    }
  },

  /** Removes one relationship. Idempotent: absent relationships are a no-op. */
  async removeMedia(collectionId: number, mediaId: number): Promise<void> {
    await db.transaction("rw", db.collectionMedia, async () => {
      await db.collectionMedia
        .where("[collectionId+mediaId]")
        .equals([collectionId, mediaId])
        .delete();
    });
  },

  /** Memberships of one collection, in the order they were added. */
  async getMembershipsByCollection(
    collectionId: number,
  ): Promise<PersistedCollectionMedia[]> {
    return db.collectionMedia
      .where("collectionId")
      .equals(collectionId)
      .toArray() as Promise<PersistedCollectionMedia[]>;
  },

  /** Memberships that place one media item inside collections. */
  async getMembershipsByMedia(
    mediaId: number,
  ): Promise<PersistedCollectionMedia[]> {
    return db.collectionMedia
      .where("mediaId")
      .equals(mediaId)
      .toArray() as Promise<PersistedCollectionMedia[]>;
  },
};
