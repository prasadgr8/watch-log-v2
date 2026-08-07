import { tmdbSearchService } from "../../../services/tmdb";
import { mapTmdbResultToMedia } from "../../../services/tmdb";
import { libraryService } from "../../library/services/libraryService";
import type { ImportCandidate } from "../types/importCandidate";

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

  await libraryService.addMedia(media);

  console.log("Imported:", media.title);
  //console.log("Imported Media:", media);

  return media;
}
