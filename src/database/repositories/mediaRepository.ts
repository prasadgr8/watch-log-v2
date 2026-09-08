import { db } from "../db";

import type { Media, MediaType, WatchStatus } from "../../types";

/**
 * Outcome of a bulk status/favorite update. Records already in the target
 * state are skipped without a write so their updatedAt and other fields are
 * left untouched; the counts let the UI report precisely what changed.
 */
export interface BulkMediaUpdateResult {
  updatedCount: number;
  unchangedCount: number;
  missingCount: number;
}

/**
 * Outcome of a bulk media removal. The cascade tallies are informational so
 * the UI can summarise what was removed; the removed/missing counters drive
 * the primary outcome message.
 */
export interface BulkMediaRemoveResult {
  removedCount: number;
  missingCount: number;
  removedEpisodeCount: number;
  removedWatchEventCount: number;
  removedMembershipCount: number;
}

/**
 * Shared cascade implementation used by both remove(id) and removeMany(ids).
 * Preserves the exact cascade ordering of the original single-remove:
 * collect episode keys, delete their watch history, delete the episodes,
 * delete collection memberships, then delete the media record. Runs inside
 * one transaction so a failure aborts with zero partial deletions.
 */
async function removeMediaCascade(ids: number[]): Promise<BulkMediaRemoveResult> {
  const result: BulkMediaRemoveResult = {
    removedCount: 0,
    missingCount: 0,
    removedEpisodeCount: 0,
    removedWatchEventCount: 0,
    removedMembershipCount: 0,
  };

  await db.transaction(
    "rw",
    db.media,
    db.episodes,
    db.watchHistory,
    db.collectionMedia,
    async () => {
      for (const id of ids) {
        const media = await db.media.get(id);

        if (!media) {
          result.missingCount++;
          continue;
        }

        const episodeKeys = await db.episodes
          .where("showId")
          .equals(id)
          .primaryKeys();

        const episodeIds = episodeKeys.filter(
          (episodeId): episodeId is number => episodeId !== undefined,
        );

        if (episodeIds.length > 0) {
          const removedEvents = await db.watchHistory
            .where("episodeId")
            .anyOf(episodeIds)
            .delete();
          result.removedWatchEventCount += removedEvents;
        }

        const removedEpisodes = await db.episodes
          .where("showId")
          .equals(id)
          .delete();
        result.removedEpisodeCount += removedEpisodes;

        const removedMemberships = await db.collectionMedia
          .where("mediaId")
          .equals(id)
          .delete();
        result.removedMembershipCount += removedMemberships;

        await db.media.delete(id);
        result.removedCount++;
      }
    },
  );

  return result;
}

export const mediaRepository = {
  async add(media: Media): Promise<number> {
    const id = await db.media.add(media);

    if (id === undefined) {
      throw new Error("Failed to generate media ID.");
    }

    return id;
  },

  async getById(id: number): Promise<Media | undefined> {
    return db.media.get(id);
  },

  async getByTmdbId(
    tmdbId: number,
    mediaType: MediaType,
  ): Promise<Media | undefined> {
    return db.media
      .where("[tmdbId+mediaType]")
      .equals([tmdbId, mediaType])
      .first();
  },

  async getAll(): Promise<Media[]> {
    return db.media.toArray();
  },

  /**
   * Bulk fetch by primary keys. Missing records are omitted; the result
   * preserves the order of the requested IDs for present records.
   */
  async getByIds(ids: number[]): Promise<Media[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await db.media.bulkGet(ids);

    return records.filter(
      (record): record is Media =>
        record !== undefined && record.id !== undefined,
    );
  },

  async getByType(mediaType: MediaType): Promise<Media[]> {
    return db.media.where("mediaType").equals(mediaType).toArray();
  },

  async getByStatus(userStatus: WatchStatus): Promise<Media[]> {
    return db.media.where("userStatus").equals(userStatus).toArray();
  },

  async update(id: number, changes: Partial<Media>): Promise<number> {
    return db.media.update(id, {
      ...changes,
      updatedAt: new Date(),
    });
  },

  /**
   * Removes one media record and cascades to its episodes, watch history, and
   * collection memberships. The cascade is shared with removeMany so both
   * paths delete related records in the same order and with the same
   * transactional guarantees.
   */
  async remove(id: number): Promise<void> {
    await removeMediaCascade([id]);
  },

  /**
   * Bulk removal of media records. Each ID is processed through the same
   * cascade as remove(id): episodes, their watch history, and collection
   * memberships are deleted before the media record. The entire batch runs
   * in one transaction, so any failure aborts with zero partial deletions.
   * Missing IDs are skipped and counted.
   */
  async removeMany(ids: number[]): Promise<BulkMediaRemoveResult> {
    if (ids.length === 0) {
      return {
        removedCount: 0,
        missingCount: 0,
        removedEpisodeCount: 0,
        removedWatchEventCount: 0,
        removedMembershipCount: 0,
      };
    }

    return removeMediaCascade(ids);
  },

  /**
   * Sets the watch status for many media records in one transaction. Records
   * already at the target status are skipped without a write so their
   * updatedAt is left untouched. Only userStatus and updatedAt are changed;
   * no episode, watch-history, or other side effects are introduced.
   */
  async setUserStatusMany(
    ids: number[],
    userStatus: WatchStatus,
  ): Promise<BulkMediaUpdateResult> {
    const now = new Date();
    const outcome: BulkMediaUpdateResult = {
      updatedCount: 0,
      unchangedCount: 0,
      missingCount: 0,
    };

    await db.transaction("rw", db.media, async () => {
      const records = await db.media.bulkGet(ids);

      for (let index = 0; index < records.length; index++) {
        const record = records[index];

        if (!record || record.id === undefined) {
          outcome.missingCount++;
          continue;
        }

        if (record.userStatus === userStatus) {
          outcome.unchangedCount++;
          continue;
        }

        await db.media.update(record.id, { userStatus, updatedAt: now });
        outcome.updatedCount++;
      }
    });

    return outcome;
  },

  /**
   * Sets the favorite flag for many media records in one transaction. The
   * target true writes only to records that are not already true; the target
   * false writes only to records that are explicitly true (undefined counts
   * as already-unfavorite and is skipped). Only favorite and updatedAt are
   * changed.
   */
  async setFavoriteMany(
    ids: number[],
    favorite: boolean,
  ): Promise<BulkMediaUpdateResult> {
    const now = new Date();
    const outcome: BulkMediaUpdateResult = {
      updatedCount: 0,
      unchangedCount: 0,
      missingCount: 0,
    };

    await db.transaction("rw", db.media, async () => {
      const records = await db.media.bulkGet(ids);

      for (let index = 0; index < records.length; index++) {
        const record = records[index];

        if (!record || record.id === undefined) {
          outcome.missingCount++;
          continue;
        }

        const alreadyAtTarget = favorite
          ? record.favorite === true
          : record.favorite !== true;

        if (alreadyAtTarget) {
          outcome.unchangedCount++;
          continue;
        }

        await db.media.update(record.id, { favorite, updatedAt: now });
        outcome.updatedCount++;
      }
    });

    return outcome;
  },

  async count(): Promise<number> {
    return db.media.count();
  },

  async countByType(mediaType: MediaType): Promise<number> {
    return db.media.where("mediaType").equals(mediaType).count();
  },
};
