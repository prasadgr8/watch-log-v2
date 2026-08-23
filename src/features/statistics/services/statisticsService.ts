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

  averageRating: number;
  ratedTitles: number;
  highestRating: number;

  completionRate: number;
  activeTitles: number;
  remainingTitles: number;
}

export function calculateLibraryStatistics(media: Media[]): LibraryStatistics {
  const ratedMedia = media.filter((item) => item.rating !== undefined);

  const ratedTitles = ratedMedia.length;

  const highestRating =
    ratedTitles > 0 ? Math.max(...ratedMedia.map((item) => item.rating!)) : 0;

  const averageRating =
    ratedTitles > 0
      ? Number(
          (
            ratedMedia.reduce((sum, item) => sum + item.rating!, 0) /
            ratedTitles
          ).toFixed(1),
        )
      : 0;
  const completionRate =
    media.length > 0
      ? Math.round(
          (media.filter((item) => item.userStatus === "completed").length /
            media.length) *
            100,
        )
      : 0;

  const activeTitles = media.filter(
    (item) => item.userStatus === "watching",
  ).length;

  const remainingTitles = media.filter(
    (item) =>
      item.userStatus === "planned" ||
      item.userStatus === "watching" ||
      item.userStatus === "on-hold",
  ).length;
  return {
    total: media.length,
    movies: media.filter((item) => item.mediaType === "movie").length,
    tvShows: media.filter((item) => item.mediaType === "tv").length,

    planned: media.filter((item) => item.userStatus === "planned").length,
    watching: media.filter((item) => item.userStatus === "watching").length,
    completed: media.filter((item) => item.userStatus === "completed").length,
    onHold: media.filter((item) => item.userStatus === "on-hold").length,
    dropped: media.filter((item) => item.userStatus === "dropped").length,

    averageRating,
    ratedTitles,
    highestRating,

    completionRate,
    activeTitles,
    remainingTitles,
  };
}
