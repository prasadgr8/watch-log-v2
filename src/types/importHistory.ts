/**
 * Import history records describe a completed TV Time import run.
 *
 * History is a diagnostic/appetite log, not a watch-state source of truth:
 * it stores no foreign keys and its numbers are summary metadata only. The
 * `Media`, `Episode` and `WatchHistory` stores remain the only sources of
 * watch-state truth.
 */
export type ImportHistoryStatus = "completed" | "partial" | "failed";

export interface ImportHistory {
  id?: number;

  /** Import source identity; only "tv-time" exists today. */
  provider: "tv-time";

  /** Name of the ZIP the user selected. */
  sourceFileName: string;

  /** Resolved export timezone used to interpret watched timestamps. */
  timezone: string;

  /**
   * - "completed" → execution finished with zero execution failures.
   * - "partial"   → execution finished but at least one unit failed
   *                 (failedShows > 0 or failedWatchedEpisodes > 0).
   * - "failed"    → execution was refused or threw before completing; only
   *                 then is errorMessage present.
   */
  status: ImportHistoryStatus;

  startedAt: Date;

  completedAt: Date;

  /** Wall-clock duration of the execution phase. */
  durationMs: number;

  // Plan context (why the export did not map 1:1 to library changes).
  totalShows: number;
  newShows: number;
  existingShows: number;
  unmatchedShows: number;
  plannedWatchedEpisodes: number;
  warnings: string[];

  // Execution outcome (mirrors TvTimeImportResult).
  importedShows: number;
  skippedShows: number;
  failedShows: number;
  importedWatchedEpisodes: number;
  alreadyWatchedEpisodes: number;
  missingWatchedEpisodes: number;
  skippedWatchedEpisodes: number;
  failedWatchedEpisodes: number;

  /** Present only when status is "failed". */
  errorMessage?: string;
}

export type PersistedImportHistory = ImportHistory & {
  id: number;
};
