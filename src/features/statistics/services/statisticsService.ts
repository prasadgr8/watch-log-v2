import type { Episode, Media, TVShow } from "../../../types";

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";

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

/*
 * Episode statistics are derived from the persisted Episode records. The
 * Episode entity is the current watch-state source of truth; these aggregates
 * are read-only projections and never mutate domain records.
 */
export interface EpisodeStatistics {
  /** All persisted episodes, including Season 0 specials. */
  totalEpisodes: number;
  /** Season 0 specials. */
  specialEpisodes: number;
  watchedEpisodes: number;
  unwatchedEpisodes: number;
  watchedPercentage: number;
  /** Regular episodes (seasonNumber > 0), used for progress semantics. */
  regularEpisodes: number;
  watchedRegularEpisodes: number;
  regularWatchedPercentage: number;
}

export function calculateEpisodeStatistics(
  episodes: Episode[],
): EpisodeStatistics {
  const totalEpisodes = episodes.length;

  const specialEpisodes = episodes.filter(
    (episode) => episode.seasonNumber === 0,
  ).length;

  const regularEpisodes = episodes.filter(
    (episode) => episode.seasonNumber > 0,
  ).length;

  const watchedEpisodes = episodes.filter((episode) => episode.watched).length;

  const watchedRegularEpisodes = episodes.filter(
    (episode) => episode.watched && episode.seasonNumber > 0,
  ).length;

  return {
    totalEpisodes,
    specialEpisodes,
    watchedEpisodes,
    unwatchedEpisodes: totalEpisodes - watchedEpisodes,
    watchedPercentage:
      totalEpisodes > 0
        ? Math.round((watchedEpisodes / totalEpisodes) * 100)
        : 0,
    regularEpisodes,
    watchedRegularEpisodes,
    regularWatchedPercentage:
      regularEpisodes > 0
        ? Math.round((watchedRegularEpisodes / regularEpisodes) * 100)
        : 0,
  };
}

/*
 * Watch-time statistics derive entirely from episode runtime metadata.
 * Episodes without runtime contribute zero minutes (mirroring the Dashboard
 * watched-runtime behaviour documented in DATABASE.md).
 */
export interface WatchTimeStatistics {
  watchedRuntimeMinutes: number;
  watchedHours: number;
  watchedEpisodesWithRuntime: number;
  averageRuntimePerWatchedEpisode: number | null;
  /**
   * The current data model stores runtime only on episode records. Movies do
   * not carry runtime, so movie runtime is unavailable and always contributes
   * zero to watch-time statistics.
   */
  movieRuntimeMinutes: 0;
}

export function calculateWatchTimeStatistics(
  episodes: Episode[],
): WatchTimeStatistics {
  const watchedEpisodesWithRuntime = episodes.filter(
    (episode) => episode.watched && episode.runtime !== undefined,
  );

  const watchedRuntimeMinutes = episodes.reduce(
    (totalMinutes, episode) =>
      totalMinutes + (episode.watched ? (episode.runtime ?? 0) : 0),
    0,
  );

  const averageRuntimePerWatchedEpisode =
    watchedEpisodesWithRuntime.length > 0
      ? Math.round(
          (watchedEpisodesWithRuntime.reduce(
            (totalMinutes, episode) => totalMinutes + (episode.runtime ?? 0),
            0,
          ) /
            watchedEpisodesWithRuntime.length) *
            10,
        ) / 10
      : null;

  return {
    watchedRuntimeMinutes,
    watchedHours: Math.round((watchedRuntimeMinutes / 60) * 10) / 10,
    watchedEpisodesWithRuntime: watchedEpisodesWithRuntime.length,
    averageRuntimePerWatchedEpisode,
    movieRuntimeMinutes: 0,
  };
}

/*
 * TV progress is derived from the persisted episode records. Episode-derived
 * "completed" is distinct from Media.userStatus === "completed": a show is
 * episode-completed only when every regular episode (seasonNumber > 0) is
 * watched. Season 0 specials are reported separately and never count toward
 * regular progress unless includeSpecials is explicitly enabled.
 */
export type ShowProgressStatus =
  | "completed"
  | "partially-watched"
  | "unwatched"
  | "empty";

export type SeasonProgressStatus =
  | "empty"
  | "unwatched"
  | "partially-watched"
  | "fully-watched";

export interface SeasonProgressRow {
  seasonNumber: number;
  status: SeasonProgressStatus;
  watchedEpisodeCount: number;
  totalEpisodeCount: number;
  progressPercentage: number;
}

export interface ShowProgressRow {
  showId: number;
  title: string;
  status: ShowProgressStatus;
  watchedEpisodeCount: number;
  totalEpisodeCount: number;
  specialEpisodeCount: number;
  progressPercentage: number;
  lastWatchedAt?: Date;
  seasons: SeasonProgressRow[];
}

export interface ShowProgressStatistics {
  completedShows: number;
  partiallyWatchedShows: number;
  unwatchedShows: number;
  showsWithoutEpisodes: number;
  shows: ShowProgressRow[];
}

function deriveShowProgressStatus(
  watchedCount: number,
  totalCount: number,
): ShowProgressStatus {
  if (totalCount === 0) {
    return "empty";
  }

  if (watchedCount === 0) {
    return "unwatched";
  }

  if (watchedCount === totalCount) {
    return "completed";
  }

  return "partially-watched";
}

function deriveSeasonProgressStatus(
  watchedCount: number,
  totalCount: number,
): SeasonProgressStatus {
  if (totalCount === 0) {
    return "empty";
  }

  if (watchedCount === 0) {
    return "unwatched";
  }

  if (watchedCount === totalCount) {
    return "fully-watched";
  }

  return "partially-watched";
}

function getLatestWatchedAt(episodes: Episode[]): Date | undefined {
  return episodes.reduce<Date | undefined>((latestWatchedAt, episode) => {
    if (!episode.watched || !episode.watchedAt) {
      return latestWatchedAt;
    }

    if (
      !latestWatchedAt ||
      episode.watchedAt.getTime() > latestWatchedAt.getTime()
    ) {
      return episode.watchedAt;
    }

    return latestWatchedAt;
  }, undefined);
}

function buildSeasonRows(showEpisodes: Episode[]): SeasonProgressRow[] {
  const seasonsByNumber = new Map<number, Episode[]>();

  for (const episode of showEpisodes) {
    const seasonEpisodes = seasonsByNumber.get(episode.seasonNumber);

    if (seasonEpisodes) {
      seasonEpisodes.push(episode);
    } else {
      seasonsByNumber.set(episode.seasonNumber, [episode]);
    }
  }

  return [...seasonsByNumber.entries()]
    .sort(
      ([firstSeasonNumber], [secondSeasonNumber]) =>
        firstSeasonNumber - secondSeasonNumber,
    )
    .map(([seasonNumber, seasonEpisodes]) => {
      const watchedEpisodeCount = seasonEpisodes.filter(
        (episode) => episode.watched,
      ).length;

      const totalEpisodeCount = seasonEpisodes.length;

      return {
        seasonNumber,
        status: deriveSeasonProgressStatus(
          watchedEpisodeCount,
          totalEpisodeCount,
        ),
        watchedEpisodeCount,
        totalEpisodeCount,
        progressPercentage:
          totalEpisodeCount > 0
            ? Math.round((watchedEpisodeCount / totalEpisodeCount) * 100)
            : 0,
      };
    });
}

/*
 * includeSpecials defaults to false so regular show/season progress always
 * excludes Season 0 specials. When enabled, watched and total counts (and
 * therefore status and percentage) also include specials; specialEpisodeCount
 * always reports how many specials exist.
 */
export function calculateShowProgress(
  media: Media[],
  episodes: Episode[],
  includeSpecials = false,
): ShowProgressStatistics {
  const episodesByShowId = new Map<number, Episode[]>();

  for (const episode of episodes) {
    const showEpisodes = episodesByShowId.get(episode.showId);

    if (showEpisodes) {
      showEpisodes.push(episode);
    } else {
      episodesByShowId.set(episode.showId, [episode]);
    }
  }

  const tvShows = media.filter(
    (item): item is TVShow & { id: number } =>
      item.mediaType === "tv" && item.id !== undefined,
  );

  const completedShows: ShowProgressRow[] = [];
  const partiallyWatchedShows: ShowProgressRow[] = [];
  const unwatchedShows: ShowProgressRow[] = [];
  const showsWithoutEpisodes: ShowProgressRow[] = [];

  for (const show of tvShows) {
    const showEpisodes = episodesByShowId.get(show.id) ?? [];

    const regularEpisodes = showEpisodes.filter(
      (episode) => episode.seasonNumber > 0,
    );

    const specialEpisodes = showEpisodes.filter(
      (episode) => episode.seasonNumber === 0,
    );

    const watchedRegularCount = regularEpisodes.filter(
      (episode) => episode.watched,
    ).length;

    const watchedSpecialCount = specialEpisodes.filter(
      (episode) => episode.watched,
    ).length;

    const watchedEpisodeCount = includeSpecials
      ? watchedRegularCount + watchedSpecialCount
      : watchedRegularCount;

    const totalEpisodeCount = includeSpecials
      ? regularEpisodes.length + specialEpisodes.length
      : regularEpisodes.length;

    const status = deriveShowProgressStatus(
      watchedEpisodeCount,
      totalEpisodeCount,
    );

    const showRow: ShowProgressRow = {
      showId: show.id,
      title: show.title,
      status,
      watchedEpisodeCount,
      totalEpisodeCount,
      specialEpisodeCount: specialEpisodes.length,
      progressPercentage:
        totalEpisodeCount > 0
          ? Math.round((watchedEpisodeCount / totalEpisodeCount) * 100)
          : 0,
      lastWatchedAt: getLatestWatchedAt(showEpisodes),
      seasons: buildSeasonRows(showEpisodes),
    };

    if (status === "completed") {
      completedShows.push(showRow);
    } else if (status === "partially-watched") {
      partiallyWatchedShows.push(showRow);
    } else if (status === "unwatched") {
      unwatchedShows.push(showRow);
    } else {
      showsWithoutEpisodes.push(showRow);
    }
  }

  const shows = [
    ...partiallyWatchedShows,
    ...unwatchedShows,
    ...completedShows,
    ...showsWithoutEpisodes,
  ].sort((firstShow, secondShow) => {
    const firstTime = firstShow.lastWatchedAt?.getTime() ?? 0;
    const secondTime = secondShow.lastWatchedAt?.getTime() ?? 0;

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    return firstShow.title.localeCompare(secondShow.title);
  });

  return {
    completedShows: completedShows.length,
    partiallyWatchedShows: partiallyWatchedShows.length,
    unwatchedShows: unwatchedShows.length,
    showsWithoutEpisodes: showsWithoutEpisodes.length,
    shows,
  };
}

/*
 * Recent watch information derives from the cached Episode.watchedAt current
 * state (maintained transactionally with watch history) rather than a full
 * watch-history scan. This mirrors the Continue Watching projection convention
 * documented in ARCHITECTURE.md.
 */
export interface RecentWatchItem {
  episodeId: number;
  showId: number;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  watchedAt: Date;
}

export interface RecentActivityStatistics {
  recentlyWatched: RecentWatchItem[];
  firstWatchDate: Date | null;
  lastWatchDate: Date | null;
}

const DEFAULT_RECENT_WATCH_LIMIT = 10;

export function calculateRecentActivity(
  episodes: Episode[],
  media: Media[],
  limit = DEFAULT_RECENT_WATCH_LIMIT,
): RecentActivityStatistics {
  const showById = new Map<number, string>();

  for (const item of media) {
    if (item.mediaType === "tv" && item.id !== undefined) {
      showById.set(item.id, item.title);
    }
  }

  const watchedEpisodes = episodes
    .filter(
      (episode): episode is Episode & { id: number; watchedAt: Date } =>
        episode.watched &&
        episode.watchedAt !== undefined &&
        episode.id !== undefined,
    )
    .sort(
      (firstEpisode, secondEpisode) =>
        secondEpisode.watchedAt.getTime() - firstEpisode.watchedAt.getTime(),
    );

  const firstWatchDate =
    watchedEpisodes.length > 0
      ? (watchedEpisodes[watchedEpisodes.length - 1]?.watchedAt ?? null)
      : null;

  const lastWatchDate =
    watchedEpisodes.length > 0 ? (watchedEpisodes[0]?.watchedAt ?? null) : null;

  const recentlyWatched = watchedEpisodes.slice(0, limit).map((episode) => ({
    episodeId: episode.id,
    showId: episode.showId,
    showTitle: showById.get(episode.showId) ?? "Unknown Show",
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    watchedAt: episode.watchedAt,
  }));

  return { recentlyWatched, firstWatchDate, lastWatchDate };
}

export interface StatisticsDashboard {
  library: LibraryStatistics;
  episodes: EpisodeStatistics;
  watchTime: WatchTimeStatistics;
  showProgress: ShowProgressStatistics;
  recentActivity: RecentActivityStatistics;
  /** Raw watch-event count from the watchHistory store. */
  watchEventCount: number;
}

/*
 * Facade that reads the persisted stores once (media, episodes, watch history
 * count) in parallel and derives every displayed value in memory. The
 * statistics service remains read-only: it never mutates domain records and
 * never writes to IndexedDB.
 */
export async function loadStatistics(): Promise<StatisticsDashboard> {
  const [media, episodes, watchEventCount] = await Promise.all([
    mediaRepository.getAll(),
    episodeRepository.getAll(),
    watchHistoryRepository.count(),
  ]);

  return {
    library: calculateLibraryStatistics(media),
    episodes: calculateEpisodeStatistics(episodes),
    watchTime: calculateWatchTimeStatistics(episodes),
    showProgress: calculateShowProgress(media, episodes),
    recentActivity: calculateRecentActivity(episodes, media),
    watchEventCount,
  };
}
