import Dexie, { type EntityTable, type Table } from "dexie";

import type {
  AppSetting,
  Collection,
  CollectionMedia,
  Episode,
  ImportHistory,
  Media,
  WatchHistory,
} from "../types";

export class WatchLogDatabase extends Dexie {
  media!: EntityTable<Media, "id">;
  episodes!: EntityTable<Episode, "id">;
  watchHistory!: Table<WatchHistory, number>;
  settings!: EntityTable<AppSetting, "key">;
  importHistory!: Table<ImportHistory, number>;
  collections!: EntityTable<Collection, "id">;
  collectionMedia!: Table<CollectionMedia, number>;

  constructor() {
    super("WatchLogV2");

    this.version(1).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      settings: "&key, updatedAt",
    });

    this.version(2).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      settings: "&key, updatedAt",
    });

    this.version(3)
      .stores({
        media:
          "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
        episodes:
          "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
        watchHistory:
          "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
        settings: "&key, updatedAt",
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
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "&key, updatedAt",
      importHistory: "++id, startedAt, completedAt, status, provider",
    });

    // Version 5 is additive-only: it introduces the custom collections stores
    // and changes no existing records, so no upgrade callback is required.
    // The unique compound index makes "a collection contains a media item at
    // most once" a database-level invariant.
    this.version(5).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "&key, updatedAt",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
    });
  }
}

export const db = new WatchLogDatabase();
