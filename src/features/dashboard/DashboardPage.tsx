import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Film, ListVideo, Play, Tv } from "lucide-react";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

import {
  continueWatchingService,
  type ContinueWatchingItem,
} from "./services/continueWatchingService";

interface DashboardStatistics {
  tvShows: number;
  movies: number;
  episodes: number;
  hours: number;
}

const initialStatistics: DashboardStatistics = {
  tvShows: 0,
  movies: 0,
  episodes: 0,
  hours: 0,
};

function convertMinutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

function formatEpisodeNumber(episodeNumber: number): string {
  return episodeNumber.toString().padStart(2, "0");
}

function getEpisodeCode(item: ContinueWatchingItem): string {
  return `S${formatEpisodeNumber(
    item.nextEpisode.seasonNumber,
  )}E${formatEpisodeNumber(item.nextEpisode.episodeNumber)}`;
}

export default function DashboardPage() {
  const [statistics, setStatistics] =
    useState<DashboardStatistics>(initialStatistics);

  const [continueWatchingItems, setContinueWatchingItems] = useState<
    ContinueWatchingItem[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard(): Promise<void> {
      try {
        setError(null);

        const [
          tvShows,
          movies,
          watchedEpisodes,
          watchedRuntimeMinutes,
          continueWatching,
        ] = await Promise.all([
          mediaRepository.countByType("tv"),
          mediaRepository.countByType("movie"),
          episodeRepository.countWatched(),
          episodeRepository.getWatchedRuntimeMinutes(),
          continueWatchingService.getItems(),
        ]);

        setStatistics({
          tvShows,
          movies,
          episodes: watchedEpisodes,
          hours: convertMinutesToHours(watchedRuntimeMinutes),
        });

        setContinueWatchingItems(continueWatching);
      } catch (loadError) {
        console.error("Failed to load dashboard:", loadError);

        setError("Unable to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const statisticCards = [
    {
      title: "TV Shows",
      value: statistics.tvShows,
      icon: Tv,
    },
    {
      title: "Movies",
      value: statistics.movies,
      icon: Film,
    },
    {
      title: "Episodes",
      value: statistics.episodes,
      icon: ListVideo,
    },
    {
      title: "Hours",
      value: statistics.hours,
      icon: Clock3,
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-white">Watch Log V2</h1>

        <p className="mt-2 text-lg text-slate-400">
          Welcome to your personal media tracker.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statisticCards.map((statistic) => {
          const Icon = statistic.icon;

          return (
            <div
              key={statistic.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400">{statistic.title}</p>

                  <h2 className="mt-2 text-3xl font-bold text-white">
                    {isLoading ? "—" : statistic.value}
                  </h2>
                </div>

                <div className="rounded-lg bg-slate-800 p-2 text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && continueWatchingItems.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600/15 p-2 text-blue-400">
              <Play className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                Continue Watching
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Pick up where you left off.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {continueWatchingItems.map((item) => (
              <article
                key={item.media.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-white">
                      {item.media.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      {item.watchedEpisodeCount} of {item.totalEpisodeCount}{" "}
                      episodes watched
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-blue-600/15 px-3 py-1 text-sm font-medium text-blue-300">
                    {item.progressPercentage}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${item.progressPercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Up Next
                  </p>

                  <div className="mt-2 flex items-start gap-3">
                    <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-sm font-semibold text-blue-300">
                      {getEpisodeCode(item)}
                    </span>

                    <p className="min-w-0 text-sm font-medium text-slate-200">
                      {item.nextEpisode.title}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/library/tv/${item.media.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  Continue Watching
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
