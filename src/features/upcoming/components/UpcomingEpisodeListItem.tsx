import { CalendarDays, Check, Clapperboard, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import { tmdbConfig } from "../../../services/tmdb";

import type { UpcomingEpisodeItem } from "../services/upcomingEpisodesService";

interface UpcomingEpisodeListItemProps {
  item: UpcomingEpisodeItem;
  relativeLabel: string;
}

function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w92${posterPath}`;
}

function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  const season = String(seasonNumber).padStart(2, "0");
  const episode = String(episodeNumber).padStart(2, "0");

  return `S${season}E${episode}`;
}

export default function UpcomingEpisodeListItem({
  item,
  relativeLabel,
}: UpcomingEpisodeListItemProps) {
  const { media, episode } = item;
  const posterUrl = getPosterUrl(media.posterPath);
  const episodeCode = formatEpisodeCode(
    episode.seasonNumber,
    episode.episodeNumber,
  );

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-app-bg">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${media.title} poster`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            {media.mediaType === "tv" ? (
              <Tv aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Clapperboard aria-hidden="true" className="h-5 w-5" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className="truncate font-semibold text-primary"
          title={media.title}
        >
          <Link
            to={`/library/tv/${media.id}`}
            aria-label={`View ${media.title} details`}
            className="rounded-lg transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            {media.title}
          </Link>
        </h3>

        <p className="mt-0.5 text-sm text-muted">
          <span className="font-medium text-accent-text">{episodeCode}</span>
          {" · "}
          {episode.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {item.airDate} · {relativeLabel}
          </span>

          {episode.watched && (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check aria-hidden="true" className="h-4 w-4" />
              Watched
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
