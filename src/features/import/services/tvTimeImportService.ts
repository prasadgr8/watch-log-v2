import { episodeRepository } from "../../../database/repositories";
import { parseCsvFromZip } from "./tvTimeCsvParser";
import { buildImportCandidates } from "./tvTimeCandidateBuilder";
import { findBestTvdbMatch } from "./tvdbMatcher";
import { synchronizeTvTimeShowEpisodes } from "./tvTimeEpisodeImporter";
import { readTvTimeZip } from "./tvTimeZipReader";
import { validateTvTimeFiles } from "./tvTimeValidator";
import type {
  FollowedTvShow,
  SeenEpisodeSource,
  UserTvShowData,
} from "../types/tvTimeModels";

export interface TvTimeImportPreview {
  valid: boolean;
  tvShows: number;
  tvShowData: number;
}

export interface TvTimeImportResult {
  importedShows: number;
  skippedShows: number;
  failedShows: number;
  importedWatchedEpisodes: number;
  skippedWatchedEpisodes: number;
  failedWatchedEpisodes: number;
}

export async function buildTvTimeImportPreview(
  file: File,
): Promise<TvTimeImportPreview> {
  const zipData = await readTvTimeZip(file);
  const validation = validateTvTimeFiles(zipData.fileNames);

  if (!validation.valid) {
    return { valid: false, tvShows: 0, tvShowData: 0 };
  }

  const shows = await parseCsvFromZip<FollowedTvShow>(zipData.zip, "followed_tv_show.csv");
  const progress = await parseCsvFromZip<UserTvShowData>(zipData.zip, "user_tv_show_data.csv");

  return { valid: true, tvShows: shows.length, tvShowData: progress.length };
}

function parseTvTimeDate(value: string): Date {
  const date = new Date(value.trim().replace(" ", "T"));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid TV Time timestamp: ${value}`);
  return date;
}

export async function executeTvTimeImport(file: File): Promise<TvTimeImportResult> {
  const zipData = await readTvTimeZip(file);
  const validation = validateTvTimeFiles(zipData.fileNames);
  if (!validation.valid) throw new Error("The selected TV Time export is missing required files.");

  const shows = await parseCsvFromZip<FollowedTvShow>(zipData.zip, "followed_tv_show.csv");
  const progress = await parseCsvFromZip<UserTvShowData>(zipData.zip, "user_tv_show_data.csv");
  const seenEpisodes = await parseCsvFromZip<SeenEpisodeSource>(zipData.zip, "seen_episode_source.csv");
  const candidates = buildImportCandidates(shows, progress);

  const mediaByTitle = new Map<string, NonNullable<Awaited<ReturnType<typeof findBestTvdbMatch>>>["media"]>();
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

      if (result.media.id !== undefined && result.media.tmdbId !== undefined && result.media.mediaType === "tv") {
        await synchronizeTvTimeShowEpisodes(result.media.id, result.media.tmdbId);
      }

      if (result.status === "imported") importedShows++;
      else skippedShows++;
    } catch {
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

      if (episode?.id === undefined) {
        skippedWatchedEpisodes++;
        continue;
      }

      const imported = await episodeRepository.markWatchedFromImport(
        episode.id,
        parseTvTimeDate(seenEpisode.created_at),
      );

      if (imported) importedWatchedEpisodes++;
      else skippedWatchedEpisodes++;
    } catch {
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
