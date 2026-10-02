import { db } from "../db";

import type { PersistedWatchHistory, WatchHistory } from "../../types";

/**
 * Total order for historical watch-history reads: chronological by watched
 * time, tie-broken by ascending id.
 *
 * Watched times are not unique (two events can share a timestamp, e.g. a bulk
 * mark-watched or an import), so the id tie-breaker makes the ordering total
 * and therefore deterministic across calls.
 */
function compareByWatchedAtThenId(
  firstEvent: PersistedWatchHistory,
  secondEvent: PersistedWatchHistory,
): number {
  const watchedAtDifference =
    firstEvent.watchedAt.getTime() - secondEvent.watchedAt.getTime();

  if (watchedAtDifference !== 0) {
    return watchedAtDifference;
  }

  return firstEvent.id - secondEvent.id;
}

/*
 * Historical read access for watch-history-derived analytics.
 *
 * Both reads resolve against the existing `watchHistory` store and its
 * existing `watchedAt` index, so no schema change and no write path is
 * involved. `getRange` is half-open, `[from, to)`, so consecutive ranges
 * compose without double-counting a boundary event.
 */
async function readHistoricalRange(
  events: WatchHistory[],
): Promise<PersistedWatchHistory[]> {
  return (events as PersistedWatchHistory[]).sort(compareByWatchedAtThenId);
}

export const watchHistoryRepository = {
  async add(watchHistory: WatchHistory): Promise<number> {
    return db.watchHistory.add(watchHistory);
  },

  async getByEpisode(episodeId: number): Promise<PersistedWatchHistory[]> {
    const watchHistoryEvents = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();

    return watchHistoryEvents.sort(
      (firstEvent, secondEvent) =>
        firstEvent.watchedAt.getTime() - secondEvent.watchedAt.getTime(),
    ) as PersistedWatchHistory[];
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
   */
  async getRange(from: Date, to: Date): Promise<PersistedWatchHistory[]> {
    if (from.getTime() >= to.getTime()) {
      return [];
    }

    const watchHistoryEvents = await db.watchHistory
      .where("watchedAt")
      .between(from, to, true, false)
      .toArray();

    return readHistoricalRange(watchHistoryEvents);
  },
};
