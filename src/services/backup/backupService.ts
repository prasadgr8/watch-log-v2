import { db } from "../../database/db";

import type { AppSetting, Episode, Media, WatchHistory } from "../../types";

import { validateAndHydrateBackup } from "./backupValidation";

import {
  WATCH_LOG_BACKUP_FORMAT,
  WATCH_LOG_BACKUP_VERSION,
  type BackupEpisode,
  type BackupMedia,
  type BackupSetting,
  type BackupWatchHistory,
  type WatchLogBackupV1,
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

export const backupService = {
  async createBackup(): Promise<WatchLogBackupV1> {
    const snapshot = await db.transaction(
      "r",
      db.media,
      db.episodes,
      db.watchHistory,
      db.settings,
      async () => {
        const [media, episodes, watchHistory, settings] = await Promise.all([
          db.media.toArray(),
          db.episodes.toArray(),
          db.watchHistory.toArray(),
          db.settings.toArray(),
        ]);

        return {
          media,
          episodes,
          watchHistory,
          settings,
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
      },
    };
  },

  async restoreBackup(value: unknown): Promise<void> {
    const restoreData = validateAndHydrateBackup(value);

    await db.transaction(
      "rw",
      db.media,
      db.episodes,
      db.watchHistory,
      db.settings,
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

        if (restoreData.settings.length > 0) {
          await db.settings.bulkPut(restoreData.settings);
        }
      },
    );
  },
};
