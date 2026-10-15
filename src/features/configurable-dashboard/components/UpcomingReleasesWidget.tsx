import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight, CalendarDays, Clapperboard, Tv } from "lucide-react";

import { tmdbConfig } from "../../../services/tmdb";

import {
  getUpcomingReleaseLabel,
  getUpcomingReleasesPreview,
  getUpcomingReleasesToday,
  UPCOMING_RELEASES_PREVIEW_LIMIT,
} from "../services/upcomingReleasesWidgetService";
import { upcomingEpisodesService } from "../../upcoming/services/upcomingEpisodesService";

import type { UpcomingEpisodeItem } from "../../upcoming/services/upcomingEpisodesService";

function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w92${posterPath}`;
}

function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber,
  ).padStart(2, "0")}`;
}

/*
 * Compact Upcoming Releases widget: the next few airings with poster, show,
 * episode code/title, and release date plus relative countdown. Links out to
 * the full Upcoming page instead of duplicating its month/show calendar.
 * Air-date selection rules stay in `upcomingEpisodesService`; this renders a
 * capped preview only.
 */
export default function UpcomingReleasesWidget() {
  const [items, setItems] = useState<UpcomingEpisodeItem[]>([]);
  const [today, setToday] = useState(() => getUpcomingReleasesToday());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadUpcoming(): Promise<void> {
      const now = new Date();

      try {
        setError(null);

        const upcoming = await upcomingEpisodesService.getItems(now);

        if (isActive) {
          setItems(
            getUpcomingReleasesPreview(
              upcoming,
              UPCOMING_RELEASES_PREVIEW_LIMIT,
            ),
          );
          setToday(getUpcomingReleasesToday(now));
        }
      } catch {
        if (isActive) {
          setError("Unable to load Upcoming Releases.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUpcoming();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Upcoming Releases...
      </p>
    );
  }

  if (error !== null) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
        <Link
          to="/upcoming"
          aria-label="View upcoming releases"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          View Upcoming
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 p-6 text-center">
        <CalendarDays
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted"
        />
        <p className="mt-3 text-sm font-medium text-primary">
          No upcoming releases
        </p>
        <p className="mt-1 text-sm text-muted">
          Episodes airing today, tomorrow, and in the future will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul aria-label="Upcoming releases" className="space-y-2.5">
        {items.map((item) => {
          const posterUrl = getPosterUrl(item.media.posterPath);
          const episodeCode = formatEpisodeCode(
            item.episode.seasonNumber,
            item.episode.episodeNumber,
          );

          return (
            <li
              key={`${item.media.id}-${item.episode.seasonNumber}-${item.episode.episodeNumber}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-app-bg/60 p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-elevated/60">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={`${item.media.title} poster`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    {item.media.mediaType === "tv" ? (
                      <Tv aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Clapperboard aria-hidden="true" className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="min-w-0 truncate text-sm font-semibold text-primary">
                  <Link
                    to={`/library/tv/${item.media.id}`}
                    aria-label={`Open ${item.media.title} in your library`}
                    className="rounded transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
                  >
                    {item.media.title}
                  </Link>
                </p>

                <p className="mt-0.5 min-w-0 truncate text-xs text-muted">
                  <span className="font-semibold text-accent-text">
                    {episodeCode}
                  </span>
                  {` · ${item.episode.title}`}
                </p>

                <p className="mt-0.5 inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <CalendarDays
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span className="min-w-0 truncate">
                    {item.airDate} ·{" "}
                    {getUpcomingReleaseLabel(item.airDate, today)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        to="/upcoming"
        aria-label="View all upcoming releases"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
      >
        View Upcoming
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

