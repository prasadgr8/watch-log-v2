import { importHistoryRepository } from "../../../database/repositories";
import type { ImportHistory, ImportHistoryStatus } from "../../../types";

import type { TvTimeImportResult } from "./tvTimeImportService";
import type { TvTimeImportPlan } from "../types/tvTimeImportPlan";

/**
 * History is a diagnostic log persisted at the same mutation boundary as the
 * import itself (executeTvTimeImportPlan). It is metadata-only: no ZIP or CSV
 * payloads are stored, it holds no foreign keys, and it is never a source of
 * watch-state truth.
 */

function isCompleted(result: TvTimeImportResult | null): boolean {
  if (result === null) {
    return false;
  }

  return result.failedShows === 0 && result.failedWatchedEpisodes === 0;
}

function deriveStatus(
  result: TvTimeImportResult | null,
  error: Error | undefined,
): ImportHistoryStatus {
  if (error !== undefined || result === null) {
    return "failed";
  }

  return isCompleted(result) ? "completed" : "partial";
}

function coerceCount(value: number | undefined): number {
  return value ?? 0;
}

/**
 * Builds the import-history record from the read-only plan and the execution
 * result. Pure: never touches IndexedDB.
 */
export function buildImportHistoryRecord(args: {
  plan: TvTimeImportPlan;
  result: TvTimeImportResult | null;
  startedAt: Date;
  completedAt: Date;
  error?: Error;
}): ImportHistory {
  const { plan, result, startedAt, completedAt, error } = args;
  const status = deriveStatus(result, error);

  return {
    provider: "tv-time",
    sourceFileName: plan.sourceFileName ?? "",
    timezone: plan.timezone,
    status,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    totalShows: plan.summary.totalShows,
    newShows: plan.summary.newShows,
    existingShows: plan.summary.existingShows,
    unmatchedShows: plan.summary.unmatchedShows,
    plannedWatchedEpisodes: plan.summary.plannedWatchedEpisodes,
    warnings: plan.warnings,
    importedShows: coerceCount(result?.importedShows),
    skippedShows: coerceCount(result?.skippedShows),
    failedShows: coerceCount(result?.failedShows),
    importedWatchedEpisodes: coerceCount(result?.importedWatchedEpisodes),
    alreadyWatchedEpisodes: coerceCount(result?.alreadyWatchedEpisodes),
    missingWatchedEpisodes: coerceCount(result?.missingWatchedEpisodes),
    skippedWatchedEpisodes: coerceCount(result?.skippedWatchedEpisodes),
    failedWatchedEpisodes: coerceCount(result?.failedWatchedEpisodes),
    errorMessage: error instanceof Error ? error.message : undefined,
  };
}

/**
 * Persists a single import-history record. Failures are logged and swallowed:
 * history is instrumentation-grade and must never fail or block an import,
 * exactly mirroring the progress-observer isolation contract.
 */
export async function persistTvTimeImportHistory(args: {
  plan: TvTimeImportPlan;
  result: TvTimeImportResult | null;
  startedAt: Date;
  completedAt: Date;
  error?: Error;
}): Promise<void> {
  const record = buildImportHistoryRecord(args);

  try {
    await importHistoryRepository.add(record);
  } catch (persistError) {
    console.error("Failed to persist import history", persistError);
  }
}
