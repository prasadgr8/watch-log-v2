import { CalendarDays, Check, Clock, Film, RotateCcw } from "lucide-react";

import type { PersistedEpisode } from "../../../types";

interface EpisodeListProps {
  episodes: PersistedEpisode[];
  updatingEpisodeId: number | null;
  onToggleWatched: (episode: PersistedEpisode) => Promise<void>;
}

function formatRuntime(runtime: number | undefined): string {
  if (runtime === undefined) {
    return "Runtime unavailable";
  }

  return `${runtime} min`;
}

export default function EpisodeList({
  episodes,
  updatingEpisodeId,
  onToggleWatched,
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
        <Film className="mx-auto h-10 w-10 text-muted" />

        <h3 className="mt-4 text-lg font-semibold text-primary">
          No episodes found
        </h3>

        <p className="mt-2 text-muted">
          This season does not currently contain episode metadata.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {episodes.map((episode) => {
        const isUpdating = updatingEpisodeId === episode.id;

        return (
          <article
            key={episode.id}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-elevated font-semibold text-accent-text">
                {episode.episodeNumber}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Season {episode.seasonNumber} · Episode{" "}
                      {episode.episodeNumber}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-primary">
                      {episode.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      episode.watched
                        ? "bg-success/10 text-success"
                        : "bg-surface-elevated text-muted"
                    }`}
                  >
                    {episode.watched ? "Watched" : "Unwatched"}
                  </span>
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

                <p className="mt-4 leading-6 text-muted">
                  {episode.overview || "No episode overview available."}
                </p>

                <div className="mt-5">
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
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
