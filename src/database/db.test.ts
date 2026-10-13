import Dexie, { type Table } from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  Collection,
  CollectionMedia,
  Episode,
  ImportHistory,
  Media,
  SmartCollectionDefinition,
  WatchHistory,
} from "../types";

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

class VersionFourDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  watchHistory!: Table<WatchHistory, number>;
  importHistory!: Table<ImportHistory, number>;
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

    this.version(4).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
    });
  }
}

class VersionFiveDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  watchHistory!: Table<WatchHistory, number>;
  importHistory!: Table<ImportHistory, number>;
  collections!: Table<Collection, number>;
  collectionMedia!: Table<CollectionMedia, number>;
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

    this.version(4).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
    });

    this.version(5).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
    });
  }
}

class VersionSixDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  watchHistory!: Table<WatchHistory, number>;
  importHistory!: Table<ImportHistory, number>;
  collections!: Table<Collection, number>;
  collectionMedia!: Table<CollectionMedia, number>;
  smartCollectionDefinitions!: Table<SmartCollectionDefinition, number>;
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

    this.version(4).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
    });

    this.version(5).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
    });

    this.version(6).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
      smartCollectionDefinitions: "++id, &collectionId, updatedAt",
    });
  }
}

class VersionSevenDatabase extends Dexie {
  media!: Table<Media, number>;
  episodes!: Table<Episode, number>;
  watchHistory!: Table<WatchHistory, number>;
  importHistory!: Table<ImportHistory, number>;
  collections!: Table<Collection, number>;
  collectionMedia!: Table<CollectionMedia, number>;
  smartCollectionDefinitions!: Table<SmartCollectionDefinition, number>;
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

    this.version(4).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
    });

    this.version(5).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
    });

    this.version(6).stores({
      media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
      episodes:
        "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "key",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
      smartCollectionDefinitions: "++id, &collectionId, updatedAt",
    });

    // Only the `watchHistory` index list differs from v6 (`mediaId` added);
    // every other store is repeated verbatim so no unrelated table changes.
    this.version(7)
      .stores({
        media: "++id, tmdbId, mediaType, userStatus, [tmdbId+mediaType]",
        episodes:
          "++id, showId, tmdbId, watched, [showId+tmdbId], [showId+seasonNumber+episodeNumber]",
        watchHistory:
          "++id, episodeId, watchedAt, source, mediaId, [episodeId+watchedAt]",
        settings: "key",
        importHistory: "++id, startedAt, completedAt, status, provider",
        collections: "++id, createdAt, updatedAt",
        collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
        smartCollectionDefinitions: "++id, &collectionId, updatedAt",
      })
      .upgrade(async (transaction) => {
        const episodeTable = transaction.table<Episode, number>("episodes");
        const mediaTable = transaction.table<Media, number>("media");
        const watchHistoryTable = transaction.table<WatchHistory, number>(
          "watchHistory",
        );

        const episodes = await episodeTable.toArray();
        const mediaRecords = await mediaTable.toArray();

        const showIdByEpisodeId = new Map<number, number>();

        for (const episode of episodes) {
          if (episode.id !== undefined) {
            showIdByEpisodeId.set(episode.id, episode.showId);
          }
        }

        const tvMediaIds = new Set<number>();

        for (const media of mediaRecords) {
          if (media.id !== undefined && media.mediaType === "tv") {
            tvMediaIds.add(media.id);
          }
        }

        const watchHistoryRows = await watchHistoryTable.toArray();

        const attributedRows: WatchHistory[] = [];

        for (const row of watchHistoryRows) {
          const resolvedShowId =
            row.episodeId === null
              ? undefined
              : showIdByEpisodeId.get(row.episodeId);

          if (resolvedShowId !== undefined && tvMediaIds.has(resolvedShowId)) {
            attributedRows.push({
              ...row,
              mediaId: resolvedShowId,
              mediaType: "tv",
            });
          }
        }

        const unresolvedCount =
          watchHistoryRows.length - attributedRows.length;

        await watchHistoryTable.bulkPut(attributedRows);

        if (unresolvedCount > 0) {
          console.warn(
            `WatchLog database v7 migration: ${unresolvedCount} of ${watchHistoryRows.length} legacy watch history rows could not be attributed to a show and were left without mediaId/mediaType.`,
          );
        }
      });
  }
}

afterEach(async () => {
  for (const databaseName of testDatabaseNames.splice(0)) {
    await Dexie.delete(databaseName);
  }
});

interface LegacyWatchHistorySeed {
  showOneId: number;
  showTwoId: number;
  movieId: number;
  episodeOneId: number;
  episodeTwoId: number;
  resolvableRowId: number;
  secondResolvableRowId: number;
  unresolvedRowId: number;
  episodeThreeId: number;
  orphanedShowRowId: number;
  now: Date;
  firstWatchedAt: Date;
  secondWatchedAt: Date;
  unresolvedWatchedAt: Date;
  orphanedShowWatchedAt: Date;
}

async function seedVersionSixWatchHistory(
  database: VersionSixDatabase,
): Promise<LegacyWatchHistorySeed> {
  const now = new Date("2026-07-15T00:00:00.000Z");
  const firstWatchedAt = new Date("2026-07-10T18:30:00.000Z");
  const secondWatchedAt = new Date("2026-07-11T21:45:00.000Z");
  const unresolvedWatchedAt = new Date("2026-07-12T09:15:00.000Z");
  const orphanedShowWatchedAt = new Date("2026-07-13T22:00:00.000Z");

  const showOneId = await database.media.add({
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
  });

  const showTwoId = await database.media.add({
    tmdbId: 1408,
    mediaType: "tv",
    title: "Better Call Saul",
    userStatus: "completed",
    createdAt: now,
    updatedAt: now,
  });

  const movieId = await database.media.add({
    tmdbId: 27205,
    mediaType: "movie",
    title: "Inception",
    userStatus: "planned",
    createdAt: now,
    updatedAt: now,
  });

  const episodeOneId = await database.episodes.add({
    showId: showOneId,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    watched: true,
    watchedAt: firstWatchedAt,
    createdAt: now,
    updatedAt: now,
  });

  const episodeTwoId = await database.episodes.add({
    showId: showTwoId,
    tmdbId: 719160,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Uno",
    watched: false,
    createdAt: now,
    updatedAt: now,
  });

  const episodeThreeId = await database.episodes.add({
    // No media record exists for this show id, so a watch row referencing
    // this episode cannot be attributed to a show during the migration.
    showId: 888888,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Orphaned episode",
    watched: false,
    createdAt: now,
    updatedAt: now,
  });

  const resolvableRowId = await database.watchHistory.add({
    episodeId: episodeOneId,
    watchedAt: firstWatchedAt,
    source: "manual",
    createdAt: now,
  });

  const secondResolvableRowId = await database.watchHistory.add({
    episodeId: episodeTwoId,
    watchedAt: secondWatchedAt,
    source: "import",
    createdAt: now,
  });

  const unresolvedRowId = await database.watchHistory.add({
    episodeId: 999999,
    watchedAt: unresolvedWatchedAt,
    source: "manual",
    createdAt: now,
  });

  const orphanedShowRowId = await database.watchHistory.add({
    episodeId: episodeThreeId,
    watchedAt: orphanedShowWatchedAt,
    source: "import",
    createdAt: now,
  });

  return {
    showOneId,
    showTwoId,
    movieId,
    episodeOneId,
    episodeTwoId,
    resolvableRowId,
    secondResolvableRowId,
    unresolvedRowId,
    episodeThreeId,
    orphanedShowRowId,
    now,
    firstWatchedAt,
    secondWatchedAt,
    unresolvedWatchedAt,
    orphanedShowWatchedAt,
  };
}

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

  it("upgrades a version 3 database to version 4 and creates the importHistory store", async () => {
    const databaseName = createTestDatabaseName();

    const versionThreeDatabase = new VersionThreeDatabase(databaseName);

    await versionThreeDatabase.open();

    expect(versionThreeDatabase.verno).toBe(3);

    const now = new Date("2026-07-15T00:00:00.000Z");

    await versionThreeDatabase.media.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    });

    await versionThreeDatabase.settings.put({
      key: "theme",
      value: "dark",
    });

    versionThreeDatabase.close();

    const versionFourDatabase = new VersionFourDatabase(databaseName);

    await versionFourDatabase.open();

    expect(versionFourDatabase.verno).toBe(4);

    expect(await versionFourDatabase.media.count()).toBe(1);
    const storedMedia = await versionFourDatabase.media
      .where("tmdbId")
      .equals(1396)
      .and((media) => media.mediaType === "tv")
      .first();
    expect(storedMedia).toMatchObject({ title: "Breaking Bad" });

    expect(await versionFourDatabase.watchHistory.count()).toBe(0);
    expect(await versionFourDatabase.settings.count()).toBe(1);

    expect(await versionFourDatabase.importHistory.count()).toBe(0);

    const importHistorySchema = versionFourDatabase.importHistory.schema;

    expect(
      importHistorySchema.indexes.some((index) => index.name === "startedAt"),
    ).toBe(true);
    expect(
      importHistorySchema.indexes.some((index) => index.name === "completedAt"),
    ).toBe(true);
    expect(
      importHistorySchema.indexes.some((index) => index.name === "status"),
    ).toBe(true);
    expect(
      importHistorySchema.indexes.some((index) => index.name === "provider"),
    ).toBe(true);

    versionFourDatabase.close();
  });

  it("upgrades a version 4 database to version 5 and creates the collections stores", async () => {
    const databaseName = createTestDatabaseName();

    const versionFourDatabase = new VersionFourDatabase(databaseName);

    await versionFourDatabase.open();

    expect(versionFourDatabase.verno).toBe(4);

    const now = new Date("2026-07-15T00:00:00.000Z");

    const showId = await versionFourDatabase.media.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    });

    const episodeId = await versionFourDatabase.episodes.add({
      showId,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: true,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      createdAt: now,
      updatedAt: now,
    });

    await versionFourDatabase.watchHistory.add({
      episodeId,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      source: "manual",
      createdAt: now,
    });

    await versionFourDatabase.settings.put({
      key: "theme",
      value: "dark",
    });

    versionFourDatabase.close();

    const versionFiveDatabase = new VersionFiveDatabase(databaseName);

    await versionFiveDatabase.open();

    expect(versionFiveDatabase.verno).toBe(5);

    // All existing v4 data survives the additive migration.
    const storedMedia = await versionFiveDatabase.media.get(showId);

    const storedEpisode = await versionFiveDatabase.episodes.get(episodeId);

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
      watched: true,
      watchedAt: new Date("2026-07-10T18:30:00.000Z"),
    });

    const watchHistoryEvents = await versionFiveDatabase.watchHistory.toArray();

    expect(watchHistoryEvents).toHaveLength(1);
    expect(watchHistoryEvents[0]).toMatchObject({
      episodeId,
      source: "manual",
    });

    expect(await versionFiveDatabase.settings.count()).toBe(1);
    expect(await versionFiveDatabase.importHistory.count()).toBe(0);

    // The new stores exist and start empty.
    expect(await versionFiveDatabase.collections.count()).toBe(0);
    expect(await versionFiveDatabase.collectionMedia.count()).toBe(0);

    const collectionsSchema = versionFiveDatabase.collections.schema;

    expect(
      collectionsSchema.indexes.some((index) => index.name === "createdAt"),
    ).toBe(true);
    expect(
      collectionsSchema.indexes.some((index) => index.name === "updatedAt"),
    ).toBe(true);

    const collectionMediaSchema =
      versionFiveDatabase.collectionMedia.schema;

    expect(
      collectionMediaSchema.indexes.some((index) => index.name === "collectionId"),
    ).toBe(true);
    expect(
      collectionMediaSchema.indexes.some((index) => index.name === "mediaId"),
    ).toBe(true);

    const compoundIndex = collectionMediaSchema.indexes.find(
      (index) =>
        Array.isArray(index.keyPath) &&
        index.keyPath.join("+") === "collectionId+mediaId",
    );

    expect(compoundIndex).toBeDefined();
    expect(compoundIndex?.unique).toBe(true);

    // Collections persist across close/reopen.
    await versionFiveDatabase.collections.add({
      name: "Favourites",
      createdAt: now,
      updatedAt: now,
    });

    versionFiveDatabase.close();

    const reopenedDatabase = new VersionFiveDatabase(databaseName);

    await reopenedDatabase.open();

    expect(await reopenedDatabase.collections.count()).toBe(1);

    expect((await reopenedDatabase.collections.toArray())[0]).toMatchObject({
      name: "Favourites",
    });

    reopenedDatabase.close();
  });

  it("upgrades a version 6 database to version 7 and backfills watch event attribution", async () => {
    const databaseName = createTestDatabaseName();

    const versionSixDatabase = new VersionSixDatabase(databaseName);

    await versionSixDatabase.open();

    expect(versionSixDatabase.verno).toBe(6);

    const seed = await seedVersionSixWatchHistory(versionSixDatabase);

    expect(await versionSixDatabase.watchHistory.count()).toBe(4);

    versionSixDatabase.close();

    const warnSpy = vi.spyOn(console, "warn");

    const versionSevenDatabase = new VersionSevenDatabase(databaseName);

    await versionSevenDatabase.open();

    expect(versionSevenDatabase.verno).toBe(7);

    // The unresolved count is reported deterministically: both the
    // missing-episode row and the missing-show row stay unattributed.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "2 of 4 legacy watch history rows could not be attributed",
      ),
    );

    const migratedRows = await versionSevenDatabase.watchHistory.toArray();

    // No row was created, deleted, or renumbered by the migration.
    expect(migratedRows).toHaveLength(4);

    const resolvableRow = migratedRows.find(
      (row) => row.id === seed.resolvableRowId,
    );

    expect(resolvableRow).toMatchObject({
      id: seed.resolvableRowId,
      episodeId: seed.episodeOneId,
      watchedAt: seed.firstWatchedAt,
      source: "manual",
      createdAt: seed.now,
      mediaId: seed.showOneId,
      mediaType: "tv",
    });

    const secondResolvableRow = migratedRows.find(
      (row) => row.id === seed.secondResolvableRowId,
    );

    expect(secondResolvableRow).toMatchObject({
      id: seed.secondResolvableRowId,
      episodeId: seed.episodeTwoId,
      watchedAt: seed.secondWatchedAt,
      source: "import",
      createdAt: seed.now,
      mediaId: seed.showTwoId,
      mediaType: "tv",
    });

    // A row whose episode does not exist is preserved verbatim and is not
    // fabricated into any media attribution.
    const unresolvedRow = migratedRows.find(
      (row) => row.id === seed.unresolvedRowId,
    );

    expect(unresolvedRow).toMatchObject({
      id: seed.unresolvedRowId,
      episodeId: 999999,
      watchedAt: seed.unresolvedWatchedAt,
      source: "manual",
      createdAt: seed.now,
    });
    expect(unresolvedRow?.mediaId).toBeUndefined();
    expect(unresolvedRow?.mediaType).toBeUndefined();

    // A row whose episode exists but whose show media record is missing is
    // likewise preserved verbatim and left unattributed.
    const orphanedShowRow = migratedRows.find(
      (row) => row.id === seed.orphanedShowRowId,
    );

    expect(orphanedShowRow).toMatchObject({
      id: seed.orphanedShowRowId,
      episodeId: seed.episodeThreeId,
      watchedAt: seed.orphanedShowWatchedAt,
      source: "import",
      createdAt: seed.now,
    });
    expect(orphanedShowRow?.mediaId).toBeUndefined();
    expect(orphanedShowRow?.mediaType).toBeUndefined();

    // No synthetic movie event exists for the movie library record, and no
    // migrated row claims a movie attribution.
    expect(
      migratedRows.every(
        (row) =>
          row.mediaId === undefined ||
          row.mediaId === seed.showOneId ||
          row.mediaId === seed.showTwoId,
      ),
    ).toBe(true);
    expect(migratedRows.some((row) => row.mediaType === "movie")).toBe(false);
    expect(await versionSevenDatabase.media.get(seed.movieId)).toMatchObject({
      mediaType: "movie",
    });

    // mediaId is indexed; mediaType is not; and no uniqueness or compound
    // index over mediaId exists (event identity stays a repository concept).
    const watchHistorySchema = versionSevenDatabase.watchHistory.schema;

    expect(
      watchHistorySchema.indexes.some((index) => index.name === "mediaId"),
    ).toBe(true);
    expect(
      watchHistorySchema.indexes.some((index) => index.name === "mediaType"),
    ).toBe(false);
    expect(
      watchHistorySchema.indexes.filter(
        (index) =>
          Array.isArray(index.keyPath) && index.keyPath.includes("mediaId"),
      ),
    ).toHaveLength(0);
    expect(watchHistorySchema.indexes.every((index) => !index.unique)).toBe(
      true,
    );

    // The pre-existing indexes are unchanged.
    for (const indexName of [
      "episodeId",
      "watchedAt",
      "source",
      "[episodeId+watchedAt]",
    ]) {
      expect(
        watchHistorySchema.indexes.some((index) => index.name === indexName),
      ).toBe(true);
    }

    // The upgraded database is readable through both the new mediaId index
    // and the legacy episodeId index.
    const showOneRows = await versionSevenDatabase.watchHistory
      .where("mediaId")
      .equals(seed.showOneId)
      .toArray();

    expect(showOneRows.map((row) => row.id)).toEqual([seed.resolvableRowId]);

    const episodeOneRows = await versionSevenDatabase.watchHistory
      .where("episodeId")
      .equals(seed.episodeOneId)
      .toArray();

    expect(episodeOneRows.map((row) => row.id)).toEqual([seed.resolvableRowId]);

    versionSevenDatabase.close();
  });

  it("does not re-run the version 7 backfill when an upgraded database is reopened", async () => {
    const databaseName = createTestDatabaseName();

    const versionSixDatabase = new VersionSixDatabase(databaseName);

    await versionSixDatabase.open();

    const seed = await seedVersionSixWatchHistory(versionSixDatabase);

    versionSixDatabase.close();

    const warnSpy = vi.spyOn(console, "warn");

    const firstOpen = new VersionSevenDatabase(databaseName);

    await firstOpen.open();

    expect(await firstOpen.watchHistory.count()).toBe(4);

    firstOpen.close();

    expect(warnSpy).toHaveBeenCalledTimes(1);

    const secondOpen = new VersionSevenDatabase(databaseName);

    await secondOpen.open();

    expect(secondOpen.verno).toBe(7);

    // Reopening at the same version must not re-run the upgrade: the
    // deterministic report stays at exactly one call and no row changes.
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const rowsAfterReopen = await secondOpen.watchHistory.toArray();

    expect(rowsAfterReopen).toHaveLength(4);

    const resolvableRow = rowsAfterReopen.find(
      (row) => row.id === seed.resolvableRowId,
    );

    expect(resolvableRow).toMatchObject({
      mediaId: seed.showOneId,
      mediaType: "tv",
    });

    const unresolvedRow = rowsAfterReopen.find(
      (row) => row.id === seed.unresolvedRowId,
    );

    expect(unresolvedRow?.mediaId).toBeUndefined();
    expect(unresolvedRow?.mediaType).toBeUndefined();

    const orphanedShowRow = rowsAfterReopen.find(
      (row) => row.id === seed.orphanedShowRowId,
    );

    expect(orphanedShowRow?.mediaId).toBeUndefined();
    expect(orphanedShowRow?.mediaType).toBeUndefined();

    secondOpen.close();
  });
});
