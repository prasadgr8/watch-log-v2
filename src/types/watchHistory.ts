export type WatchHistorySource = "manual" | "import";

/**
 * The kind of media a watch event is recorded against.
 *
 * A persisted watch event is unified: it can describe a single watched TV
 * episode or a watched movie. `mediaType` makes a movie event self-describing
 * (a movie has no episode, so it carries `episodeId: null`), which is why the
 * type is persisted rather than inferred from `episodeId` at read time.
 */
export type WatchHistoryMediaType = "tv" | "movie";

export interface WatchHistory {
  id?: number;
  /**
   * The watched TV episode this event refers to, or `null` for a movie event.
   *
   * Legacy rows written before the unified model always carry a numeric episode
   * id. A movie event has no episode, so it carries `null`. Dexie does not index
   * `null` values, so movie events simply never appear in the `episodeId` /
   * `[episodeId+watchedAt]` indexes, which is correct.
   */
  episodeId: number | null;
  /**
   * The library title (media id) this event is recorded against.
   *
   * REQUIRED for every NEW unified watch event (the owning TV show's media id
   * for an episode event, or the movie's media id for a movie event). It is
   * optional on the persisted shape only so legacy rows predating the unified
   * model can be migrated additively: a legacy row whose episode → show → media
   * relationship cannot be resolved is a migration/reconciliation exception and
   * may remain without a `mediaId`, which is NOT a normal valid new-event
   * state. See `src/domain/analytics/types.ts` for the domain boundary.
   */
  mediaId?: number;
  /**
   * The media kind of the event: `"tv"` for an episode event, `"movie"` for a
   * movie event. Persisted so a movie event is self-describing. Optional on the
   * persisted shape for the same additive-legacy reason as `mediaId`.
   */
  mediaType?: WatchHistoryMediaType;
  watchedAt: Date;
  source: WatchHistorySource;
  createdAt: Date;
}

export type PersistedWatchHistory = WatchHistory & {
  id: number;
};
