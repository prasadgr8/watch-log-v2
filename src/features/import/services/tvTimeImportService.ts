import { episodeRepository, mediaRepository } from "../../../database/repositories";
import {
  mapTmdbResultToMedia,
} from "../../../services/tmdb";
import { libraryService } from "../../library/services/libraryService";
import { readTvTimeZip } from "./tvTimeZipReader";
import { validateTvTimeFiles } from "./tvTimeValidator";
import { parseCsvFromZip } from "./tvTimeCsvParser";
import { buildImportCandidates } from "./tvTimeCandidateBuilder";
import {
  getTvTimeMatchReview,
  resolveTvTimeMatch,
} from "./tvdbMatcher";
import { synchronizeTvTimeShowEpisodes } from "./tvTimeEpisodeImporter";
import { persistTvTimeImportHistory } from "./tvTimeImportHistoryService";
import { parseTvTimeDate, resolveTvTimeZone } from "./tvTimeZone";
import type {
  TvTimeImportCallbacks,
  TvTimeImportPlan,
  TvTimeImportProgress,
  TvTimeImportResolutions,
  TvTimePlannedShow,
  TvTimePlannedWatchedEpisode,
} from "../types/tvTimeImportPlan";
import type {
  FollowedTvShow,
  SeenEpisodeSource,
  TvTimeUser,
  UserTvShowData,
} from "../types/tvTimeModels";

export interface TvTimeImportResult {
  importedShows: number;
  /**
   * Shows intentionally not imported: no confident TMDB match (unmatched),
   * already present in the library, or skipped by the user during review.
   */
  skippedShows: number;
  /**
   * Shows that hit an actual execution failure: database failure, TMDB
   * synchronization failure during execution, media creation failure, or
   * another thrown error.
   */
  failedShows: number;
  /** Watched rows that changed an unwatched episode to watched. */
  importedWatchedEpisodes: number;
  /**
   * Watched rows whose target episode was already watched locally. Nothing is
   * written for them; the local watchedAt always wins (markWatchedFromImport
   * returns false).
   */
  alreadyWatchedEpisodes: number;
  /**
   * Watched rows whose target episode (showId, seasonNumber, episodeNumber)
   * does not exist locally after episode synchronization (EPISODE_MISSING).
   * Missing episodes are never created and never receive watch history; they
   * are accounted for explicitly instead of being silently skipped.
   */
  missingWatchedEpisodes: number;
  /** Watched rows that could not be resolved or attributed. */
  skippedWatchedEpisodes: number;
  /** Watched rows rejected during planning or failing during execution. */
  failedWatchedEpisodes: number;
  /**
   * Per-show outcome detail captured during execution. One entry is produced
   * for each planned show that reaches classification. Transient only:
   * ImportHistory remains aggregate/metadata-only.
   */
  shows: TvTimeImportShowOutcome[];
}

/**
 * Granular per-show outcome for the detailed import report. Exactly one
 * entry is emitted per planned show that reaches execution classification.
 */
export interface TvTimeImportShowOutcome {
  /** Stable TV Time show id from the export. */
  tvTimeShowId: string;
  /** TV Time display title (as it appeared in the export). */
  title: string;
  /** Matched TMDB show id, when a match was resolved. */
  tmdbId?: number;
  /** Matched TMDB show name, when a match was resolved. */
  tmdbName?: string;
  /** The show-level classification captured during execution. */
  outcome:
    | "imported"
    | "already-existed"
    | "skipped"
    | "unmatched"
    | "failed";
  /**
   * Human-readable reason for skipped/unmatched/failed outcomes where the
   * existing execution path provides one. No raw stack traces are exposed.
   */
  reason?: string;
}

/**
 * Builds a complete, read-only description of what importing a TV Time export
 * would change.
 *
 * Performs ZIP reading, validation, CSV parsing, timezone resolution,
 * candidate construction, TMDB matching and watched-episode planning. It may
 * perform network reads (TMDB) and IndexedDB reads, but it MUST NOT mutate
 * IndexedDB: no media creation, no episode synchronization, no watch-history
 * writes, no deletion/rollback. That is exclusively
 * executeTvTimeImportPlan().
 */
export async function buildTvTimeImportPlan(
  file: File,
): Promise<TvTimeImportPlan> {
  const zipData = await readTvTimeZip(file);

  const validation = validateTvTimeFiles(zipData.fileNames);

  if (!validation.valid) {
    throw new Error(
      `Invalid TV Time export. Missing files: ${validation.missing.join(", ")}`,
    );
  }

  const shows = await parseCsvFromZip<FollowedTvShow>(
    zipData.zip,
    "followed_tv_show.csv",
  );

  const progress = await parseCsvFromZip<UserTvShowData>(
    zipData.zip,
    "user_tv_show_data.csv",
  );

  const seenEpisodes = await parseCsvFromZip<SeenEpisodeSource>(
    zipData.zip,
    "seen_episode_source.csv",
  );

  const users = await parseCsvFromZip<TvTimeUser>(zipData.zip, "user.csv");

  const timezone = resolveTvTimeZone(users[0]?.timezone ?? "");

  const candidates = buildImportCandidates(shows, progress);

  const plannedShows: TvTimePlannedShow[] = [];

  const warnings: string[] = [];

  for (const candidate of candidates) {
    try {
      const resolution = await resolveTvTimeMatch(candidate);

      if (!resolution) {
        plannedShows.push({
          kind: "unmatched",
          candidate,
        });

        continue;
      }

      if (resolution.existingMedia) {
        plannedShows.push({
          kind: "existing",
          candidate,
          tmdbShow: resolution.tmdbShow,
          existingMediaId: resolution.existingMedia.id,
          existingTmdbId: resolution.tmdbShow.id,
        });

        continue;
      }

      // Only brand-new matches are reviewable: choosing a different
      // candidate for an already-existing record would create duplicates.
      const review =
        getTvTimeMatchReview(resolution.rankedCandidates) ?? undefined;

      plannedShows.push({
        kind: "new",
        candidate,
        tmdbShow: resolution.tmdbShow,
        ...(review ? { review } : {}),
      });
    } catch (matchingError) {
      console.error(
        `Failed to match TV Time show: ${candidate.title}`,
        matchingError,
      );

      warnings.push(`Failed to match TV Time show: ${candidate.title}`);

      plannedShows.push({
        kind: "unmatched",
        candidate,
      });
    }
  }

  /*
   * seen_episode_source.csv carries only tv_show_name, so when two planned
   * shows share a title their watched rows cannot be safely attributed.
   * Flag those rows instead of silently attributing them to one show.
   */
  const executableTitleCounts = new Map<string, number>();

  for (const plannedShow of plannedShows) {
    if (plannedShow.kind === "unmatched") {
      continue;
    }

    const title = plannedShow.candidate.title;

    executableTitleCounts.set(title, (executableTitleCounts.get(title) ?? 0) + 1);
  }

  const duplicateTitles = new Set(
    [...executableTitleCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([title]) => title),
  );

  let duplicateTitleWatchedEpisodes = 0;

  const tvTimeShowIdByTitle = new Map(
    candidates.map((candidate) => [candidate.title, candidate.tvTimeShowId]),
  );

  const watchedEpisodes: TvTimePlannedWatchedEpisode[] = [];

  let invalidWatchedEpisodes = 0;

  for (const seenEpisode of seenEpisodes) {
    try {
      const duplicateSkipped = duplicateTitles.has(seenEpisode.tv_show_name);

      watchedEpisodes.push({
        tvTimeShowId: tvTimeShowIdByTitle.get(seenEpisode.tv_show_name),
        showTitle: seenEpisode.tv_show_name,
        seasonNumber: Number(seenEpisode.episode_season_number),
        episodeNumber: Number(seenEpisode.episode_number),
        watchedAt: parseTvTimeDate(seenEpisode.created_at, timezone),
        skippedReason: duplicateSkipped
          ? "duplicate-show-title"
          : undefined,
      });

      if (duplicateSkipped) {
        duplicateTitleWatchedEpisodes++;
      }
    } catch (watchedError) {
      console.error(
        `Invalid watched timestamp for: ${seenEpisode.tv_show_name} ` +
          `S${seenEpisode.episode_season_number}E${seenEpisode.episode_number}`,
        watchedError,
      );

      warnings.push(
        `Invalid watched timestamp for: ${seenEpisode.tv_show_name} ` +
          `S${seenEpisode.episode_season_number}E${seenEpisode.episode_number}`,
      );

      invalidWatchedEpisodes++;
    }
  }

  if (duplicateTitles.size > 0) {
    warnings.push(
      `Duplicate TV Time titles detected (${[...duplicateTitles].join(", ")}); ` +
        `${duplicateTitleWatchedEpisodes} matching watched episodes will be skipped because they cannot be safely attributed.`,
    );
  }

  return {
    provider: "tv-time",
    sourceFileName: file.name,
    validation,
    timezone,
    shows: plannedShows,
    watchedEpisodes,
    warnings,
    summary: {
      totalShows: plannedShows.length,
      newShows: plannedShows.filter((show) => show.kind === "new").length,
      existingShows: plannedShows.filter((show) => show.kind === "existing")
        .length,
      unmatchedShows: plannedShows.filter((show) => show.kind === "unmatched")
        .length,
      plannedWatchedEpisodes: watchedEpisodes.length,
      invalidWatchedEpisodes,
      duplicateTitleWatchedEpisodes,
    },
  };
}

/**
 * Produces a NEW plan with user review decisions materialized.
 *
 * Pure: reads nothing, writes nothing, never mutates the input plan.
 *
 * - "use"  → the planned show's tmdbShow is swapped to the selected
 *            candidate so execution needs no further resolution.
 * - "skip" → the show is marked; execution will not create or modify it,
 *            and its watched rows fall through to skippedWatchedEpisodes.
 * - no decision → the entry keeps its review envelope. The executor refuses
 *                 such entries as defense-in-depth; the UI requires an
 *                 explicit decision before enabling Import.
 */
export function applyImportResolutions(
  plan: TvTimeImportPlan,
  resolutions: TvTimeImportResolutions,
): TvTimeImportPlan {
  const shows = plan.shows.map((show): TvTimePlannedShow => {
    if (show.kind === "unmatched" || !show.review) {
      return show;
    }

    const decision = resolutions[show.candidate.tvTimeShowId];

    if (!decision) {
      return show;
    }

    if (decision.decision === "skip") {
      return { ...show, resolution: decision };
    }

    const selected = show.review.candidates.find(
      (candidate) => candidate.tmdbShow.id === decision.tmdbId,
    );

    if (!selected) {
      throw new Error(
        `Resolved TMDB id ${decision.tmdbId} is not a candidate for TV Time show "${show.candidate.title}".`,
      );
    }

    return {
      ...show,
      tmdbShow: selected.tmdbShow,
      resolution: decision,
    };
  });

  return { ...plan, shows };
}

/**
 * Public mutation boundary for a TV Time import. Delegates the real work to
 * executeTvTimeImportPlanCore and records a durable import-history entry for
 * every run, capturing completion status (completed / partial / failed) and,
 * on failure, the error that escaped the core executor.
 *
 * History persistence is best-effort and isolated: a failure to record history
 * never alters the returned result and never masks an import error, mirroring
 * the existing progress-observer isolation contract.
 */
export async function executeTvTimeImportPlan(
  plan: TvTimeImportPlan,
  callbacks?: TvTimeImportCallbacks,
): Promise<TvTimeImportResult> {
  const startedAt = new Date();

  try {
    const result = await executeTvTimeImportPlanCore(plan, callbacks);

    await persistTvTimeImportHistory({
      plan,
      result,
      startedAt,
      completedAt: new Date(),
    });

    return result;
  } catch (error) {
    await persistTvTimeImportHistory({
      plan,
      result: null,
      startedAt,
      completedAt: new Date(),
      error: error as Error,
    });

    throw error;
  }
}

/**
 * Mutation boundary for a TV Time import. Consumes a plan that already
 * contains resolved TMDB matches and never re-runs matching. An optional
 * callbacks object receives real-work progress; omitting it preserves the
 * previous behavior exactly. Progress observer failures are logged and
 * swallowed: reporting can never abort execution, trigger rollback, or
 * alter counters or the returned result.
 */
async function executeTvTimeImportPlanCore(
  plan: TvTimeImportPlan,
  callbacks?: TvTimeImportCallbacks,
): Promise<TvTimeImportResult> {
  const { onProgress } = callbacks ?? {};

  // Progress reporting is instrumentation, not part of the mutation boundary.
  // A throwing observer is isolated here so it cannot abort the import loop,
  // skip counter updates, or corrupt the returned result.
  const emitProgress = (progress: TvTimeImportProgress): void => {
    try {
      onProgress?.(progress);
    } catch (error) {
      // Deliberate swallow: observers are passive consumers with no recovery
      // path back into the import.
      console.error("TV Time import progress observer failed", error);
    }
  };

  // Mirrors the previous in-memory mediaByTitle map: keyed by the TV Time
  // show name so seen-episode rows can be joined to their library record.
  const mediaIdByTitle = new Map<string, number>();

  let importedShows = 0;
  let skippedShows = 0;
  let failedShows = 0;
  let processedShows = 0;

  // Per-show outcome detail for the detailed import report (transient only).
  const showOutcomes: TvTimeImportShowOutcome[] = [];

  for (const entry of plan.shows) {
    // Defense-in-depth: an unresolved review must never reach execution.
    // Thrown OUTSIDE the per-entry handler on purpose — a caller that
    // bypasses UI gating fails loudly instead of receiving a partial import.
    if (entry.review && !entry.resolution) {
      throw new Error(
        `Unresolved TV Time match review for "${entry.candidate.title}" (${entry.candidate.tvTimeShowId}).`,
      );
    }

    // Start-of-unit: surfaces which TV Time title is being worked on before
    // any network/IndexedDB work begins.
    emitProgress({
      phase: "shows",
      current: processedShows,
      total: plan.shows.length,
      currentShowTitle: entry.candidate.title,
    });

    try {
      if (entry.kind === "unmatched") {
        // No confident TMDB match: the show cannot safely be imported, so it
        // is skipped. This is not an execution failure; failedShows stays
        // reserved for thrown errors (database, synchronization, creation).
        skippedShows++;
        showOutcomes.push({
          tvTimeShowId: entry.candidate.tvTimeShowId,
          title: entry.candidate.title,
          outcome: "unmatched",
          reason: "No confident TMDB match found during planning",
        });
      } else if (entry.resolution?.decision === "skip") {
        skippedShows++;
        showOutcomes.push({
          tvTimeShowId: entry.candidate.tvTimeShowId,
          title: entry.candidate.title,
          tmdbId: entry.tmdbShow.id,
          tmdbName: entry.tmdbShow.name,
          outcome: "skipped",
        });
      } else {
        const tmdbId =
          entry.kind === "new" ? entry.tmdbShow.id : entry.existingTmdbId;

        // Re-check at execution time: planning is read-only, so it cannot see
        // records created earlier in this same batch (e.g. two TV Time entries
        // resolving to the same show). This keeps uniqueness without a second
        // matching pass.
        const existingMedia = await mediaRepository.getByTmdbId(tmdbId, "tv");

        let mediaId: number;
        let isNewlyCreated: boolean;

        if (existingMedia === undefined || existingMedia.id === undefined) {
          mediaId = await libraryService.addMedia(
            mapTmdbResultToMedia(entry.tmdbShow, {
              userStatus: entry.candidate.watchStatus,
            }),
          );

          isNewlyCreated = true;
        } else {
          mediaId = existingMedia.id;

          isNewlyCreated = false;
        }

        mediaIdByTitle.set(entry.candidate.title, mediaId);

        try {
          await synchronizeTvTimeShowEpisodes(mediaId, tmdbId);
        } catch (syncError) {
          if (isNewlyCreated) {
            await mediaRepository.remove(mediaId);
          }

          throw syncError;
        }

        if (isNewlyCreated) {
          importedShows++;
          showOutcomes.push({
            tvTimeShowId: entry.candidate.tvTimeShowId,
            title: entry.candidate.title,
            tmdbId: entry.tmdbShow.id,
            tmdbName: entry.tmdbShow.name,
            outcome: "imported",
          });
        } else {
          skippedShows++;
          showOutcomes.push({
            tvTimeShowId: entry.candidate.tvTimeShowId,
            title: entry.candidate.title,
            tmdbId: entry.tmdbShow.id,
            tmdbName: entry.tmdbShow.name,
            outcome: "already-existed",
          });
        }
      }
    } catch (error) {
      console.error(`Failed to import TV Time show: ${entry.candidate.title}`, error);

      failedShows++;
      showOutcomes.push({
        tvTimeShowId: entry.candidate.tvTimeShowId,
        title: entry.candidate.title,
        ...(entry.kind !== "unmatched"
          ? {
              tmdbId: entry.tmdbShow.id,
              tmdbName: entry.tmdbShow.name,
            }
          : {}),
        outcome: "failed",
        reason: "Import failed during execution",
      });
    }

    processedShows += 1;

    // Emitted after the handler so failures advance progress like any other
    // outcome instead of stalling the indicator.
    emitProgress({
      phase: "shows",
      current: processedShows,
      total: plan.shows.length,
    });
  }

  let importedWatchedEpisodes = 0;

  // Episodes already watched locally; their watch state is preserved untouched.
  let alreadyWatchedEpisodes = 0;

  // EPISODE_MISSING: rows whose target episode does not exist locally after
  // synchronization. They are never created and never receive history.
  let missingWatchedEpisodes = 0;

  let skippedWatchedEpisodes = 0;
  let processedWatchedEpisodes = 0;

  // Rows rejected during planning were never applied; count them as failed.
  let failedWatchedEpisodes = plan.summary.invalidWatchedEpisodes;

  for (const plannedWatch of plan.watchedEpisodes) {
    try {
      if (plannedWatch.skippedReason) {
        skippedWatchedEpisodes++;
      } else {
        const mediaId = mediaIdByTitle.get(plannedWatch.showTitle);

        if (!mediaId) {
          skippedWatchedEpisodes++;
        } else {
          const episode = await episodeRepository.getByShowSeasonAndEpisode(
            mediaId,
            plannedWatch.seasonNumber,
            plannedWatch.episodeNumber,
          );

          if (!episode?.id) {
            // EPISODE_MISSING: the watched row references an episode that does
            // not exist locally after synchronization. The episode is never
            // created and no history is written; the row is accounted for
            // explicitly so partial imports remain auditable.
            missingWatchedEpisodes++;
          } else {
            const imported = await episodeRepository.markWatchedFromImport(
              episode.id,
              plannedWatch.watchedAt,
            );

            if (imported) {
              importedWatchedEpisodes++;
            } else {
              // markWatchedFromImport returned false: the episode was already
              // watched locally, so its state and timestamp were preserved
              // as-is and nothing was written.
              alreadyWatchedEpisodes++;
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed watched episode import: ${plannedWatch.showTitle} ` +
          `S${plannedWatch.seasonNumber}E${plannedWatch.episodeNumber}`,
        error,
      );

      failedWatchedEpisodes++;
    }

    processedWatchedEpisodes += 1;

    // Watched rows carry no per-row context worth announcing, so they emit a
    // single completion event; every outcome advances the phase counter.
    emitProgress({
      phase: "watched-episodes",
      current: processedWatchedEpisodes,
      total: plan.watchedEpisodes.length,
    });
  }

  return {
    importedShows,
    skippedShows,
    failedShows,
    importedWatchedEpisodes,
    alreadyWatchedEpisodes,
    missingWatchedEpisodes,
    skippedWatchedEpisodes,
    failedWatchedEpisodes,
    shows: showOutcomes,
  };
}

/**
 * Compatibility wrapper preserving the previous public entry point. The UI
 * keeps calling this with a File; it now delegates to the plan/execute pair.
 * Matching happens exactly once, during planning.
 */
export async function executeTvTimeImport(
  file: File,
): Promise<TvTimeImportResult> {
  const plan = await buildTvTimeImportPlan(file);

  return executeTvTimeImportPlan(plan);
}
