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
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
        <Film className="mx-auto h-10 w-10 text-slate-500" />

        <h3 className="mt-4 text-lg font-semibold text-white">
          No episodes found
        </h3>

        <p className="mt-2 text-slate-400">
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
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-semibold text-blue-400">
                {episode.episodeNumber}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Season {episode.seasonNumber} · Episode{" "}
                      {episode.episodeNumber}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-white">
                      {episode.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      episode.watched
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {episode.watched ? "Watched" : "Unwatched"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatRuntime(episode.runtime)}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {episode.airDate ?? "Air date unavailable"}
                  </span>
                </div>

                <p className="mt-4 leading-6 text-slate-400">
                  {episode.overview || "No episode overview available."}
                </p>

                <div className="mt-5">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => void onToggleWatched(episode)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${
                      episode.watched
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-blue-600 text-white hover:bg-blue-500"
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
