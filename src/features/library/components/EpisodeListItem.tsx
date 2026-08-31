import {
  CalendarDays,
  Check,
  Clapperboard,
  Clock,
  RotateCcw,
} from "lucide-react";

import { tmdbConfig } from "../../../services/tmdb";

import type { PersistedEpisode } from "../../../types";

interface EpisodeListItemProps {
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

  return `${tmdbConfig.imageBaseUrl}/w92${stillPath}`;
}

export default function EpisodeListItem({
  episode,
  isUpdating,
  onToggleWatched,
}: EpisodeListItemProps) {
  const stillUrl = getStillUrl(episode.stillPath);

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-app-bg">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={`${episode.title} still`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Clapperboard className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Season {episode.seasonNumber} · Episode {episode.episodeNumber}
        </p>

        <h3
          className="mt-1 truncate font-semibold text-primary"
          title={episode.title}
        >
          {episode.title}
        </h3>

        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatRuntime(episode.runtime)}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {episode.airDate ?? "Air date unavailable"}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
          {episode.overview || "No episode overview available."}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            episode.watched
              ? "bg-success/10 text-success"
              : "bg-surface-elevated text-muted"
          }`}
        >
          {episode.watched ? "Watched" : "Unwatched"}
        </span>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void onToggleWatched(episode)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${
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
