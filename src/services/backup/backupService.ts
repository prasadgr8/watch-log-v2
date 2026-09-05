import { db } from "../../database/db";

import type {
  AppSetting,
  Collection,
  CollectionMedia,
  Episode,
  Media,
  WatchHistory,
} from "../../types";

import { validateAndHydrateBackup } from "./backupValidation";

import {
  WATCH_LOG_BACKUP_FORMAT,
  WATCH_LOG_BACKUP_VERSION,
  type BackupCollection,
  type BackupCollectionMedia,
  type BackupEpisode,
  type BackupMedia,
  type BackupSetting,
  type BackupWatchHistory,
  type WatchLogBackupV2,
} from "./backupTypes";

function requireId(id: number | undefined, entityName: string): number {
  if (id === undefined) {
    throw new Error(`Cannot export ${entityName} without a persisted ID.`);
  }

  return id;
}

function serializeMedia(media: Media): BackupMedia {
  return {
    ...media,
    id: requireId(media.id, "media"),
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
    watchedAt:
      media.mediaType === "movie" && media.watchedAt
        ? media.watchedAt.toISOString()
        : undefined,
  };
}

function serializeEpisode(episode: Episode): BackupEpisode {
  return {
    ...episode,
    id: requireId(episode.id, "episode"),
    watchedAt: episode.watchedAt?.toISOString(),
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString(),
  };
}

function serializeWatchHistory(watchHistory: WatchHistory): BackupWatchHistory {
  return {
    ...watchHistory,
    id: requireId(watchHistory.id, "watch history"),
    watchedAt: watchHistory.watchedAt.toISOString(),
    createdAt: watchHistory.createdAt.toISOString(),
  };
}

function serializeSetting(setting: AppSetting): BackupSetting {
  return {
    ...setting,
    updatedAt: setting.updatedAt.toISOString(),
  };
}

function serializeCollection(collection: Collection): BackupCollection {
  return {
    ...collection,
    id: requireId(collection.id, "collection"),
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

function serializeCollectionMedia(
  membership: CollectionMedia,
): BackupCollectionMedia {
  return {
    ...membership,
    id: requireId(membership.id, "collection media"),
    createdAt: membership.createdAt.toISOString(),
  };
}

export const backupService = {
  async createBackup(): Promise<WatchLogBackupV2> {
    const snapshot = await db.transaction(
      "r",
      [
        db.media,
        db.episodes,
        db.watchHistory,
        db.settings,
        db.collections,
        db.collectionMedia,
      ],
      async () => {
        const [media, episodes, watchHistory, settings, collections, collectionMedia] =
          await Promise.all([
            db.media.toArray(),
            db.episodes.toArray(),
            db.watchHistory.toArray(),
            db.settings.toArray(),
            db.collections.toArray(),
            db.collectionMedia.toArray(),
          ]);

        return {
          media,
          episodes,
          watchHistory,
          settings,
          collections,
          collectionMedia,
        };
      },
    );

    return {
      format: WATCH_LOG_BACKUP_FORMAT,
      version: WATCH_LOG_BACKUP_VERSION,
      databaseVersion: db.verno,
      exportedAt: new Date().toISOString(),
      data: {
        media: snapshot.media.map(serializeMedia),
        episodes: snapshot.episodes.map(serializeEpisode),
        watchHistory: snapshot.watchHistory.map(serializeWatchHistory),
        settings: snapshot.settings.map(serializeSetting),
        collections: snapshot.collections.map(serializeCollection),
        collectionMedia: snapshot.collectionMedia.map(serializeCollectionMedia),
      },
    };
  },

  async restoreBackup(value: unknown): Promise<void> {
    const restoreData = validateAndHydrateBackup(value);

    await db.transaction(
      "rw",
      [
        db.media,
        db.episodes,
        db.watchHistory,
        db.settings,
        db.collections,
        db.collectionMedia,
      ],
      async () => {
        await db.watchHistory.clear();
        await db.episodes.clear();
        await db.media.clear();
        await db.settings.clear();

        if (restoreData.media.length > 0) {
          await db.media.bulkAdd(restoreData.media);
        }

        if (restoreData.episodes.length > 0) {
          await db.episodes.bulkAdd(restoreData.episodes);
        }

        if (restoreData.watchHistory.length > 0) {
          await db.watchHistory.bulkAdd(restoreData.watchHistory);
        }

        if (restoreData.formatVersion === 2) {
          // Version 2 backups carry collections as first-class user data, so
          // they replace the existing collections stores atomically. The
          // validator has already proven referential integrity and membership
          // uniqueness, and any failure here rolls back the whole restore.
          await db.collectionMedia.clear();
          await db.collections.clear();

          if (restoreData.collections.length > 0) {
            await db.collections.bulkAdd(restoreData.collections);
          }

          if (restoreData.collectionMedia.length > 0) {
            await db.collectionMedia.bulkAdd(restoreData.collectionMedia);
          }
        } else {
          /*
           * Version 1 backups predate custom collections and contain no
           * collections data. Existing user collections are preserved, but
           * memberships pointing at media that the restored library no longer
           * contains are pruned so no orphaned relationships remain.
           */
          const restoredMediaIds = new Set(
            restoreData.media.map((mediaItem) => mediaItem.id),
          );

          const memberships = await db.collectionMedia.toArray();

          const orphanedKeys = memberships
            .filter((membership) => !restoredMediaIds.has(membership.mediaId))
            .map((membership) => membership.id)
            .filter((id): id is number => id !== undefined);

          if (orphanedKeys.length > 0) {
            await db.collectionMedia.bulkDelete(orphanedKeys);
          }
        }

        if (restoreData.settings.length > 0) {
          await db.settings.bulkPut(restoreData.settings);
        }
      },
    );
  },
};
