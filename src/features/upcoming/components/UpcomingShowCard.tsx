import { Tv } from "lucide-react";
import { Link } from "react-router-dom";

import { tmdbConfig } from "../../../services/tmdb";

import type { PersistedMedia } from "../../../types";
import type { CardDensity } from "../../ui/density";
import { CARD_TITLE_SIZE } from "../../ui/density";

function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w342${posterPath}`;
}

function formatSeasonLabel(seasonNumber: number): string {
  return `Season ${String(seasonNumber).padStart(2, "0")}`;
}

export interface UpcomingShowDateHint {
  /** Earliest YYYY-MM-DD air date among the month's episodes for this show. */
  firstAirDate: string;
  /** Latest YYYY-MM-DD air date among the month's episodes for this show. */
  lastAirDate: string;
  /** Number of upcoming episodes for this show within the month. */
  episodeCount: number;
}

interface UpcomingShowCardProps {
  /** The TV show this card represents. */
  media: PersistedMedia;
  /** Sorted distinct season numbers airing for this show within the month. */
  seasons: number[];
  /** Concise in-card release indicator derived from the month's air dates. */
  dateHint: UpcomingShowDateHint;
  density: CardDensity;
}

/**
 * Release-oriented show-level card for the Upcoming page.
 *
 * One card per (show, month) pair. The card represents the show — poster,
 * title, season information, a concise release indicator, and a View Show
 * link. Full episode detail lives on the existing Library TV page; it is
 * not duplicated here.
 *
 * Design constraints honoured:
 * - Vertical flex-col layout with natural height (no fixed-height clipping,
 *   no grid-cell overflow, no card overlap).
 * - Titles wrap naturally — no single-line truncation on the show title.
 * - Reuses the existing WatchLog density contract (CARD_TITLE_SIZE,
 *   density-based padding and poster max-height) — no independent sizing.
 */
export default function UpcomingShowCard({
  media,
  seasons,
  dateHint,
  density,
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

  const dateLabel =
    dateHint.firstAirDate === dateHint.lastAirDate
      ? `Premiering ${dateHint.firstAirDate}`
      : `New episodes from ${dateHint.firstAirDate}`;

  return (
    <article className="flex w-full flex-col self-start overflow-hidden rounded-xl border border-border bg-surface">
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

        <div className="mt-2 space-y-1">
          {seasons.map((seasonNumber) => (
            <p key={seasonNumber} className="text-sm text-muted">
              {formatSeasonLabel(seasonNumber)}
            </p>
          ))}
        </div>

        <p className="mt-2 text-sm text-muted">{dateLabel}</p>

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
