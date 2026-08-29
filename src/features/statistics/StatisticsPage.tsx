import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  Film,
  Gauge,
  History,
  Hourglass,
  Library,
  ListVideo,
  PauseCircle,
  Percent,
  PlayCircle,
  Star,
  StarHalf,
  Timer,
  TrendingUp,
  Trophy,
  Tv,
  XCircle,
} from "lucide-react";
import StatisticCard from "./components/StatisticCard";
import RecentlyWatchedList from "./components/RecentlyWatchedList";
import ShowProgressTable from "./components/ShowProgressTable";
import {
  calculateEpisodeStatistics,
  calculateLibraryStatistics,
  calculateRecentActivity,
  calculateShowProgress,
  calculateWatchTimeStatistics,
  loadStatistics,
  type StatisticsDashboard,
} from "./services/statisticsService";

const initialStatistics: StatisticsDashboard = {
  library: calculateLibraryStatistics([]),
  episodes: calculateEpisodeStatistics([]),
  watchTime: calculateWatchTimeStatistics([]),
  showProgress: calculateShowProgress([], []),
  recentActivity: calculateRecentActivity([], []),
  watchEventCount: 0,
};

function formatWatchDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsDashboard>(initialStatistics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      try {
        setError(null);

        const result = await loadStatistics();

        setStats(result);
      } catch (loadError) {
        console.error("Failed to load statistics:", loadError);

        setError("Unable to load statistics.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPage();
  }, []);

  function placeholder(value: number | string): number | string {
    return isLoading ? "—" : value;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="text-accent-text" size={32} />

          <h1 className="text-3xl font-bold text-primary">Statistics</h1>
        </div>

        <p className="mt-2 text-muted">
          View insights and statistics about your media library.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">Library Overview</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Total Media"
          value={placeholder(stats.library.total)}
          icon={<Library size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Movies"
          value={placeholder(stats.library.movies)}
          icon={<Film size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="TV Shows"
          value={placeholder(stats.library.tvShows)}
          icon={<Tv size={24} />}
          iconClassName="text-accent-text"
        />
      </div>

      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">
          Rating Statistics
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Average Rating"
          value={placeholder(stats.library.averageRating.toFixed(1))}
          suffix={isLoading ? undefined : " / 10"}
          icon={<StarHalf size={24} />}
          iconClassName="text-warning"
        />

        <StatisticCard
          title="Rated Titles"
          value={placeholder(stats.library.ratedTitles)}
          icon={<Star size={24} />}
          iconClassName="text-warning"
        />

        <StatisticCard
          title="Highest Rating"
          value={placeholder(stats.library.highestRating.toFixed(1))}
          suffix={isLoading ? undefined : " / 10"}
          icon={<Trophy size={24} />}
          iconClassName="text-warning"
        />
      </div>
      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">Watch Status</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatisticCard
          title="Planned"
          value={placeholder(stats.library.planned)}
          icon={<Clock3 size={24} />}
          iconClassName="text-warning"
        />

        <StatisticCard
          title="Watching"
          value={placeholder(stats.library.watching)}
          icon={<PlayCircle size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Completed"
          value={placeholder(stats.library.completed)}
          icon={<CheckCircle2 size={24} />}
          iconClassName="text-success"
        />

        <StatisticCard
          title="On Hold"
          value={placeholder(stats.library.onHold)}
          icon={<PauseCircle size={24} />}
          iconClassName="text-warning"
        />

        <StatisticCard
          title="Dropped"
          value={placeholder(stats.library.dropped)}
          icon={<XCircle size={24} />}
          iconClassName="text-danger"
        />
      </div>
      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">Progress</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Completion Rate"
          value={placeholder(stats.library.completionRate)}
          suffix={isLoading ? undefined : "%"}
          icon={<TrendingUp size={24} />}
          iconClassName="text-success"
        />

        <StatisticCard
          title="Active Titles"
          value={placeholder(stats.library.activeTitles)}
          icon={<Activity size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Remaining Titles"
          value={placeholder(stats.library.remainingTitles)}
          icon={<Hourglass size={24} />}
          iconClassName="text-warning"
        />
      </div>

      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">
          Episode Statistics
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatisticCard
          title="Total Episodes"
          value={placeholder(stats.episodes.totalEpisodes)}
          icon={<ListVideo size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Watched Episodes"
          value={placeholder(stats.episodes.watchedEpisodes)}
          icon={<CheckCircle2 size={24} />}
          iconClassName="text-success"
        />

        <StatisticCard
          title="Unwatched Episodes"
          value={placeholder(stats.episodes.unwatchedEpisodes)}
          icon={<EyeOff size={24} />}
          iconClassName="text-muted"
        />

        <StatisticCard
          title="Watched %"
          value={placeholder(stats.episodes.watchedPercentage)}
          suffix={isLoading ? undefined : "%"}
          icon={<Percent size={24} />}
          iconClassName="text-accent-text"
        />
      </div>

      <p className="text-sm text-muted">
        {stats.episodes.specialEpisodes > 0
          ? `${stats.episodes.specialEpisodes} Season 0 special${
              stats.episodes.specialEpisodes === 1 ? "" : "s"
            } are included in the totals above and excluded from show progress.`
          : "Season 0 specials are excluded from show progress."}
      </p>

      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">Watch Time</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Watch Hours"
          value={placeholder(stats.watchTime.watchedHours)}
          icon={<Clock3 size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Watched Runtime"
          value={placeholder(stats.watchTime.watchedRuntimeMinutes)}
          suffix={isLoading ? undefined : " min"}
          icon={<Timer size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Avg Runtime / Watched Episode"
          value={
            isLoading ||
            stats.watchTime.averageRuntimePerWatchedEpisode === null
              ? "—"
              : stats.watchTime.averageRuntimePerWatchedEpisode
          }
          suffix={
            isLoading ||
            stats.watchTime.averageRuntimePerWatchedEpisode === null
              ? undefined
              : " min"
          }
          icon={<Gauge size={24} />}
          iconClassName="text-accent-text"
        />
      </div>

      <p className="text-sm text-muted">
        Based on available runtime metadata. Movie runtime is not available.
      </p>

      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">TV Progress</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatisticCard
          title="Completed"
          value={placeholder(stats.showProgress.completedShows)}
          icon={<CheckCircle2 size={24} />}
          iconClassName="text-success"
        />

        <StatisticCard
          title="Partially Watched"
          value={placeholder(stats.showProgress.partiallyWatchedShows)}
          icon={<PlayCircle size={24} />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Unwatched"
          value={placeholder(stats.showProgress.unwatchedShows)}
          icon={<EyeOff size={24} />}
          iconClassName="text-warning"
        />

        <StatisticCard
          title="Shows Without Episodes"
          value={placeholder(stats.showProgress.showsWithoutEpisodes)}
          icon={<Film size={24} />}
          iconClassName="text-muted"
        />
      </div>

      <p className="text-sm text-muted">
        Completed shows are derived from every regular episode being watched and
        are distinct from your library watch status. Season 0 specials are
        excluded from progress.
      </p>

      {!isLoading && <ShowProgressTable shows={stats.showProgress.shows} />}

      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">
          Recently Watched
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                First Watch Date
              </p>

              <h3 className="mt-3 text-lg font-semibold text-primary">
                {isLoading || !stats.recentActivity.firstWatchDate
                  ? "—"
                  : formatWatchDate(stats.recentActivity.firstWatchDate)}
              </h3>
            </div>

            <div className="text-accent-text">
              <CalendarDays size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                Last Watch Date
              </p>

              <h3 className="mt-3 text-lg font-semibold text-primary">
                {isLoading || !stats.recentActivity.lastWatchDate
                  ? "—"
                  : formatWatchDate(stats.recentActivity.lastWatchDate)}
              </h3>
            </div>

            <div className="text-accent-text">
              <CalendarCheck size={24} />
            </div>
          </div>
        </div>

        <StatisticCard
          title="Watch Events"
          value={placeholder(stats.watchEventCount)}
          icon={<History size={24} />}
          iconClassName="text-accent-text"
        />
      </div>

      <p className="text-sm text-muted">
        Watch events are raw watch-history rows; re-watching or importing an
        episode can create more than one event for the same episode.
      </p>

      {!isLoading && <RecentlyWatchedList activity={stats.recentActivity} />}
    </div>
  );
}
