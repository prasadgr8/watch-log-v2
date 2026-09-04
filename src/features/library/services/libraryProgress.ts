import type { Episode, PersistedMedia } from "../../../types";

/*
 * Builds a read-only progress lookup for Library sorting, keyed by the
 * persisted media id.
 *
 * TV progress follows the authoritative definition used by the Statistics
 * page (calculateShowProgress): only regular episodes (seasonNumber > 0)
 * count toward progress, an episode is watched when watched === true, and
 * the percentage is Math.round(watched / total * 100). SHows with zero
 * regular episodes have unknown progress and are omitted from the map.
 *
 * Movie progress is binary: a movie marked completed is 100%, anything else
 * is 0%. The application never writes partial movie progress.
 */
export function buildLibraryProgressMap(
  media: PersistedMedia[],
  episodes: Episode[],
): ReadonlyMap<number, number> {
  const progressByMediaId = new Map<number, number>();

  const regularEpisodesByShowId = new Map<number, Episode[]>();

  for (const episode of episodes) {
    if (episode.seasonNumber <= 0) {
      continue;
    }

    const showEpisodes = regularEpisodesByShowId.get(episode.showId);

    if (showEpisodes) {
      showEpisodes.push(episode);
    } else {
      regularEpisodesByShowId.set(episode.showId, [episode]);
    }
  }

  for (const item of media) {
    if (item.id === undefined) {
      continue;
    }

    if (item.mediaType === "tv") {
      const regularEpisodes = regularEpisodesByShowId.get(item.id) ?? [];

      const totalEpisodeCount = regularEpisodes.length;

      if (totalEpisodeCount === 0) {
        continue;
      }

      const watchedEpisodeCount = regularEpisodes.filter(
        (episode) => episode.watched,
      ).length;

      progressByMediaId.set(
        item.id,
        Math.round((watchedEpisodeCount / totalEpisodeCount) * 100),
      );
    } else {
      progressByMediaId.set(item.id, item.userStatus === "completed" ? 100 : 0);
    }
  }

  return progressByMediaId;
}