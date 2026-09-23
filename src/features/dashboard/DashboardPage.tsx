import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, Film, ListVideo, Play, Tv } from "lucide-react";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

import DensityToggle from "../../components/ui/DensityToggle";

import ProgressBar from "../statistics/components/ProgressBar";

import {
  continueWatchingService,
  type ContinueWatchingItem,
} from "./services/continueWatchingService";

import {
  upcomingEpisodesService,
  type UpcomingEpisodeItem,
} from "../upcoming/services/upcomingEpisodesService";

import UpcomingEpisodeListItem from "../upcoming/components/UpcomingEpisodeListItem";

import { useDensity } from "../ui/useDensity";
import {
  CARD_GAP,
  CARD_TITLE_SIZE,
  DASHBOARD_GRID_COLUMNS,
  LIST_PADDING,
} from "../ui/density";

import { getLocalDateString, getRelativeAirDateLabel } from "../../domain/dates/airDate";

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

/**
 * Continue Watching reuses the shared library density preference so the
 * dashboard honours the same card-density choice as the Library. Density is
 * presentation-only; it never changes the data shown or the available actions.
 */
const DASHBOARD_DENSITY_KEY = "library-card-density";

export default function DashboardPage() {
  const [statistics, setStatistics] =
    useState<DashboardStatistics>(initialStatistics);

  const [continueWatchingItems, setContinueWatchingItems] = useState<
    ContinueWatchingItem[]
  >([]);

  const [upcomingItems, setUpcomingItems] = useState<UpcomingEpisodeItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { density, setDensity } = useDensity(DASHBOARD_DENSITY_KEY);

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
          upcoming,
        ] = await Promise.all([
          mediaRepository.countByType("tv"),
          mediaRepository.countByType("movie"),
          episodeRepository.countWatched(),
          episodeRepository.getWatchedRuntimeMinutes(),
          continueWatchingService.getItems(),
          upcomingEpisodesService.getItems(),
        ]);

        setStatistics({
          tvShows,
          movies,
          episodes: watchedEpisodes,
          hours: convertMinutesToHours(watchedRuntimeMinutes),
        });

        setContinueWatchingItems(continueWatching);
        setUpcomingItems(upcoming.slice(0, 5));
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
        <h1 className="text-4xl font-bold text-primary">Watch Log V2</h1>

        <p className="mt-2 text-lg text-muted">
          Welcome to your personal media tracker.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statisticCards.map((statistic) => {
          const Icon = statistic.icon;

          return (
            <div
              key={statistic.title}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted">{statistic.title}</p>

                  <h2 className="mt-2 text-3xl font-bold text-primary">
                    {isLoading ? "—" : statistic.value}
                  </h2>
                </div>

                <div className="rounded-lg bg-surface-elevated p-2 text-accent-text">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && continueWatchingItems.length > 0 && (
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/15 p-2 text-accent-text">
                <Play className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary">
                  Continue Watching
                </h2>

                <p className="mt-1 text-sm text-muted">
                  Pick up where you left off.
                </p>
              </div>
            </div>

            <DensityToggle
              density={density}
              onChange={setDensity}
              label="Continue Watching density"
            />
          </div>

          <div
            className={`grid ${CARD_GAP[density]} ${DASHBOARD_GRID_COLUMNS[density]}`}
          >
            {continueWatchingItems.map((item) => (
              <article
                key={item.media.id}
                className={`rounded-xl border border-border bg-surface ${LIST_PADDING[density]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3
                      className={`truncate font-semibold text-primary ${CARD_TITLE_SIZE[density]}`}
                    >
                      {item.media.title}
                    </h3>

                    <p className="mt-2 text-sm text-muted">
                      {item.watchedEpisodeCount} of {item.totalEpisodeCount}{" "}
                      episodes watched
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent-text">
                    {item.progressPercentage}%
                  </span>
                </div>

                <div className="mt-4">
                  <ProgressBar
                    value={item.progressPercentage}
                    label={`${item.media.title} progress`}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-border bg-app-bg/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Up Next
                  </p>

                  <div className="mt-2 flex items-start gap-3">
                    <span className="shrink-0 rounded-md bg-surface-elevated px-2 py-1 text-sm font-semibold text-accent-text">
                      {getEpisodeCode(item)}
                    </span>

                    <p className="min-w-0 text-sm font-medium text-primary">
                      {item.nextEpisode.title}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/library/tv/${item.media.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-inverted transition hover:bg-accent-hover"
                >
                  Continue Watching
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {!isLoading && upcomingItems.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/15 p-2 text-accent-text">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <h2 id="upcoming-heading" className="text-2xl font-bold text-primary">
                  Upcoming Episodes
                </h2>

                <p className="mt-1 text-sm text-muted">
                  TV episodes airing today, tomorrow, and in the future.
                </p>
              </div>
            </div>

            <Link
              to="/upcoming"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover"
              aria-label="View all upcoming episodes"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingItems.map((item) => (
              <UpcomingEpisodeListItem
                key={`${item.media.id}-${item.episode.seasonNumber}-${item.episode.episodeNumber}`}
                item={item}
                relativeLabel={
                  getRelativeAirDateLabel(item.airDate, getLocalDateString(new Date())) ?? item.airDate
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
