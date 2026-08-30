import { describe, expect, it } from "vitest";

import { db } from "../../database/db";

import {
  episodeRepository,
  mediaRepository,
  settingsRepository,
} from "../../database/repositories";

import type { Episode, TVShow } from "../../types";

import { backupService } from "./backupService";
import {
  WATCH_LOG_BACKUP_FORMAT,
  WATCH_LOG_BACKUP_VERSION,
} from "./backupTypes";

function createTvShow(): TVShow {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
  };
}

function createEpisode(showId: number): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    runtime: 58,
    watched: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe("backupService", () => {
  it("exports a versioned snapshot of all application stores", async () => {
    const showId = await mediaRepository.add(createTvShow());

    const episodeId = await episodeRepository.add(createEpisode(showId));

    await episodeRepository.markWatched(episodeId);

    await settingsRepository.set("theme", "dark");

    const backup = await backupService.createBackup();

    expect(backup).toMatchObject({
      format: WATCH_LOG_BACKUP_FORMAT,
      version: WATCH_LOG_BACKUP_VERSION,
      databaseVersion: 4,
    });

    expect(new Date(backup.exportedAt).toISOString()).toBe(backup.exportedAt);

    expect(backup.data.media).toHaveLength(1);
    expect(backup.data.episodes).toHaveLength(1);
    expect(backup.data.watchHistory).toHaveLength(1);
    expect(backup.data.settings).toHaveLength(1);

    expect(backup.data.media[0]).toMatchObject({
      id: showId,
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
    });

    expect(backup.data.episodes[0]).toMatchObject({
      id: episodeId,
      showId,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      runtime: 58,
      watched: true,
    });

    expect(backup.data.episodes[0]?.watchedAt).toBe(
      backup.data.watchHistory[0]?.watchedAt,
    );

    expect(backup.data.watchHistory[0]).toMatchObject({
      episodeId,
      source: "manual",
    });

    expect(backup.data.settings[0]).toMatchObject({
      key: "theme",
      value: "dark",
    });

    expect(typeof backup.data.episodes[0]?.watchedAt).toBe("string");
    expect(typeof backup.data.watchHistory[0]?.watchedAt).toBe("string");
    expect(typeof backup.data.watchHistory[0]?.createdAt).toBe("string");
    expect(typeof backup.data.settings[0]?.updatedAt).toBe("string");
  });

  it("exports an empty database as a valid backup", async () => {
    const backup = await backupService.createBackup();

    expect(backup).toMatchObject({
      format: WATCH_LOG_BACKUP_FORMAT,
      version: WATCH_LOG_BACKUP_VERSION,
      databaseVersion: 4,
      data: {
        media: [],
        episodes: [],
        watchHistory: [],
        settings: [],
      },
    });

    expect(new Date(backup.exportedAt).toISOString()).toBe(backup.exportedAt);
  });

  it("preserves explicit persisted IDs and relationships", async () => {
    const now = new Date("2026-07-15T00:00:00.000Z");

    await db.media.add({
      id: 41,
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    });

    await db.episodes.add({
      id: 84,
      showId: 41,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: true,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      createdAt: now,
      updatedAt: now,
    });

    await db.watchHistory.add({
      id: 126,
      episodeId: 84,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      source: "manual",
      createdAt: now,
    });

    const backup = await backupService.createBackup();

    expect(backup.data.media[0]?.id).toBe(41);

    expect(backup.data.episodes[0]).toMatchObject({
      id: 84,
      showId: 41,
    });

    expect(backup.data.watchHistory[0]).toMatchObject({
      id: 126,
      episodeId: 84,
    });
  });
  it("replaces current data with a validated backup and preserves relationships", async () => {
    const currentShowId = await mediaRepository.add({
      ...createTvShow(),
      tmdbId: 66732,
      title: "Current Library Show",
    });

    await episodeRepository.add({
      ...createEpisode(currentShowId),
      tmdbId: 119123,
      title: "Current Episode",
    });

    await settingsRepository.set("theme", "current");

    const backup = {
      format: "watch-log-v2-backup",
      version: 1,
      databaseVersion: 3,
      exportedAt: "2026-07-15T16:00:00.000Z",
      data: {
        media: [
          {
            id: 41,
            tmdbId: 1396,
            mediaType: "tv",
            title: "Breaking Bad",
            userStatus: "watching",
            createdAt: "2026-07-15T00:00:00.000Z",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        episodes: [
          {
            id: 84,
            showId: 41,
            tmdbId: 62085,
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Pilot",
            runtime: 58,
            watched: true,
            watchedAt: "2026-07-10T18:30:00.000Z",
            createdAt: "2026-07-15T00:00:00.000Z",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        watchHistory: [
          {
            id: 126,
            episodeId: 84,
            watchedAt: "2026-07-10T18:30:00.000Z",
            source: "manual",
            createdAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        settings: [
          {
            key: "theme",
            value: "restored",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
      },
    };

    await backupService.restoreBackup(backup);

    const media = await db.media.toArray();
    const episodes = await db.episodes.toArray();
    const watchHistory = await db.watchHistory.toArray();
    const settings = await db.settings.toArray();

    expect(media).toHaveLength(1);
    expect(episodes).toHaveLength(1);
    expect(watchHistory).toHaveLength(1);
    expect(settings).toHaveLength(1);

    expect(media[0]).toMatchObject({
      id: 41,
      title: "Breaking Bad",
    });

    expect(episodes[0]).toMatchObject({
      id: 84,
      showId: 41,
      title: "Pilot",
      watched: true,
    });

    expect(watchHistory[0]).toMatchObject({
      id: 126,
      episodeId: 84,
      source: "manual",
    });

    expect(settings[0]).toMatchObject({
      key: "theme",
      value: "restored",
    });

    expect(media[0]?.createdAt).toBeInstanceOf(Date);
    expect(episodes[0]?.watchedAt).toBeInstanceOf(Date);
    expect(watchHistory[0]?.watchedAt).toBeInstanceOf(Date);
    expect(settings[0]?.updatedAt).toBeInstanceOf(Date);

    expect(await db.media.get(currentShowId)).toBeUndefined();
  });
  it("leaves current data untouched when backup validation fails", async () => {
    const showId = await mediaRepository.add(createTvShow());

    const episodeId = await episodeRepository.add(createEpisode(showId));

    await episodeRepository.markWatched(episodeId);

    await settingsRepository.set("theme", "dark");

    const invalidBackup = {
      format: "watch-log-v2-backup",
      version: 1,
      databaseVersion: 3,
      exportedAt: "2026-07-15T16:00:00.000Z",
      data: {
        media: [],
        episodes: [
          {
            id: 84,
            showId: 999,
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Orphan Episode",
            watched: false,
            createdAt: "2026-07-15T00:00:00.000Z",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        watchHistory: [],
        settings: [],
      },
    };

    await expect(backupService.restoreBackup(invalidBackup)).rejects.toThrow(
      "Episode 84 references missing media 999.",
    );

    const media = await db.media.toArray();
    const episodes = await db.episodes.toArray();
    const watchHistory = await db.watchHistory.toArray();
    const settings = await db.settings.toArray();

    expect(media).toHaveLength(1);
    expect(episodes).toHaveLength(1);
    expect(watchHistory).toHaveLength(1);
    expect(settings).toHaveLength(1);

    expect(media[0]?.id).toBe(showId);
    expect(episodes[0]?.id).toBe(episodeId);
    expect(watchHistory[0]?.episodeId).toBe(episodeId);

    expect(settings[0]).toMatchObject({
      key: "theme",
      value: "dark",
    });
  });
  it("restores a valid empty backup by clearing all current data", async () => {
    const showId = await mediaRepository.add(createTvShow());

    const episodeId = await episodeRepository.add(createEpisode(showId));

    await episodeRepository.markWatched(episodeId);

    await settingsRepository.set("theme", "dark");

    const emptyBackup = {
      format: "watch-log-v2-backup",
      version: 1,
      databaseVersion: 3,
      exportedAt: "2026-07-15T16:00:00.000Z",
      data: {
        media: [],
        episodes: [],
        watchHistory: [],
        settings: [],
      },
    };

    await backupService.restoreBackup(emptyBackup);

    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });
  it("rolls back the complete replacement when the restore transaction fails", async () => {
    const currentShowId = await mediaRepository.add(createTvShow());

    const currentEpisodeId = await episodeRepository.add(
      createEpisode(currentShowId),
    );

    await episodeRepository.markWatched(currentEpisodeId);

    await settingsRepository.set("theme", "current");

    const backup = {
      format: "watch-log-v2-backup",
      version: 1,
      databaseVersion: 3,
      exportedAt: "2026-07-15T16:00:00.000Z",
      data: {
        media: [
          {
            id: 41,
            tmdbId: 1396,
            mediaType: "tv",
            title: "Breaking Bad",
            userStatus: "watching",
            createdAt: "2026-07-15T00:00:00.000Z",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        episodes: [
          {
            id: 84,
            showId: 41,
            tmdbId: 62085,
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Pilot",
            watched: true,
            watchedAt: "2026-07-10T18:30:00.000Z",
            createdAt: "2026-07-15T00:00:00.000Z",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        watchHistory: [
          {
            id: 126,
            episodeId: 84,
            watchedAt: "2026-07-10T18:30:00.000Z",
            source: "manual",
            createdAt: "2026-07-15T00:00:00.000Z",
          },
        ],
        settings: [
          {
            key: "theme",
            value: () => "not cloneable",
            updatedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
      },
    };

    await expect(backupService.restoreBackup(backup)).rejects.toThrow();

    const media = await db.media.toArray();
    const episodes = await db.episodes.toArray();
    const watchHistory = await db.watchHistory.toArray();
    const settings = await db.settings.toArray();

    expect(media).toHaveLength(1);
    expect(episodes).toHaveLength(1);
    expect(watchHistory).toHaveLength(1);
    expect(settings).toHaveLength(1);

    expect(media[0]?.id).toBe(currentShowId);
    expect(episodes[0]?.id).toBe(currentEpisodeId);
    expect(watchHistory[0]?.episodeId).toBe(currentEpisodeId);

    expect(settings[0]).toMatchObject({
      key: "theme",
      value: "current",
    });
  });
});
