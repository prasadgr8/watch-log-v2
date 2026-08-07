import { readTvTimeZip } from "./tvTimeZipReader";
import { validateTvTimeFiles } from "./tvTimeValidator";
import { parseCsvFromZip } from "./tvTimeCsvParser";

import type { FollowedTvShow, UserTvShowData } from "../types/tvTimeModels";

export interface TvTimeImportPreview {
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
    valid: true,
    tvShows: shows.length,
    tvShowData: progress.length,
  };
}
