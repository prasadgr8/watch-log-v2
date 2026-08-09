import { tmdbSearchService } from "../../../services/tmdb";
import { mapTmdbResultToMedia } from "../../../services/tmdb";
import { libraryService } from "../../library/services/libraryService";
import type { ImportCandidate } from "../types/importCandidate";
import { mediaRepository } from "../../../database/repositories";

export async function findBestTvdbMatch(candidate: ImportCandidate) {
  const response = await tmdbSearchService.searchTvShows(candidate.title);

  if (response.results.length === 0) {
    console.log("No match found:", candidate.title);
    return null;
  }

  const firstResult = response.results[0];

  const media = mapTmdbResultToMedia(firstResult, {
    userStatus: candidate.watchStatus,
  });

  const existingMedia =
    media.tmdbId !== undefined
      ? await mediaRepository.getByTmdbId(media.tmdbId, media.mediaType)
      : undefined;

  if (existingMedia) {
    console.log("Already in library, skipping:", media.title);
    console.log("Existing Media Record:", existingMedia);

    return {
      status: "skipped" as const,
      media: existingMedia,
    };
  }

  await libraryService.addMedia(media);

  console.log("Imported:", media.title);

  return {
    status: "imported" as const,
    media,
  };
}
