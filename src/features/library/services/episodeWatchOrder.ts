import type { PersistedEpisode } from "../../../types";

/*
 * Returns the persisted, unwatched episodes that come before the target
 * episode number. Detection operates purely on the supplied array (which the
 * caller scopes to a single season), ignores records without an ID, and
 * sorts ascending by episode number. Missing episode numbers are never
 * inferred; only retrieved records participate.
 */
export function getUnwatchedPreviousInSeason(
  episodes: PersistedEpisode[],
  targetEpisodeNumber: number,
): PersistedEpisode[] {
  return episodes
    .filter((episode) => episode.id !== undefined)
    .filter((episode) => episode.watched === false)
    .filter((episode) => episode.episodeNumber < targetEpisodeNumber)
    .sort((firstEpisode, secondEpisode) => {
      return firstEpisode.episodeNumber - secondEpisode.episodeNumber;
    });
}
