import Dexie, { type EntityTable, type Table } from "dexie";

import type {
  AppSetting,
  Collection,
  CollectionMedia,
  Episode,
  ImportHistory,
  Media,
  SmartCollectionDefinition,
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
  smartCollectionDefinitions!: EntityTable<
    SmartCollectionDefinition,
    "id"
  >;

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

    // Version 6 is additive-only: it introduces the Smart Collection
    // definition store and changes no existing records, so no upgrade
    // callback is required. The unique collectionId index enforces
    // "at most one definition per collection" at the database level.
    this.version(6).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
      settings: "&key, updatedAt",
      importHistory: "++id, startedAt, completedAt, status, provider",
      collections: "++id, createdAt, updatedAt",
      collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
      smartCollectionDefinitions: "++id, &collectionId, updatedAt",
    });

    // Version 7 introduces the unified watch-event model: a `watchHistory`
    // event can now describe a watched TV episode OR a watched movie. The
    // migration is additive and backward-compatible:
    //
    // - `episodeId` is widened to allow `null` (a movie event has no episode).
    // - `mediaId` and `mediaType` are added; a `mediaId` index is created.
    // - Every existing (legacy) row is preserved verbatim on `id`, `episodeId`,
    //   `watchedAt`, `source`, and `createdAt`; the migration only ADDS the new
    //   attribution fields where they can be resolved.
    //
    // For a legacy TV row, `mediaId` is derived from `episodeId -> Episode.showId`
    // and `mediaType` is set to "tv". A row whose episode -> show -> media chain
    // cannot be resolved is a migration/reconciliation exception: it is kept
    // unchanged and simply left without a `mediaId`/`mediaType` rather than
    // being fabricated or deleted. The unresolved count is deterministic.
    //
    // No movie events are created, no IDs are renumbered, and no uniqueness
    // constraint is introduced (the `(mediaId, episodeId, watchedAt)` identity
    // is a future repository-level concept, not a database constraint).
    this.version(7)
      .stores({
        media:
          "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
        episodes:
          "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
        watchHistory: "++id, episodeId, watchedAt, source, mediaId, [episodeId+watchedAt]",
        settings: "&key, updatedAt",
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

        // Single bounded local read of each dependency, mapped in memory, so the
        // migration performs no per-row queries (no N+1) and stays fully
        // offline. `showIdByEpisodeId` maps an episode to its owning show; the
        // set of TV media ids confirms the owning show really is a TV title.
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

          // A resolvable legacy TV row: attribute it to its owning show. An
          // unresolvable row is left exactly as-is (no `mediaId`/`mediaType`),
          // never fabricated and never deleted.
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

        // `bulkPut` keys on the persisted `id`, so this updates each existing
        // row in place: `id`, `episodeId`, `watchedAt`, `source`, and
        // `createdAt` are carried through unchanged. Unresolved rows are simply
        // not included, so they remain present and untouched.
        await watchHistoryTable.bulkPut(attributedRows);

        // Deterministic migration report: every unattributed legacy row is
        // counted (and never fabricated), so operators and tests can observe
        // exactly how many exceptions the backfill left behind.
        if (unresolvedCount > 0) {
          console.warn(
            `WatchLog database v7 migration: ${unresolvedCount} of ${watchHistoryRows.length} legacy watch history rows could not be attributed to a show and were left without mediaId/mediaType.`,
          );
        }
      });
  }
}

export const db = new WatchLogDatabase();
