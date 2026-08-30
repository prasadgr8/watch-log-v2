import type { TmdbTvSearchResult } from "../../../services/tmdb";
import type { ValidationResult } from "../services/tvTimeValidator";
import type { ImportCandidate } from "./importCandidate";

/**
 * A single TV Time show classified during planning.
 *
 * - "new"       → execution must create a library record for tmdbShow.
 * - "existing"  → the show is already in the library; execution must not
 *                 create a duplicate and should synchronize episodes against
 *                 the existing record instead.
 * - "unmatched" → no confident TMDB match (or matching failed); execution
 *                 counts it as a failed/skipped show without writing.
 *
 * "new"/"existing" entries may additionally carry a `review` envelope when
 * ranking was too close to call automatically, and a `resolution` once the
 * user has made an explicit decision.
 */
export type TvTimePlannedShow =
  | {
        kind: "new";
        candidate: ImportCandidate;
        tmdbShow: TmdbTvSearchResult;
        review?: TvTimeMatchReview;
        resolution?: TvTimeMatchDecision;
    }
  | {
        kind: "existing";
        candidate: ImportCandidate;
        tmdbShow: TmdbTvSearchResult;
        /** Library record id of the already-existing show. */
        existingMediaId: number;
        /** TMDB id of the existing library record. */
        existingTmdbId: number;
        /** Existing records are never reviewable: picking another candidate
         * would create a duplicate library entry. */
        review?: undefined;
        resolution?: TvTimeMatchDecision;
    }
  | {
      kind: "unmatched";
      candidate: ImportCandidate;
      review?: undefined;
      resolution?: undefined;
    };

/** One TMDB candidate considered during matching, ranked best-first. */
export interface TvTimeMatchCandidate {
  tmdbShow: TmdbTvSearchResult;

  /** Scorer output for this candidate; higher is better. */
  score: number;
}

/**
 * Flags a matched show whose top-two ranking was too close to resolve
 * automatically. `candidates[0]` is the planner's recommended default.
 */
export interface TvTimeMatchReview {
  status: "needs-review";

  reason: "multiple-plausible";

  /** Score of the recommended default candidate. */
  bestScore: number;

  /** Ranked best-first; may be longer than what the UI displays. */
  candidates: TvTimeMatchCandidate[];
}

/** An explicit user decision for a show flagged for review. */
export type TvTimeMatchDecision =
  | { decision: "use"; tmdbId: number }
  | { decision: "skip" };

/** Review decisions keyed by the stable TV Time show id. */
export type TvTimeImportResolutions = Record<string, TvTimeMatchDecision>;

/** Why a planned watched row will be skipped during execution. */
export type TvTimeWatchedRowSkipReason = "duplicate-show-title";

/**
 * A watched episode planned from seen_episode_source.csv.
 *
 * Identity is expressed with TV Time source fields plus the parsed,
 * timezone-aware watch instant. The numeric episode/library IDs are resolved
 * during execution because new shows do not exist until they are created.
 */
export interface TvTimePlannedWatchedEpisode {
  /** TV Time show id when the row could be joined to a candidate. */
  tvTimeShowId?: string;

  /** TV Time show name — the join key used by the importer. */
  showTitle: string;

  seasonNumber: number;

  episodeNumber: number;

  /** Watch instant resolved through the export timezone. */
  watchedAt: Date;

  /**
   * Set when the row cannot be safely attributed (currently: the TV Time
   * export contains multiple shows sharing this title). Skipped rows are
   * counted as skippedWatchedEpisodes instead of being silently attributed.
   */
  skippedReason?: TvTimeWatchedRowSkipReason;
}

export interface TvTimeImportPlanSummary {
  totalShows: number;

  newShows: number;

  existingShows: number;

  unmatchedShows: number;

  /**
   * Watched rows that were successfully planned (parsed + classified).
   * Rows whose title matches no planned show are still listed; the executor
   * skips them, mirroring the previous in-memory map behavior.
   */
  plannedWatchedEpisodes: number;

  /** Watched rows rejected while planning (e.g. invalid timestamps). */
  invalidWatchedEpisodes: number;

  /**
   * Watched rows auto-skipped because their TV Time title matched multiple
   * planned shows, making safe attribution impossible.
   */
  duplicateTitleWatchedEpisodes: number;
}

/**
 * A complete description of what executing a TV Time import will change.
 *
 * Building this plan performs network reads (TMDB) and IndexedDB reads only —
 * it never mutates IndexedDB. executeTvTimeImportPlan() is the single
 * mutation boundary that consumes it.
 */
export interface TvTimeImportPlan {
  provider: "tv-time";

  /** Name of the ZIP the user selected; absent only when a plan was not built
   * from a File (e.g. hand-rolled test plans). */
  sourceFileName?: string;

  validation: ValidationResult;

  /** Resolved export timezone used to interpret watched timestamps. */
  timezone: string;

  shows: TvTimePlannedShow[];

  watchedEpisodes: TvTimePlannedWatchedEpisode[];

  warnings: string[];

  summary: TvTimeImportPlanSummary;
}

/** Execution stages that can honestly report completed/total units. */
export type TvTimeImportProgressPhase = "shows" | "watched-episodes";

/**
 * Real-work progress for executeTvTimeImportPlan(). Emitted synchronously per
 * unit; every outcome (success/skip/failure) advances its phase counter.
 * Season-level synchronization is intentionally not represented because the
 * number of seasons is unknown until TMDB responds.
 */
export interface TvTimeImportProgress {
  phase: TvTimeImportProgressPhase;

  /** Units fully processed within the active phase. */
  current: number;

  /** Total units in the active phase. */
  total: number;

  /** TV Time title currently being processed; present only during "shows". */
  currentShowTitle?: string;
}

/** Optional execution hooks consumed by the mutation boundary only. */
export interface TvTimeImportCallbacks {
  /** Receives progress events until the returned promise settles. */
  onProgress?: (progress: TvTimeImportProgress) => void;
}
