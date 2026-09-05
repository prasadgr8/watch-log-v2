export const WATCH_LOG_BACKUP_FORMAT = "watch-log-v2-backup" as const;

/*
 * Current backup format version. Version 2 added collections and their
 * memberships as first-class user data. Version 1 backups (exported before
 * custom collections existed) remain fully readable.
 */
export const WATCH_LOG_BACKUP_VERSION = 2 as const;

export const LEGACY_WATCH_LOG_BACKUP_VERSION = 1 as const;

export interface BackupMedia {
  id: number;
  tmdbId?: number;
  mediaType: "tv" | "movie";
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  userStatus: "planned" | "watching" | "completed" | "on-hold" | "dropped";
  rating?: number;
  createdAt: string;
  updatedAt: string;
  firstAirDate?: string;
  showStatus?: string;
  releaseDate?: string;
  watchedAt?: string;
}

export interface BackupEpisode {
  id: number;
  showId: number;
  tmdbId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  runtime?: number;
  stillPath?: string;
  airDate?: string;
  voteAverage?: number;
  watched: boolean;
  watchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupWatchHistory {
  id: number;
  episodeId: number;
  watchedAt: string;
  source: "manual" | "import";
  createdAt: string;
}

export interface BackupSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface BackupCollection {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupCollectionMedia {
  id: number;
  collectionId: number;
  mediaId: number;
  createdAt: string;
}

export interface WatchLogBackupV1 {
  format: typeof WATCH_LOG_BACKUP_FORMAT;
  version: typeof LEGACY_WATCH_LOG_BACKUP_VERSION;
  databaseVersion: number;
  exportedAt: string;
  data: {
    media: BackupMedia[];
    episodes: BackupEpisode[];
    watchHistory: BackupWatchHistory[];
    settings: BackupSetting[];
  };
}

export interface WatchLogBackupV2 {
  format: typeof WATCH_LOG_BACKUP_FORMAT;
  version: typeof WATCH_LOG_BACKUP_VERSION;
  databaseVersion: number;
  exportedAt: string;
  data: {
    media: BackupMedia[];
    episodes: BackupEpisode[];
    watchHistory: BackupWatchHistory[];
    settings: BackupSetting[];
    collections: BackupCollection[];
    collectionMedia: BackupCollectionMedia[];
  };
}
