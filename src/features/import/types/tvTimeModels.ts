export interface FollowedTvShow {
  tv_show_id: string;
  tv_show_name: string;
  created_at: string;
  updated_at: string;
  active: string;
}

export interface TvTimeUser {
  timezone: string;
}

export interface UserTvShowData {
  user_id: string;
  tv_show_id: string;
  tv_show_name: string;
  is_followed: string;
  is_favorited: string;
  nb_episodes_seen: string;
}

export interface SeenEpisodeSource {
  episode_number: string;
  user_id: string;
  episode_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  episode_season_number: string;
}

/**
 * A tracking record from the TV Time export (GDPR export).
 * Used as the primary source for watched episodes when available.
 */
export interface TvTimeTrackingRecord {
  /** Unique identifier for the track (e.g., "watch-episode-123") */
  key: string;
  /** TV Time series name (e.g., "Breaking Bad") */
  series_name: string;
  /** TV Time show ID (e.g., "tvtime-breaking-bad") */
  s_id: string;
  /** TV Time episode ID (not a TMDB ID) */
  episode_id: string;
  /** Season number (1-indexed) */
  season_number: number;
  /** Episode number (1-indexed) */
  episode_number: number;
  /** Bulk type - "season" means this is a season-wide watch list */
  bulk_type: string;
  /** Original timestamp from the export (may need normalization) */
  created_at: string;
  /** Updated timestamp from the export */
  updated_at: string;
  /** Number of times this episode was watched (not used for duplication) */
  rewatch_count: number;
}

/**
 * A watched episode planned from the TV Time tracking export.
 * Used as the PRIMARY watched source when tracking-prod-records-v2.csv is present.
 */
export interface TvTimeTrackingWatchedEpisode {
  /** TV Time show id when the row could be joined to a candidate */
  tvTimeShowId?: string;
  /** TV Time show name (used for join key) */
  showTitle: string;
  /** Season number (1-indexed) */
  seasonNumber: number;
  /** Episode number (1-indexed) */
  episodeNumber: number;
  /** Watch instant (ISO 8601 datetime) */
  watchedAt: Date;
  /** Skipped reason if the row was not attributed (due to duplicate title, etc.) */
  skippedReason?: "duplicate-show-title";
}

export interface WatchedOnEpisode {
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  episode_season_number: string;
  episode_number: string;
  user_id: string;
  episode_id: string;
  watched_on_source_id: string;
}

export interface ShowSeenEpisodeLatest {
  tv_show_id: string;
  episode_id: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  user_id: string;
}

export interface SeenEpisodeLatest {
  episode_season_number: string;
  episode_number: string;
  user_id: string;
  episode_id: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
}
