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
 * `loadWatchActivitySection` produces the combined `{ summary, timeline,
 * trends }` snapshot from a single repository read, and `loadWatchActivity`
 * is the backward-compatible summary-only view of that same section.
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
import { buildWatchActivityTrends } from "../../../domain/analytics/trends";
import type { WatchActivityTrends } from "../../../domain/analytics/trends";
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
 * A `WatchActivitySection` composed with A28 recorded-activity trends.
 *
 * Extends the shipped A27 section rather than changing it, so every existing
 * consumer of `WatchActivitySection` — including the Statistics page — keeps
 * working unchanged. The three halves are derived from ONE mapped event
 * snapshot, so the summary, the timeline, and the trends can never describe
 * different reads of `watchHistory`.
 *
 * PRESENTATION NAMING CONVENTION (A28)
 *
 * The domain keeps precise, technically accurate names. The eventual
 * Statistics UI presents them using the concise vocabulary below, under the
 * section heading "Viewing Activity":
 *
 *   activePeriodCount                    -> Active
 *   inactivePeriodCount                  -> Inactive
 *   latestConsecutiveActivePeriods       -> Current Run
 *   longestConsecutiveActivePeriods      -> Longest Run
 *   periodOverPeriod                     -> Change
 *   periodOverPeriod.previousEventCount  -> Previous
 *   periodOverPeriod.currentEventCount   -> Current
 *   "recorded activity"                  -> Activity
 *
 * This mapping is PRESENTATION-ONLY: no domain field, analytics function, or
 * service API is renamed to shorten a UI term. "Activity" never becomes
 * "Watched", because `WatchHistory` is not a complete lifetime viewing ledger
 * (unwatching deletes rows, a manual re-watch need not create another event,
 * TV Time import can collapse duplicates, and the store is episode-based and
 * does not represent movies). Where explanation is needed, the supporting copy
 * is "Consecutive periods with recorded activity."
 */
export interface WatchActivitySectionWithTrends extends WatchActivitySection {
  /** Recorded-activity trends derived from the same snapshot as the rest. */
  readonly trends: WatchActivityTrends;
}

/**
 * Loads summary, timeline, and trends as ONE consistent snapshot for a period.
 *
 * Reads `watchHistory` exactly once, maps the persisted records ONCE onto
 * storage-independent domain events, and derives the
 * `ViewingActivitySummary`, the gap-free `WatchActivityTimelineProjection`, and
 * the A28 `WatchActivityTrends` from that single in-memory snapshot, so the
 * three parts can never disagree the way independent reads could.
 *
 * The service performs no analytics of its own: it composes the pure domain
 * builders, and the trends' arithmetic lives exclusively in
 * `buildWatchActivityTrends`. The timeline's 120-bucket presentation cap stays
 * isolated to the timeline projection and is not applied to the trends.
 *
 * Read-only and clock-free: no writes, no network access, no caching or
 * memoization.
 */
export async function loadWatchActivitySection(
  period: AnalyticsPeriod,
): Promise<WatchActivitySectionWithTrends> {
  const watchHistoryEvents = await watchHistoryRepository.getAll();
  const events = toWatchActivityEvents(watchHistoryEvents);

  return {
    ...buildWatchActivitySection(events, period),
    trends: buildWatchActivityTrends(events, period),
  };
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
