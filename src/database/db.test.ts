import Dexie, { type Table } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import type { Episode, Media, WatchHistory } from "../types";

interface TestSetting {
  key: string;
  value: unknown;
}

const testDatabaseNames: string[] = [];

function createTestDatabaseName(): string {
  const databaseName = `WatchLogMigrationTest-${crypto.randomUUID()}`;

  testDatabaseNames.push(databaseName);

  return databaseName;
}

class VersionOneDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  settings!: Table<TestSetting, string>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(1).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes: "++id, showId, watched, [showId+seasonNumber+episodeNumber]",
      settings: "key",
    });
  }
}

class VersionTwoDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  settings!: Table<TestSetting, string>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(1).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes: "++id, showId, watched, [showId+seasonNumber+episodeNumber]",
      settings: "key",
    });

    this.version(2).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      settings: "key",
    });
  }
}

class VersionThreeDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  watchHistory!: Table<WatchHistory, number>;
  settings!: Table<TestSetting, string>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(1).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes: "++id, showId, watched, [showId+seasonNumber+episodeNumber]",
      settings: "key",
    });

    this.version(2).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      settings: "key",
    });

    this.version(3)
      .stores({
        media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
        episodes:
          "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
        watchHistory:
          "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
        settings: "key",
      })
      .upgrade(async (transaction) => {
        const watchedEpisodes = await transaction
          .table<Episode, number>("episodes")
          .filter(
            (episode) =>
              episode.watched &&
              episode.watchedAt !== undefined &&
              episode.id !== undefined,
          )
          .toArray();

        const migrationCreatedAt = new Date();

        await transaction.table<WatchHistory, number>("watchHistory").bulkAdd(
          watchedEpisodes.map((episode) => ({
            episodeId: episode.id as number,
            watchedAt: episode.watchedAt as Date,
            source: "manual",
            createdAt: migrationCreatedAt,
          })),
        );
      });
  }
}

afterEach(async () => {
  for (const databaseName of testDatabaseNames.splice(0)) {
    await Dexie.delete(databaseName);
  }
});

describe("WatchLogDatabase schema migration", () => {
  it("upgrades a version 1 database to version 2 without losing existing data", async () => {
    const databaseName = createTestDatabaseName();

    const versionOneDatabase = new VersionOneDatabase(databaseName);

    await versionOneDatabase.open();

    const now = new Date("2026-07-15T00:00:00.000Z");

    const showId = await versionOneDatabase.media.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    });

    const episodeId = await versionOneDatabase.episodes.add({
      showId,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: true,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      createdAt: now,
      updatedAt: now,
    });

    await versionOneDatabase.settings.put({
      key: "theme",
      value: "dark",
    });

    versionOneDatabase.close();

    const versionTwoDatabase = new VersionTwoDatabase(databaseName);

    await versionTwoDatabase.open();

    expect(versionTwoDatabase.verno).toBe(2);

    const storedMedia = await versionTwoDatabase.media.get(showId);

    const storedEpisode = await versionTwoDatabase.episodes.get(episodeId);

    const storedSetting = await versionTwoDatabase.settings.get("theme");

    expect(storedMedia).toMatchObject({
      id: showId,
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
    });

    expect(storedEpisode).toMatchObject({
      id: episodeId,
      showId,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: true,
    });

    expect(storedEpisode?.watchedAt).toEqual(
      new Date("2026-07-10T18:30:00.000Z"),
    );

    expect(storedSetting).toEqual({
      key: "theme",
      value: "dark",
    });

    const episodeSchema = versionTwoDatabase.episodes.schema;

    expect(episodeSchema.indexes.some((index) => index.name === "tmdbId")).toBe(
      true,
    );

    expect(
      episodeSchema.indexes.some((index) => index.name === "[showId+tmdbId]"),
    ).toBe(true);

    expect(
      episodeSchema.indexes.some(
        (index) => index.name === "[showId+seasonNumber+episodeNumber]",
      ),
    ).toBe(true);

    versionTwoDatabase.close();
  });

  it("upgrades a version 2 database to version 3 and backfills watched episode history", async () => {
    const databaseName = createTestDatabaseName();

    const versionTwoDatabase = new VersionTwoDatabase(databaseName);

    await versionTwoDatabase.open();

    const now = new Date("2026-07-15T00:00:00.000Z");

    const watchedAt = new Date("2026-07-10T18:30:00.000Z");

    const showId = await versionTwoDatabase.media.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    });

    const watchedEpisodeId = await versionTwoDatabase.episodes.add({
      showId,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: true,
      watchedAt,
      createdAt: now,
      updatedAt: now,
    });

    const unwatchedEpisodeId = await versionTwoDatabase.episodes.add({
      showId,
      tmdbId: 62086,
      seasonNumber: 1,
      episodeNumber: 2,
      title: "Cat's in the Bag...",
      watched: false,
      createdAt: now,
      updatedAt: now,
    });

    versionTwoDatabase.close();

    const versionThreeDatabase = new VersionThreeDatabase(databaseName);

    await versionThreeDatabase.open();

    expect(versionThreeDatabase.verno).toBe(3);

    const storedWatchedEpisode =
      await versionThreeDatabase.episodes.get(watchedEpisodeId);

    const storedUnwatchedEpisode =
      await versionThreeDatabase.episodes.get(unwatchedEpisodeId);

    expect(storedWatchedEpisode).toMatchObject({
      id: watchedEpisodeId,
      watched: true,
      watchedAt,
    });

    expect(storedUnwatchedEpisode).toMatchObject({
      id: unwatchedEpisodeId,
      watched: false,
    });

    const watchHistoryEvents =
      await versionThreeDatabase.watchHistory.toArray();

    expect(watchHistoryEvents).toHaveLength(1);

    expect(watchHistoryEvents[0]).toMatchObject({
      episodeId: watchedEpisodeId,
      watchedAt,
      source: "manual",
    });

    expect(watchHistoryEvents[0]?.id).toBeGreaterThan(0);
    expect(watchHistoryEvents[0]?.createdAt).toBeInstanceOf(Date);

    const watchHistorySchema = versionThreeDatabase.watchHistory.schema;

    expect(
      watchHistorySchema.indexes.some((index) => index.name === "episodeId"),
    ).toBe(true);

    expect(
      watchHistorySchema.indexes.some((index) => index.name === "watchedAt"),
    ).toBe(true);

    expect(
      watchHistorySchema.indexes.some((index) => index.name === "source"),
    ).toBe(true);

    expect(
      watchHistorySchema.indexes.some(
        (index) => index.name === "[episodeId+watchedAt]",
      ),
    ).toBe(true);

    versionThreeDatabase.close();
  });
});
