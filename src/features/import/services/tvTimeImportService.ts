import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";
import { readTvTimeZip } from "./tvTimeZipReader";
import { validateTvTimeFiles, type ValidationResult } from "./tvTimeValidator";
import { parseCsvFromZip } from "./tvTimeCsvParser";
import { buildImportCandidates } from "./tvTimeCandidateBuilder";
import { findBestTvdbMatch } from "./tvdbMatcher";
import { synchronizeTvTimeShowEpisodes } from "./tvTimeEpisodeImporter";
import type {
  FollowedTvShow,
  UserTvShowData,
  SeenEpisodeSource,
} from "../types/tvTimeModels";

export interface TvTimeImportPreview {
  validation: ValidationResult;
  valid: boolean;
  tvShows: number;
  tvShowData: number;
}
export async function buildTvTimeImportPreview(
  file: File,
): Promise<TvTimeImportPreview> {
  const zipData = await readTvTimeZip(file);
  const validation = validateTvTimeFiles(zipData.fileNames);

  if (!validation.valid) {
    return {
      validation,
      valid: false,
      tvShows: 0,
      tvShowData: 0,
    };
  }

  const shows = await parseCsvFromZip<FollowedTvShow>(
    zipData.zip,
    "followed_tv_show.csv",
  );

  const progress = await parseCsvFromZip<UserTvShowData>(
    zipData.zip,
    "user_tv_show_data.csv",
  );

  return {
    validation,
    valid: true,
    tvShows: shows.length,
    tvShowData: progress.length,
  };
}
export interface TvTimeImportResult {
  importedShows: number;
  skippedShows: number;
  failedShows: number;
  importedWatchedEpisodes: number;
  skippedWatchedEpisodes: number;
  failedWatchedEpisodes: number;
}

function parseTvTimeDate(value: string): Date {
  const normalized = value.trim().replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid TV Time timestamp: ${value}`);
  }

  return date;
}

export async function executeTvTimeImport(
  file: File,
): Promise<TvTimeImportResult> {
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

  const candidates = buildImportCandidates(shows, progress);

  const mediaByTitle = new Map<
    string,
    NonNullable<Awaited<ReturnType<typeof findBestTvdbMatch>>>["media"]
  >();

  let importedShows = 0;
  let skippedShows = 0;
  let failedShows = 0;

  for (const candidate of candidates) {
    try {
      const result = await findBestTvdbMatch(candidate);

      if (!result?.media) {
        failedShows++;
        continue;
      }

      mediaByTitle.set(candidate.title, result.media);

      if (
        result.media.id !== undefined &&
        result.media.tmdbId !== undefined &&
        result.media.mediaType === "tv"
      ) {
        try {
          await synchronizeTvTimeShowEpisodes(
            result.media.id,
            result.media.tmdbId,
          );
        } catch (syncError) {
          if (result.status === "imported") {
            await mediaRepository.remove(result.media.id);
          }

          throw syncError;
        }
      }

      if (result.status === "imported") {
        importedShows++;
      } else {
        skippedShows++;
      }
    } catch (error) {
      console.error(`Failed to import TV Time show: ${candidate.title}`, error);

      failedShows++;
    }
  }

  let importedWatchedEpisodes = 0;
  let skippedWatchedEpisodes = 0;
  let failedWatchedEpisodes = 0;

  for (const seenEpisode of seenEpisodes) {
    try {
      const media = mediaByTitle.get(seenEpisode.tv_show_name);

      if (!media?.id) {
        skippedWatchedEpisodes++;
        continue;
      }

      const episode = await episodeRepository.getByShowSeasonAndEpisode(
        media.id,
        Number(seenEpisode.episode_season_number),
        Number(seenEpisode.episode_number),
      );

      if (!episode?.id) {
        skippedWatchedEpisodes++;
        continue;
      }

      const imported = await episodeRepository.markWatchedFromImport(
        episode.id,
        parseTvTimeDate(seenEpisode.created_at),
      );

      if (imported) {
        importedWatchedEpisodes++;
      } else {
        skippedWatchedEpisodes++;
      }
    } catch (error) {
      console.error(
        `Failed watched episode import: ${seenEpisode.tv_show_name} ` +
          `S${seenEpisode.episode_season_number}E${seenEpisode.episode_number}`,
        error,
      );

      failedWatchedEpisodes++;
    }
  }

  return {
    importedShows,
    skippedShows,
    failedShows,
    importedWatchedEpisodes,
    skippedWatchedEpisodes,
    failedWatchedEpisodes,
  };
}
