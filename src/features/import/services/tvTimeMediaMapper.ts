import type { FollowedTvShow, UserTvShowData } from "../types/tvTimeModels";

import type { Media } from "../../../types";

export function mapTvShowToMedia(
  show: FollowedTvShow,
  progress?: UserTvShowData,
): Media {
  const now = new Date();

  return {
    mediaType: "tv",
    title: show.tv_show_name,
    userStatus: progress?.is_followed === "1" ? "watching" : "planned",
    rating: undefined,
    createdAt: now,
    updatedAt: now,
  };
}
