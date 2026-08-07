import type { FollowedTvShow, UserTvShowData } from "../types/tvTimeModels";

import type { ImportCandidate } from "../types/importCandidate";

export function buildImportCandidates(
  followedShows: FollowedTvShow[],
  userData: UserTvShowData[],
): ImportCandidate[] {
  return followedShows.map((show) => {
    const progress = userData.find(
      (item) => item.tv_show_id === show.tv_show_id,
    );

    const episodesSeen = Number(progress?.nb_episodes_seen ?? 0);

    return {
      tvTimeShowId: show.tv_show_id,
      title: show.tv_show_name,
      followed: progress?.is_followed === "1",
      favorite: progress?.is_favorited === "1",
      episodesSeen,
      watchStatus: episodesSeen === 0 ? "planned" : "watching",
      tvdbId: undefined,
    };
  });
}
