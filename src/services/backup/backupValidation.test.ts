import { describe, expect, it } from "vitest";

import {
  BackupValidationError,
  validateAndHydrateBackup,
} from "./backupValidation";

function createValidBackup(): unknown {
  return {
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
          value: "dark",
          updatedAt: "2026-07-15T00:00:00.000Z",
        },
      ],
    },
  };
}

function getBackupData(backup: unknown): {
  media: Record<string, unknown>[];
  episodes: Record<string, unknown>[];
  watchHistory: Record<string, unknown>[];
  settings: Record<string, unknown>[];
} {
  return (
    backup as {
      data: {
        media: Record<string, unknown>[];
        episodes: Record<string, unknown>[];
        watchHistory: Record<string, unknown>[];
        settings: Record<string, unknown>[];
      };
    }
  ).data;
}

describe("validateAndHydrateBackup", () => {
  it("validates the backup and hydrates ISO timestamps as Dates", () => {
    const restoreData = validateAndHydrateBackup(createValidBackup());

    expect(restoreData.media).toHaveLength(1);
    expect(restoreData.episodes).toHaveLength(1);
    expect(restoreData.watchHistory).toHaveLength(1);
    expect(restoreData.settings).toHaveLength(1);

    expect(restoreData.media[0]?.createdAt).toBeInstanceOf(Date);
    expect(restoreData.media[0]?.updatedAt).toBeInstanceOf(Date);
    expect(restoreData.episodes[0]?.watchedAt).toBeInstanceOf(Date);
    expect(restoreData.watchHistory[0]?.watchedAt).toBeInstanceOf(Date);
    expect(restoreData.settings[0]?.updatedAt).toBeInstanceOf(Date);

    expect(restoreData.episodes[0]).toMatchObject({
      id: 84,
      showId: 41,
      watched: true,
    });

    expect(restoreData.watchHistory[0]).toMatchObject({
      id: 126,
      episodeId: 84,
      source: "manual",
    });
  });

  it("rejects a non-object backup", () => {
    expect(() => validateAndHydrateBackup(null)).toThrow(BackupValidationError);

    expect(() => validateAndHydrateBackup("backup")).toThrow(
      "backup must be an object.",
    );
  });

  it("rejects an unsupported backup format", () => {
    const backup = createValidBackup() as Record<string, unknown>;

    backup.format = "another-application";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Unsupported backup format.",
    );
  });

  it("rejects an unsupported backup version", () => {
    const backup = createValidBackup() as Record<string, unknown>;

    backup.version = 2;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Unsupported backup version.",
    );
  });

  it("rejects an unsupported database version", () => {
    const backup = createValidBackup() as Record<string, unknown>;

    backup.databaseVersion = 2;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Unsupported backup database version.",
    );
  });
  it("accepts the current database version 4", () => {
    const backup = createValidBackup() as Record<string, unknown>;

    backup.databaseVersion = 4;

    const validated = validateAndHydrateBackup(backup);

    expect(validated.media).toHaveLength(1);
    expect(validated.episodes).toHaveLength(1);
  });

  it("accepts backups exported before importHistory (database version 3)", () => {
    const backup = createValidBackup() as Record<string, unknown>;

    backup.databaseVersion = 3;

    const validated = validateAndHydrateBackup(backup);

    expect(validated.media).toHaveLength(1);
    expect(validated.episodes).toHaveLength(1);
  });

  it("rejects malformed store collections", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    (
      backup as {
        data: Record<string, unknown>;
      }
    ).data.episodes = "episodes";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "data.episodes must be an array.",
    );

    expect(data.media).toHaveLength(1);
  });

  it("rejects invalid ISO timestamps", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.episodes[0]!.watchedAt = "July 10, 2026";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "data.episodes[0].watchedAt must be an ISO-8601 UTC timestamp.",
    );
  });

  it("rejects duplicate media IDs", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.media.push({
      ...data.media[0],
      title: "Duplicate",
    });

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "media contains duplicate IDs.",
    );
  });

  it("rejects duplicate episode IDs", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.episodes.push({
      ...data.episodes[0],
      title: "Duplicate",
    });

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "episodes contains duplicate IDs.",
    );
  });

  it("rejects duplicate watch history IDs", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.watchHistory.push({
      ...data.watchHistory[0],
    });

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "watchHistory contains duplicate IDs.",
    );
  });

  it("rejects duplicate setting keys", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.settings.push({
      ...data.settings[0],
    });

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "settings contains duplicate keys.",
    );
  });

  it("rejects an episode that references missing media", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.episodes[0]!.showId = 999;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Episode 84 references missing media 999.",
    );
  });

  it("rejects an episode that references a movie", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.media[0]!.mediaType = "movie";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Episode 84 must reference a TV show.",
    );
  });

  it("rejects watch history that references a missing episode", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.watchHistory[0]!.episodeId = 999;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "Watch history 126 references missing episode 999.",
    );
  });

  it("rejects invalid enum values", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.watchHistory[0]!.source = "sync";

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "data.watchHistory[0].source must be one of: manual, import.",
    );
  });

  it("rejects invalid primary keys", () => {
    const backup = createValidBackup();
    const data = getBackupData(backup);

    data.media[0]!.id = 0;

    expect(() => validateAndHydrateBackup(backup)).toThrow(
      "data.media[0].id must be a positive integer.",
    );
  });
});
