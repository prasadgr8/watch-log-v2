import type { FollowedTvShow, UserTvShowData } from "../types/tvTimeModels";

import type { ImportMedia } from "../types/importMedia";

export function mapToImportMedia(
  show: FollowedTvShow,
  progress?: UserTvShowData,
): ImportMedia {
  return {
    tvTimeId: show.tv_show_id,
    title: show.tv_show_name,
    episodesSeen: Number(progress?.nb_episodes_seen ?? 0),
    followed: progress?.is_followed === "1",
  };
}
