import {
  CalendarDays,
  Check,
  Clapperboard,
  Clock,
  RotateCcw,
} from "lucide-react";

import { tmdbConfig } from "../../../services/tmdb";

import type { PersistedEpisode } from "../../../types";

interface EpisodeCardProps {
  episode: PersistedEpisode;
  isUpdating: boolean;
  onToggleWatched: (episode: PersistedEpisode) => Promise<void>;
}

function formatRuntime(runtime: number | undefined): string {
  if (runtime === undefined) {
    return "Runtime unavailable";
  }

  return `${runtime} min`;
}

function getStillUrl(stillPath: string | undefined): string | null {
  if (!stillPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w300${stillPath}`;
}

export default function EpisodeCard({
  episode,
  isUpdating,
  onToggleWatched,
}: EpisodeCardProps) {
  const stillUrl = getStillUrl(episode.stillPath);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-video bg-app-bg">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={`${episode.title} still`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Clapperboard className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-elevated font-semibold text-accent-text">
            {episode.episodeNumber}
          </div>

          <div className="min-w-0">
            <h3
              className="truncate font-semibold text-primary"
              title={episode.title}
            >
              {episode.title}
            </h3>

            <p className="mt-1 text-sm text-muted">
              Season {episode.seasonNumber} · Episode {episode.episodeNumber}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatRuntime(episode.runtime)}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {episode.airDate ?? "Air date unavailable"}
          </span>
        </div>

        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              episode.watched
                ? "bg-success/10 text-success"
                : "bg-surface-elevated text-muted"
            }`}
          >
            {episode.watched ? "Watched" : "Unwatched"}
          </span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
          {episode.overview || "No episode overview available."}
        </p>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void onToggleWatched(episode)}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${
            episode.watched
              ? "bg-surface-elevated text-muted hover:bg-surface-hover hover:text-primary"
              : "bg-accent text-inverted hover:bg-accent-hover"
          }`}
        >
          {episode.watched ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}

          {isUpdating
            ? "Updating..."
            : episode.watched
              ? "Mark Unwatched"
              : "Mark Watched"}
        </button>
      </div>
    </article>
  );
}
