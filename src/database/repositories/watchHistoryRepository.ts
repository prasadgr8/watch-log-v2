import { db } from "../db";

import type {
  MovieWatchEvent,
  TvWatchEvent,
} from "../../domain/analytics/types";
import type { PersistedWatchHistory, WatchHistory } from "../../types";

import { compareWatchEvents } from "../../domain/analytics/watchPeriods";

/**
 * A unified watch event accepted by `recordWatchEvent`: the domain's writer
 * contract for a TV or movie event (see `src/domain/analytics/types.ts`)
 * plus the instant the recording itself happened.
 *
 * `id` is deliberately NOT part of this shape: everything passed here is a
 * NEW event, so the database assigns the primary key and a caller can never
 * collide with an existing row.
 */
export type NewWatchEvent = (TvWatchEvent | MovieWatchEvent) & {
  readonly createdAt: Date;
};

/**
 * Outcome of `recordWatchEvent`.
 *
 * - `created: true` — no event with this canonical identity existed, and
 *   `event` is the newly persisted row.
 * - `created: false` — an event with the same canonical identity
 *   (`mediaId`, `episodeId`, `watchedAt`) already existed, nothing was
 *   written, and `event` is the pre-existing row. `source` is intentionally
 *   NOT part of the identity, so a repeated recording never overwrites the
 *   original source.
 */
export interface RecordWatchEventResult {
  event: PersistedWatchHistory;
  created: boolean;
}

/** True for a real `Date` carrying a finite timestamp (rejects `Invalid Date`). */
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/*
 * Runtime validation for NEW unified events. The compile-time `NewWatchEvent`
 * contract already forbids these states, but the write API is the last gate
 * before persistence, so every invariant is re-checked here in the project's
 * established `throw new Error(...)` style. Legacy/unattributed rows remain a
 * read-only concept: this gate never lets a new event be written without full
 * attribution.
 */
function assertValidNewWatchEvent(event: NewWatchEvent): void {
  const { mediaId, mediaType, episodeId, watchedAt, source, createdAt } = event;

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    throw new Error("Invalid watch event: mediaId must be a positive integer.");
  }

  if (mediaType !== "tv" && mediaType !== "movie") {
    throw new Error('Invalid watch event: mediaType must be "tv" or "movie".');
  }

  if (mediaType === "tv") {
    if (!Number.isInteger(episodeId) || episodeId <= 0) {
      throw new Error(
        "Invalid watch event: TV events require a numeric episodeId.",
      );
    }
  } else if (episodeId !== null) {
    throw new Error(
      "Invalid watch event: movie events require a null episodeId.",
    );
  }

  if (!isValidDate(watchedAt)) {
    throw new Error("Invalid watch event: watchedAt must be a valid Date.");
  }

  if (source !== "manual" && source !== "import") {
    throw new Error('Invalid watch event: source must be "manual" or "import".');
  }

  if (!isValidDate(createdAt)) {
    throw new Error("Invalid watch event: createdAt must be a valid Date.");
  }
}

/*
 * Localized duplicate lookup for the canonical event identity
 * `(mediaId, episodeId, watchedAt)`.
 *
 * The v7 schema deliberately has NO uniqueness index and NO `mediaId`-based
 * index (both were deferred by design), so this narrows with the indexes that
 * do exist and filters the small candidate set in memory:
 *
 * - A TV event resolves through the existing `[episodeId+watchedAt]` compound
 *   index, so the candidates are only the rows for that episode at that exact
 *   instant.
 * - A movie event carries `episodeId: null`, which IndexedDB does not index
 *   (`null` is not a valid key), so it resolves through the existing
 *   `watchedAt` index instead: only the rows sharing the exact watched
 *   instant.
 *
 * Both paths are indexed lookups — never a full-table scan — and the local
 * filter is O(k) in the handful of rows that share the same watched instant
 * (a bulk import can stamp many rows with one instant; k is bounded by that
 * instant's rows, not by table size). `source` is never consulted: it is not
 * part of the identity. A legacy/unattributed row carries no `mediaId`, so
 * its identity tuple can never equal an attributed event's tuple; it stays
 * fully readable but is never mistaken for a duplicate of a new event.
 */
async function findCanonicalDuplicate(
  event: NewWatchEvent,
): Promise<PersistedWatchHistory | undefined> {
  if (event.episodeId === null) {
    const candidates = await db.watchHistory
      .where("watchedAt")
      .equals(event.watchedAt)
      .toArray();

    return (candidates as PersistedWatchHistory[]).find(
      (row) => row.mediaId === event.mediaId && row.episodeId === null,
    );
  }

  const candidates = await db.watchHistory
    .where("[episodeId+watchedAt]")
    .equals([event.episodeId, event.watchedAt])
    .toArray();

  return (candidates as PersistedWatchHistory[]).find(
    (row) => row.mediaId === event.mediaId,
  );
}

/*
 * Historical read access for watch-history-derived analytics.
 *
 * Reads resolve against the existing `watchHistory` store and its existing
 * indexes, so no schema change is involved. `getRange` is half-open,
 * `[from, to)`, so consecutive ranges compose without double-counting a
 * boundary event.
 *
 * Every read is ordered by the domain's canonical `compareWatchEvents`
 * comparator (Step 2.4), so repository reads and analytics aggregation agree
 * on which event is "first" and no repository-specific ordering semantics
 * are reintroduced.
 */
async function readHistoricalRange(
  events: WatchHistory[],
): Promise<PersistedWatchHistory[]> {
  return (events as PersistedWatchHistory[]).sort(compareWatchEvents);
}

export const watchHistoryRepository = {
  async add(watchHistory: WatchHistory): Promise<number> {
    return db.watchHistory.add(watchHistory);
  },

  /**
   * Records a NEW unified watch event with canonical idempotency.
   *
   * Validation runs first and throws BEFORE anything touches the database,
   * so an invalid event can never leave a partial row behind. The duplicate
   * check and the insert then run inside ONE read-write transaction over the
   * `watchHistory` store only, so the write is atomic, retry-safe, and never
   * touches another table: IndexedDB serializes overlapping read-write
   * transactions on the same store, which makes a repeated (or concurrently
   * recorded) canonical event resolve to the existing row instead of
   * creating a duplicate.
   *
   * Duplicate identity is exactly `(mediaId, episodeId, watchedAt)` —
   * `source` is NOT part of it; see `findCanonicalDuplicate` for the index
   * strategy. Distinct `watchedAt` instants remain distinct events, so the
   * capability exists to represent a rewatch, but this method adds NO new
   * rewatch behavior and never modifies or deletes existing rows.
   */
  async recordWatchEvent(
    event: NewWatchEvent,
  ): Promise<RecordWatchEventResult> {
    assertValidNewWatchEvent(event);

    return db.transaction("rw", db.watchHistory, async () => {
      const existingEvent = await findCanonicalDuplicate(event);

      if (existingEvent !== undefined) {
        return { event: existingEvent, created: false };
      }

      // Field-by-field construction (never a spread of the caller's object),
      // so no caller-supplied `id` or stray property can leak into the row.
      const row: WatchHistory = {
        mediaId: event.mediaId,
        mediaType: event.mediaType,
        episodeId: event.episodeId,
        watchedAt: event.watchedAt,
        source: event.source,
        createdAt: event.createdAt,
      };

      const id = await db.watchHistory.add(row);

      return { event: { ...row, id }, created: true };
    });
  },

  async getByEpisode(episodeId: number): Promise<PersistedWatchHistory[]> {
    const watchHistoryEvents = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    // Canonical domain ordering (watchedAt -> episodeId -> mediaId -> id);
    // within a single episode the episode/media tiers are constant, so this
    // collapses to the historical watchedAt -> id order.
    return (watchHistoryEvents as PersistedWatchHistory[]).sort(
      compareWatchEvents,
    );
  },

  async getLatestByEpisode(
    episodeId: number,
  ): Promise<PersistedWatchHistory | undefined> {
    const watchHistoryEvents =
      await watchHistoryRepository.getByEpisode(episodeId);

    return watchHistoryEvents.at(-1);
  },

  async removeByEpisode(episodeId: number): Promise<void> {
    await db.watchHistory.where("episodeId").equals(episodeId).delete();
  },

  async count(): Promise<number> {
    return db.watchHistory.count();
  },

  /**
   * Every persisted watch-history event, ordered chronologically.
   *
   * Read-only historical access for watch-history analytics. Ordering is
   * deterministic (watchedAt, then id) and independent of IndexedDB key order,
   * so two reads of the same data always produce the same sequence.
   *
   * This is the unfiltered history; callers that only need a slice should
   * prefer `getRange` to avoid loading every event.
   */
  async getAll(): Promise<PersistedWatchHistory[]> {
    const watchHistoryEvents = await db.watchHistory.toArray();

    return readHistoricalRange(watchHistoryEvents);
  },

  /**
   * Events whose watchedAt falls in the half-open interval `[from, to)`.
   *
   * `from` is inclusive and `to` is exclusive, so adjacent ranges partition
   * the timeline without double-counting an event that lands exactly on a
   * boundary. The bounds are resolved through the existing `watchedAt` index.
   *
   * An inverted range (`from` at or after `to`) is empty by definition rather
   * than an error, so callers can pass unsorted bounds without special-casing.
   * A non-`Date` or invalid-`Date` bound is rejected the same way — an empty
   * result, never an IndexedDB `DataError` — so invalid input handling stays
   * consistent with the inverted-range convention.
   */
  async getRange(from: Date, to: Date): Promise<PersistedWatchHistory[]> {
    if (
      !isValidDate(from) ||
      !isValidDate(to) ||
      from.getTime() >= to.getTime()
    ) {
      return [];
    }

    const watchHistoryEvents = await db.watchHistory
      .where("watchedAt")
      .between(from, to, true, false)
      .toArray();

    return readHistoricalRange(watchHistoryEvents);
  },
};
