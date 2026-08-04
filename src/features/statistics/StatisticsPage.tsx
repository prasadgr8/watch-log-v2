import { useEffect, useState } from "react";
import {
  BarChart3,
  Library,
  Film,
  Tv,
  Clock3,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Star,
  StarHalf,
  Trophy,
  TrendingUp,
  Activity,
  Hourglass,
} from "lucide-react";
import { mediaRepository } from "../../database/repositories";
import StatisticCard from "./components/StatisticCard";
import {
  calculateLibraryStatistics,
  type LibraryStatistics,
} from "./services/statisticsService";

export default function StatisticsPage() {
  const [stats, setStats] = useState<LibraryStatistics>({
    total: 0,
    movies: 0,
    tvShows: 0,
    planned: 0,
    watching: 0,
    completed: 0,
    onHold: 0,
    dropped: 0,

    averageRating: 0,
    ratedTitles: 0,
    highestRating: 0,

    completionRate: 0,
    activeTitles: 0,
    remainingTitles: 0,
  });

  useEffect(() => {
    async function loadStatistics() {
      const media = await mediaRepository.getAll();

      setStats(calculateLibraryStatistics(media));
    }

    void loadStatistics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="text-blue-400" size={32} />

          <h1 className="text-3xl font-bold text-white">Statistics</h1>
        </div>

        <p className="mt-2 text-slate-400">
          View insights and statistics about your media library.
        </p>
      </div>
      <div className="border-b border-slate-700 pb-2">
        <h2 className="text-xl font-semibold text-white">Library Overview</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Total Media"
          value={stats.total}
          icon={<Library size={24} />}
          iconClassName="text-blue-400"
        />

        <StatisticCard
          title="Movies"
          value={stats.movies}
          icon={<Film size={24} />}
          iconClassName="text-purple-400"
        />

        <StatisticCard
          title="TV Shows"
          value={stats.tvShows}
          icon={<Tv size={24} />}
          iconClassName="text-cyan-400"
        />
      </div>

      <div className="border-b border-slate-700 pb-2">
        <h2 className="text-xl font-semibold text-white">Rating Statistics</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Average Rating"
          value={stats.averageRating.toFixed(1)}
          suffix=" / 10"
          icon={<StarHalf size={24} />}
          iconClassName="text-amber-400"
        />

        <StatisticCard
          title="Rated Titles"
          value={stats.ratedTitles}
          icon={<Star size={24} />}
          iconClassName="text-yellow-400"
        />

        <StatisticCard
          title="Highest Rating"
          value={stats.highestRating.toFixed(1)}
          suffix=" / 10"
          icon={<Trophy size={24} />}
          iconClassName="text-orange-400"
        />
      </div>
      <div className="border-b border-slate-700 pb-2">
        <h2 className="text-xl font-semibold text-white">Watch Status</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatisticCard
          title="Planned"
          value={stats.planned}
          icon={<Clock3 size={24} />}
          iconClassName="text-yellow-400"
        />

        <StatisticCard
          title="Watching"
          value={stats.watching}
          icon={<PlayCircle size={24} />}
          iconClassName="text-sky-400"
        />

        <StatisticCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={24} />}
          iconClassName="text-green-400"
        />

        <StatisticCard
          title="On Hold"
          value={stats.onHold}
          icon={<PauseCircle size={24} />}
          iconClassName="text-orange-400"
        />

        <StatisticCard
          title="Dropped"
          value={stats.dropped}
          icon={<XCircle size={24} />}
          iconClassName="text-red-400"
        />
      </div>
      <div className="border-b border-slate-700 pb-2">
        <h2 className="text-xl font-semibold text-white">Progress</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Completion Rate"
          value={stats.completionRate}
          suffix="%"
          icon={<TrendingUp size={24} />}
          iconClassName="text-green-400"
        />

        <StatisticCard
          title="Active Titles"
          value={stats.activeTitles}
          icon={<Activity size={24} />}
          iconClassName="text-blue-400"
        />

        <StatisticCard
          title="Remaining Titles"
          value={stats.remainingTitles}
          icon={<Hourglass size={24} />}
          iconClassName="text-orange-400"
        />
      </div>
    </div>
  );
}
