import { useEffect, useState } from "react";
import { Clock3, Film, ListVideo, Tv } from "lucide-react";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

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

export default function DashboardPage() {
  const [statistics, setStatistics] =
    useState<DashboardStatistics>(initialStatistics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatistics(): Promise<void> {
      try {
        setError(null);

        const [tvShows, movies, watchedEpisodes, watchedRuntimeMinutes] =
          await Promise.all([
            mediaRepository.countByType("tv"),
            mediaRepository.countByType("movie"),
            episodeRepository.countWatched(),
            episodeRepository.getWatchedRuntimeMinutes(),
          ]);

        setStatistics({
          tvShows,
          movies,
          episodes: watchedEpisodes,
          hours: convertMinutesToHours(watchedRuntimeMinutes),
        });
      } catch (loadError) {
        console.error("Failed to load dashboard statistics:", loadError);

        setError("Unable to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadStatistics();
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
    <div>
      <div>
        <h1 className="text-4xl font-bold text-white">Watch Log V2</h1>

        <p className="mt-2 text-lg text-slate-400">
          Welcome to your personal media tracker.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
