import type { PersistedEpisode } from "../../../types";

export type SeasonWatchStatus =
  | "empty"
  | "unwatched"
  | "partially-watched"
  | "fully-watched";

export interface SeasonStatusSummary {
  status: SeasonWatchStatus;
  watchedEpisodeCount: number;
  totalEpisodeCount: number;
}

/*
 * Season watch status is always derived from the persisted episode records;
 * it is never stored on Media or on a separate season entity.
 */
export function deriveSeasonStatus(
  episodes: PersistedEpisode[],
): SeasonStatusSummary {
  const watchedEpisodeCount = episodes.filter(
    (episode) => episode.watched,
  ).length;

  const totalEpisodeCount = episodes.length;

  let status: SeasonWatchStatus;

  if (totalEpisodeCount === 0) {
    status = "empty";
  } else if (watchedEpisodeCount === 0) {
    status = "unwatched";
  } else if (watchedEpisodeCount === totalEpisodeCount) {
    status = "fully-watched";
  } else {
    status = "partially-watched";
  }

  return { status, watchedEpisodeCount, totalEpisodeCount };
}
