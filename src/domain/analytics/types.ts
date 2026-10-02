/**
 * Pure watch-activity analytics domain types.
 *
 * This module defines the vocabulary that watch-history analytics is derived
 * into: the calendar periods a viewing activity can be bucketed by, and the
 * shapes describing a bucket of watch events and a run of them.
 *
 * These types are deliberately storage-, repository-, and UI-free:
 *
 * - The `WatchHistory` store stays the single source of watch-event truth.
 *   Analytics never persists derived values, so nothing here is a persisted
 *   record and there is no analytics IndexedDB store behind these shapes.
 * - Event identity is carried structurally (`episodeId` + `watchedAt` +
 *   `source`) rather than by importing the Dexie-backed `WatchHistory` type,
 *   so analytics can be computed from any source of events (repository reads,
 *   exports, or in-test fixtures) without importing persistence code.
 * - No React, no rendering, and no formatting concerns live in this module.
 *   Presentation of these shapes is a separate, later concern.
 *
 * Every shape is `readonly`: analytics is a read-only projection over
 * historical data and must not let a consumer mutate the source records.
 */

import type { WatchHistorySource } from "../../types/watchHistory";

export type { WatchHistorySource };

/**
 * Calendar granularity of a watch-activity bucket.
 *
 * These are the approved grouping granularities for watch-history analytics.
 * The set is closed on purpose: adding a granularity is a deliberate contract
 * change, not an incidental one, because each value implies different
 * aggregation semantics and a different set of calendar boundaries.
 */
export type AnalyticsPeriod = "day" | "week" | "month" | "year";

/**
 * Structural minimum a record must satisfy to be counted as a watch event.
 *
 * `PersistedWatchHistory` satisfies this structurally, as do in-test fixtures
 * and future export shapes. Keeping the contract minimal means the analytics
 * domain stays independent of the persistence layer.
 */
export interface WatchActivityEvent {
  /** The watched episode this event refers to. */
  readonly episodeId: number;
  /**
   * Instant the episode was watched. This is the only temporal input to
   * analytics; grouping is always derived from this value.
   */
  readonly watchedAt: Date;
  /** How the event was recorded. */
  readonly source: WatchHistorySource;
}

/**
 * A run of watch events that share one calendar period.
 *
 * `periodStart`/`periodEnd` are the inclusive/exclusive boundaries of the
 * bucket in local calendar terms, so a bucket can be relabelled or filtered
 * without recomputing it from the events.
 */
export interface WatchActivityBucket {
  /** The granularity this bucket aggregates. */
  readonly period: AnalyticsPeriod;
  /** Inclusive start of the bucket's calendar period. */
  readonly periodStart: Date;
  /** Exclusive end of the bucket's calendar period. */
  readonly periodEnd: Date;
  /** Number of watch events in the bucket. */
  readonly eventCount: number;
  /**
   * Distinct episodes watched in the bucket.
   *
   * Deliberately separate from `eventCount`: re-watching or re-importing an
   * episode adds events without adding a newly-watched title, matching the
   * documented hybrid watch-state model.
   */
  readonly distinctEpisodeCount: number;
}

/**
 * A deterministically ordered sequence of activity buckets.
 *
 * Buckets are sorted ascending by `periodStart` with no gaps filled, so the
 * series reflects only periods that actually contain watch events.
 */
export interface WatchActivityTimeline {
  readonly period: AnalyticsPeriod;
  readonly buckets: readonly WatchActivityBucket[];
  /** Total events across every bucket in the timeline. */
  readonly totalEventCount: number;
  /** Distinct episodes watched across the whole timeline. */
  readonly totalDistinctEpisodeCount: number;
  /** Earliest watched instant in the timeline, if any. */
  readonly firstWatchedAt?: Date;
  /** Latest watched instant in the timeline, if any. */
  readonly lastWatchedAt?: Date;
}
