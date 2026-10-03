/**
 * Read-only facade for history-derived viewing activity.
 *
 * This service is the single boundary between persisted watch history and the
 * pure analytics domain. It does three things and nothing else:
 *
 * 1. Reads recorded watch events through `watchHistoryRepository` exactly
 *    ONCE per aggregation request.
 * 2. Maps persisted `PersistedWatchHistory` records into storage-independent
 *    `WatchActivityEvent` values, so the analytics domain never imports the
 *    Dexie-backed types.
 * 3. Delegates all computation to the pure functions in
 *    `src/domain/analytics/activity`.
 *
 * It deliberately contains no aggregation logic of its own: duplicating
 * arithmetic here would let the domain and the facade drift apart.
 *
 * Both public loaders share one read-map-derive path:
 * `loadWatchActivitySection` produces the combined `{ summary, timeline }`
 * snapshot from a single repository read, and `loadWatchActivity` is the
 * backward-compatible summary-only view of that same section.
 *
 * Boundaries honoured here:
 *
 * - Read-only. No writes, no transactions, no data mutation.
 * - Local-first and offline-first. The only data source is local IndexedDB.
 * - No network or cloud access.
 * - No clock. The caller chooses the granularity; nothing here depends on
 *   "now", so the same history always yields the same result.
 * - No UI logic and no presentation concerns.
 * - No caching, pagination, or speculative optimization: the repository read
 *   is the honest cost of the request.
 *
 * `statisticsService` remains the existing current-state facade and is not
 * modified or extended by this module.
 */

import { watchHistoryRepository } from "../../../database/repositories";
import type { PersistedWatchHistory } from "../../../types";
import { buildWatchActivitySection } from "../../../domain/analytics/activity";
import type {
  ViewingActivitySummary,
  WatchActivitySection,
} from "../../../domain/analytics/activity";
import type {
  AnalyticsPeriod,
  WatchActivityEvent,
} from "../../../domain/analytics/types";

/**
 * Projects persisted watch-history records onto the storage-independent
 * analytics event shape.
 *
 * Exported for focused mapping tests; it performs no I/O, so callers may reuse
 * it on records already in memory.
 */
export function toWatchActivityEvents(
  events: readonly PersistedWatchHistory[],
): WatchActivityEvent[] {
  return events.map((event) => ({
    id: event.id,
    episodeId: event.episodeId,
    watchedAt: event.watchedAt,
    source: event.source,
  }));
}

/**
 * Loads summary and timeline as ONE consistent snapshot for a period.
 *
 * Reads `watchHistory` exactly once, maps the persisted records onto
 * storage-independent domain events, and derives BOTH the
 * `ViewingActivitySummary` and the gap-free `WatchActivityTimelineProjection`
 * from that single in-memory snapshot, so the two halves can never disagree
 * the way independent reads could. Read-only and clock-free: no writes, no
 * network access, no caching or memoization.
 */
export async function loadWatchActivitySection(
  period: AnalyticsPeriod,
): Promise<WatchActivitySection> {
  const watchHistoryEvents = await watchHistoryRepository.getAll();

  return buildWatchActivitySection(
    toWatchActivityEvents(watchHistoryEvents),
    period,
  );
}

/**
 * Loads the full recorded watch history and derives a viewing-activity summary.
 *
 * A backward-compatible view over `loadWatchActivitySection`: the summary is
 * derived through the same single-read section path instead of a parallel
 * aggregation, so its semantics cannot drift from the combined snapshot.
 *
 * Reads `watchHistory` exactly once per call. The returned values are
 * history-derived: they describe recorded events that are still present, so
 * they differ from the current-state `Episode`-cache values exposed by
 * `statisticsService` (see the durability notes in
 * `src/domain/analytics/types.ts`).
 */
export async function loadWatchActivity(
  period: AnalyticsPeriod,
): Promise<ViewingActivitySummary> {
  const section = await loadWatchActivitySection(period);

  return section.summary;
}
