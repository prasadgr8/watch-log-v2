import { episodeRepository } from "../../../database/repositories";
import { mapTmdbEpisodeToEpisode } from "../../../services/tmdb";
import { tmdbTvService } from "../../../services/tmdb/tmdbTvService";

export async function synchronizeTvTimeSeason(
  mediaId: number,
  tmdbId: number,
  seasonNumber: number,
): Promise<number> {
  const seasonDetails = await tmdbTvService.getSeasonDetails(
    tmdbId,
    seasonNumber,
  );

  const now = new Date();

  const mappedEpisodes = seasonDetails.episodes.map((episode) =>
    mapTmdbEpisodeToEpisode(episode, mediaId, now),
  );

  const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
    mediaId,
    seasonNumber,
    mappedEpisodes,
  );

  return synchronizedEpisodes.length;
}
export async function synchronizeTvTimeShowEpisodes(
  mediaId: number,
  tmdbId: number,
): Promise<number> {
  const tvDetails = await tmdbTvService.getTvDetails(tmdbId);

  let synchronizedCount = 0;

  for (const season of tvDetails.seasons) {
    if (season.season_number === 0) {
      continue;
    }

    synchronizedCount += await synchronizeTvTimeSeason(
      mediaId,
      tmdbId,
      season.season_number,
    );
  }

  return synchronizedCount;
}
