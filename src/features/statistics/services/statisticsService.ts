import type { Media } from "../../../types";

export interface LibraryStatistics {
  total: number;
  movies: number;
  tvShows: number;

  planned: number;
  watching: number;
  completed: number;
  onHold: number;
  dropped: number;
}

export function calculateLibraryStatistics(media: Media[]): LibraryStatistics {
  return {
    total: media.length,
    movies: media.filter((item) => item.mediaType === "movie").length,
    tvShows: media.filter((item) => item.mediaType === "tv").length,

    planned: media.filter((item) => item.userStatus === "planned").length,
    watching: media.filter((item) => item.userStatus === "watching").length,
    completed: media.filter((item) => item.userStatus === "completed").length,
    onHold: media.filter((item) => item.userStatus === "on-hold").length,
    dropped: media.filter((item) => item.userStatus === "dropped").length,
  };
}
