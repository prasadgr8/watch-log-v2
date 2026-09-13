import { CalendarDays, Check, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import { tmdbConfig } from "../../../services/tmdb";
import { getRelativeAirDateLabel } from "../../../domain/dates/airDate";

import type { PersistedMedia } from "../../../types";
import type { UpcomingEpisodeItem } from "../services/upcomingEpisodesService";
import type { CardDensity } from "../../ui/density";
import { CARD_TITLE_SIZE } from "../../ui/density";

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Formats a YYYY-MM-DD air date as "Mon DD" (e.g. "Oct 21").
 * Pure string arithmetic — no Date parsing, no timezone normalization.
 */
function formatShortDate(airDate: string): string {
  const monthIndex = Number(airDate.slice(5, 7)) - 1;
  const day = airDate.slice(8, 10);

  return `${MONTH_ABBREVIATIONS[monthIndex]} ${day}`;
}

function formatEpisodeCode(
  seasonNumber: number,
  episodeNumber: number,
): string {
  const season = String(seasonNumber).padStart(2, "0");
  const episode = String(episodeNumber).padStart(2, "0");

  return `S${season}E${episode}`;
}

function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w342${posterPath}`;
}

interface UpcomingShowCardProps {
  /** The TV show this card represents. */
  media: PersistedMedia;
  /** All upcoming episodes for this show within the current Month/Year. */
  episodes: UpcomingEpisodeItem[];
  density: CardDensity;
  /** Local today as YYYY-MM-DD, for relative-date labels. */
  today: string;
}

/**
 * Release-oriented show-level card for the Upcoming Episodes page.
 *
 * One card per (show, month) pair. The poster and title link to the TV show
 * detail route. Each upcoming episode is listed with its SxxEyy code, title,
 * exact air date, relative label, and watched indicator.
 *
 * Design constraints honoured:
 * - Vertical flex-col layout (not horizontal flex-wrap) to prevent grid-cell
 *   overflow and card overlap.
 * - Natural height: no fixed-height clipping on the poster or content area.
 * - Titles wrap naturally — no single-line truncation on the show title.
 * - Reuses the existing WatchLog density contract (CARD_TITLE_SIZE, density-
 *   based padding and poster max-height) — no independent sizing system.
 */
export default function UpcomingShowCard({
  media,
  episodes,
  density,
  today,
}: UpcomingShowCardProps) {
  const posterUrl = getPosterUrl(media.posterPath);

  const maxPosterHeight =
    density === "compact"
      ? "max-h-48"
      : density === "large"
        ? "max-h-80"
        : "max-h-64";

  const contentPadding =
    density === "compact" ? "p-3" : density === "large" ? "p-5" : "p-4";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <Link
        to={`/library/tv/${media.id}`}
        aria-label={`View ${media.title} details`}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
      >
        <div className={`aspect-[2/3] bg-app-bg mx-auto ${maxPosterHeight}`}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={`${media.title} poster`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <Tv aria-hidden="true" className="h-10 w-10" />
            </div>
          )}
        </div>
      </Link>

      <div className={contentPadding}>
        <h2
          className={`font-semibold text-primary ${CARD_TITLE_SIZE[density]}`}
          title={media.title}
        >
          {media.title}
        </h2>

        <ul className="mt-3 space-y-2">
          {episodes.map((item) => {
            const episodeCode = formatEpisodeCode(
              item.episode.seasonNumber,
              item.episode.episodeNumber,
            );
            const shortDate = formatShortDate(item.airDate);
            const relativeLabel =
              getRelativeAirDateLabel(item.airDate, today) ?? item.airDate;

            return (
              <li
                key={`${item.episode.seasonNumber}-${item.episode.episodeNumber}-${item.airDate}`}
                className="flex flex-col"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium text-accent-text">
                    {episodeCode}
                  </span>

                  <span className="text-sm text-muted" aria-hidden="true">
                    ·
                  </span>

                  <span
                    className="text-sm text-primary"
                    title={item.episode.title}
                  >
                    {item.episode.title}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <CalendarDays
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0"
                  />

                  <span>{shortDate}</span>

                  <span className="text-muted" aria-hidden="true">
                    ·
                  </span>

                  <span>{relativeLabel}</span>

                  {item.episode.watched && (
                    <span
                      className="inline-flex items-center gap-1 text-success"
                      aria-label="Watched"
                      title="Watched"
                    >
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-3">
          <Link
            to={`/library/tv/${media.id}`}
            aria-label={`View ${media.title} on the TV show page`}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-text transition-colors hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            View Show
          </Link>
        </div>
      </div>
    </article>
  );
}
