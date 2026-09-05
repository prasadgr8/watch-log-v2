import { db } from "../db";

import type { Media, MediaType, WatchStatus } from "../../types";

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

  async remove(id: number): Promise<void> {
    await db.transaction(
      "rw",
      db.media,
      db.episodes,
      db.watchHistory,
      db.collectionMedia,
      async () => {
        const episodeKeys = await db.episodes
          .where("showId")
          .equals(id)
          .primaryKeys();

        const episodeIds = episodeKeys.filter(
          (episodeId): episodeId is number => episodeId !== undefined,
        );

        if (episodeIds.length > 0) {
          await db.watchHistory.where("episodeId").anyOf(episodeIds).delete();
        }

        await db.episodes.where("showId").equals(id).delete();

        // Removing media also removes its collection memberships so no
        // orphaned relationships remain. Collections themselves are kept.
        await db.collectionMedia.where("mediaId").equals(id).delete();

        await db.media.delete(id);
      },
    );
  },

  async count(): Promise<number> {
    return db.media.count();
  },

  async countByType(mediaType: MediaType): Promise<number> {
    return db.media.where("mediaType").equals(mediaType).count();
  },
};
