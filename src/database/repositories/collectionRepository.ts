import { db } from "../db";

import type {
  Collection,
  Media,
  PersistedCollection,
  PersistedCollectionMedia,
} from "../../types";

/**
 * Internal marker error used to abort the addMediaMany transaction when the
 * target collection does not exist. Caught by addMediaMany and mapped to the
 * "collection-missing" result; all other errors propagate to the caller.
 */
class CollectionMissingError extends Error {}

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

/**
 * Outcome of a bulk membership add. Existing memberships are skipped and
 * counted as duplicates; missing media IDs are counted as missing; new
 * memberships are counted as added. A transaction failure (e.g. a constraint
 * violation from a concurrent writer) aborts the whole batch — the call then
 * rejects rather than returning a partial-success result.
 */
export type BulkAddMembershipsResult =
  | {
      ok: true;
      addedCount: number;
      duplicateCount: number;
      missingCount: number;
    }
  | { ok: false; reason: "collection-missing" };

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
   * Deletes a collection and its membership rows. If the collection was a
   * Smart Collection, its definition row is deleted in the same transaction so
   * no orphan definition can outlive its collection. The underlying media,
   * episodes, ratings, and watch history are never touched.
   */
  async remove(id: number): Promise<void> {
    await db.transaction(
      "rw",
      [db.collections, db.collectionMedia, db.smartCollectionDefinitions],
      async () => {
        await db.collectionMedia.where("collectionId").equals(id).delete();
        await db.smartCollectionDefinitions
          .where("collectionId")
          .equals(id)
          .delete();
        await db.collections.delete(id);
      },
    );
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

  /**
   * Adds many media items to one collection in a single transaction. Existing
   * memberships are skipped (counted as duplicates) and never rewritten;
   * missing media IDs are counted as missing. The duplicate check runs inside
   * the transaction via a single membership lookup, so a ConstraintError can
   * only come from a concurrent external writer — in that case the transaction
   * aborts and the error propagates (no partial-success result is returned).
   * This differs from addMedia, which maps the race to a "duplicate" result
   * because it cannot roll back a per-row intent.
   */
  async addMediaMany(
    collectionId: number,
    mediaIds: number[],
  ): Promise<BulkAddMembershipsResult> {
    const now = new Date();
    let addedCount = 0;
    let duplicateCount = 0;
    let missingCount = 0;

    try {
      await db.transaction(
        "rw",
        [db.collections, db.collectionMedia, db.media],
        async () => {
          const collection = await db.collections.get(collectionId);

          if (!collection) {
            throw new CollectionMissingError();
          }

          if (mediaIds.length === 0) {
            return;
          }

          const mediaRecords = await db.media.bulkGet(mediaIds);
          const foundIds = new Set(
            mediaRecords
              .filter(
                (record): record is Media & { id: number } =>
                  record !== undefined && record.id !== undefined,
              )
              .map((record) => record.id),
          );

          missingCount = mediaIds.length - foundIds.size;

          const existingMemberships = await db.collectionMedia
            .where("collectionId")
            .equals(collectionId)
            .toArray();
          const existingMemberIds = new Set(
            existingMemberships.map((membership) => membership.mediaId),
          );

          for (const mediaId of mediaIds) {
            if (!foundIds.has(mediaId)) {
              continue;
            }

            if (existingMemberIds.has(mediaId)) {
              duplicateCount++;
              continue;
            }

            await db.collectionMedia.add({
              collectionId,
              mediaId,
              createdAt: now,
            });
            addedCount++;
          }
        },
      );
    } catch (error) {
      if (error instanceof CollectionMissingError) {
        return { ok: false, reason: "collection-missing" };
      }

      throw error;
    }

    return {
      ok: true,
      addedCount,
      duplicateCount,
      missingCount,
    };
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
