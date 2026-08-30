import type { AppSetting, Episode, Media, WatchHistory } from "../../types";

import {
  WATCH_LOG_BACKUP_FORMAT,
  WATCH_LOG_BACKUP_VERSION,
  type BackupEpisode,
  type BackupMedia,
  type BackupSetting,
  type BackupWatchHistory,
  type WatchLogBackupV1,
} from "./backupTypes";

export interface ValidatedRestoreData {
  media: Media[];
  episodes: Episode[];
  watchHistory: WatchHistory[];
  settings: AppSetting[];
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "BackupValidationError";
  }
}

function fail(message: string): never {
  throw new BackupValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    return fail(`${fieldName} must be an object.`);
  }

  return value;
}

function requireArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    return fail(`${fieldName} must be an array.`);
  }

  return value;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    return fail(`${fieldName} must be a string.`);
  }

  return value;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  const stringValue = requireString(value, fieldName);

  if (stringValue.trim().length === 0) {
    return fail(`${fieldName} must not be empty.`);
  }

  return stringValue;
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(`${fieldName} must be a finite number.`);
  }

  return value;
}

function requireInteger(value: unknown, fieldName: string): number {
  const numberValue = requireNumber(value, fieldName);

  if (!Number.isInteger(numberValue)) {
    return fail(`${fieldName} must be an integer.`);
  }

  return numberValue;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  const integerValue = requireInteger(value, fieldName);

  if (integerValue <= 0) {
    return fail(`${fieldName} must be a positive integer.`);
  }

  return integerValue;
}

function requireNonNegativeInteger(value: unknown, fieldName: string): number {
  const integerValue = requireInteger(value, fieldName);

  if (integerValue < 0) {
    return fail(`${fieldName} must be a non-negative integer.`);
  }

  return integerValue;
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    return fail(`${fieldName} must be a boolean.`);
  }

  return value;
}

function requireIsoDate(value: unknown, fieldName: string): Date {
  const stringValue = requireString(value, fieldName);
  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime()) || date.toISOString() !== stringValue) {
    return fail(`${fieldName} must be an ISO-8601 UTC timestamp.`);
  }

  return date;
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, fieldName);
}

function optionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNumber(value, fieldName);
}

function optionalIsoDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireIsoDate(value, fieldName);
}

function requireOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): T {
  const stringValue = requireString(value, fieldName);

  if (!allowedValues.includes(stringValue as T)) {
    return fail(`${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }

  return stringValue as T;
}

function validateUniqueIds(ids: number[], entityName: string): void {
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    fail(`${entityName} contains duplicate IDs.`);
  }
}

function validateUniqueSettingKeys(settings: AppSetting[]): void {
  const keys = settings.map((setting) => setting.key);
  const uniqueKeys = new Set(keys);

  if (uniqueKeys.size !== keys.length) {
    fail("settings contains duplicate keys.");
  }
}

function hydrateMedia(value: unknown, index: number): Media {
  const fieldName = `data.media[${index}]`;
  const record = requireRecord(value, fieldName);

  const mediaType = requireOneOf(
    record.mediaType,
    ["tv", "movie"] as const,
    `${fieldName}.mediaType`,
  );

  const baseMedia = {
    id: requirePositiveInteger(record.id, `${fieldName}.id`),
    tmdbId:
      record.tmdbId === undefined
        ? undefined
        : requirePositiveInteger(record.tmdbId, `${fieldName}.tmdbId`),
    mediaType,
    title: requireNonEmptyString(record.title, `${fieldName}.title`),
    overview: optionalString(record.overview, `${fieldName}.overview`),
    posterPath: optionalString(record.posterPath, `${fieldName}.posterPath`),
    backdropPath: optionalString(
      record.backdropPath,
      `${fieldName}.backdropPath`,
    ),
    userStatus: requireOneOf(
      record.userStatus,
      ["planned", "watching", "completed", "on-hold", "dropped"] as const,
      `${fieldName}.userStatus`,
    ),
    rating: optionalNumber(record.rating, `${fieldName}.rating`),
    createdAt: requireIsoDate(record.createdAt, `${fieldName}.createdAt`),
    updatedAt: requireIsoDate(record.updatedAt, `${fieldName}.updatedAt`),
  };

  if (mediaType === "tv") {
    return {
      ...baseMedia,
      mediaType: "tv",
      firstAirDate: optionalString(
        record.firstAirDate,
        `${fieldName}.firstAirDate`,
      ),
      showStatus: optionalString(record.showStatus, `${fieldName}.showStatus`),
    };
  }

  return {
    ...baseMedia,
    mediaType: "movie",
    releaseDate: optionalString(record.releaseDate, `${fieldName}.releaseDate`),
    watchedAt: optionalIsoDate(record.watchedAt, `${fieldName}.watchedAt`),
  };
}

function hydrateEpisode(value: unknown, index: number): Episode {
  const fieldName = `data.episodes[${index}]`;
  const record = requireRecord(value, fieldName);

  return {
    id: requirePositiveInteger(record.id, `${fieldName}.id`),
    showId: requirePositiveInteger(record.showId, `${fieldName}.showId`),
    tmdbId:
      record.tmdbId === undefined
        ? undefined
        : requirePositiveInteger(record.tmdbId, `${fieldName}.tmdbId`),
    seasonNumber: requireNonNegativeInteger(
      record.seasonNumber,
      `${fieldName}.seasonNumber`,
    ),
    episodeNumber: requirePositiveInteger(
      record.episodeNumber,
      `${fieldName}.episodeNumber`,
    ),
    title: requireNonEmptyString(record.title, `${fieldName}.title`),
    overview: optionalString(record.overview, `${fieldName}.overview`),
    runtime:
      record.runtime === undefined
        ? undefined
        : requireNonNegativeInteger(record.runtime, `${fieldName}.runtime`),
    stillPath: optionalString(record.stillPath, `${fieldName}.stillPath`),
    airDate: optionalString(record.airDate, `${fieldName}.airDate`),
    voteAverage: optionalNumber(record.voteAverage, `${fieldName}.voteAverage`),
    watched: requireBoolean(record.watched, `${fieldName}.watched`),
    watchedAt: optionalIsoDate(record.watchedAt, `${fieldName}.watchedAt`),
    createdAt: requireIsoDate(record.createdAt, `${fieldName}.createdAt`),
    updatedAt: requireIsoDate(record.updatedAt, `${fieldName}.updatedAt`),
  };
}

function hydrateWatchHistory(value: unknown, index: number): WatchHistory {
  const fieldName = `data.watchHistory[${index}]`;
  const record = requireRecord(value, fieldName);

  return {
    id: requirePositiveInteger(record.id, `${fieldName}.id`),
    episodeId: requirePositiveInteger(
      record.episodeId,
      `${fieldName}.episodeId`,
    ),
    watchedAt: requireIsoDate(record.watchedAt, `${fieldName}.watchedAt`),
    source: requireOneOf(
      record.source,
      ["manual", "import"] as const,
      `${fieldName}.source`,
    ),
    createdAt: requireIsoDate(record.createdAt, `${fieldName}.createdAt`),
  };
}

function hydrateSetting(value: unknown, index: number): AppSetting {
  const fieldName = `data.settings[${index}]`;
  const record = requireRecord(value, fieldName);

  return {
    key: requireNonEmptyString(record.key, `${fieldName}.key`),
    value: record.value,
    updatedAt: requireIsoDate(record.updatedAt, `${fieldName}.updatedAt`),
  };
}

function validateRelationships(
  media: Media[],
  episodes: Episode[],
  watchHistory: WatchHistory[],
): void {
  const mediaIds = new Set(
    media.map((mediaItem) => requirePositiveInteger(mediaItem.id, "media.id")),
  );

  const episodeIds = new Set(
    episodes.map((episode) => requirePositiveInteger(episode.id, "episode.id")),
  );

  for (const episode of episodes) {
    if (!mediaIds.has(episode.showId)) {
      fail(`Episode ${episode.id} references missing media ${episode.showId}.`);
    }

    const parentMedia = media.find(
      (mediaItem) => mediaItem.id === episode.showId,
    );

    if (parentMedia?.mediaType !== "tv") {
      fail(`Episode ${episode.id} must reference a TV show.`);
    }
  }

  for (const watchEvent of watchHistory) {
    if (!episodeIds.has(watchEvent.episodeId)) {
      fail(
        `Watch history ${watchEvent.id} references missing episode ${watchEvent.episodeId}.`,
      );
    }
  }
}

export function validateAndHydrateBackup(value: unknown): ValidatedRestoreData {
  const backup = requireRecord(value, "backup");

  if (backup.format !== WATCH_LOG_BACKUP_FORMAT) {
    fail("Unsupported backup format.");
  }

  if (backup.version !== WATCH_LOG_BACKUP_VERSION) {
    fail("Unsupported backup version.");
  }

  const databaseVersion = requireInteger(
    backup.databaseVersion,
    "databaseVersion",
  );

  // Accept the current schema version and the previous one: backups exported
  // before importHistory existed (v3) must remain restorable.
  if (databaseVersion !== 3 && databaseVersion !== 4) {
    fail("Unsupported backup database version.");
  }

  requireIsoDate(backup.exportedAt, "exportedAt");

  const data = requireRecord(backup.data, "data");

  const mediaValues = requireArray(data.media, "data.media");
  const episodeValues = requireArray(data.episodes, "data.episodes");
  const watchHistoryValues = requireArray(
    data.watchHistory,
    "data.watchHistory",
  );
  const settingValues = requireArray(data.settings, "data.settings");

  const media = mediaValues.map(hydrateMedia);
  const episodes = episodeValues.map(hydrateEpisode);
  const watchHistory = watchHistoryValues.map(hydrateWatchHistory);
  const settings = settingValues.map(hydrateSetting);

  validateUniqueIds(
    media.map((mediaItem) => requirePositiveInteger(mediaItem.id, "media.id")),
    "media",
  );

  validateUniqueIds(
    episodes.map((episode) => requirePositiveInteger(episode.id, "episode.id")),
    "episodes",
  );

  validateUniqueIds(
    watchHistory.map((watchEvent) =>
      requirePositiveInteger(watchEvent.id, "watchHistory.id"),
    ),
    "watchHistory",
  );

  validateUniqueSettingKeys(settings);

  validateRelationships(media, episodes, watchHistory);

  return {
    media,
    episodes,
    watchHistory,
    settings,
  };
}

export type {
  BackupEpisode,
  BackupMedia,
  BackupSetting,
  BackupWatchHistory,
  WatchLogBackupV1,
};
