import { useState } from "react";
import { ChevronDown, ChevronRight, Film } from "lucide-react";

import type { ShowProgressRow, ShowProgressStatus } from "../services/statisticsService";

import ProgressBar from "./ProgressBar";

interface ShowProgressTableProps {
  shows: ShowProgressRow[];
}

function getStatusLabel(status: ShowProgressStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "partially-watched":
      return "In progress";
    case "unwatched":
      return "Unwatched";
    default:
      return "No episodes";
  }
}

function getStatusClassName(status: ShowProgressStatus): string {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "partially-watched":
      return "bg-accent/15 text-accent-text";
    case "unwatched":
      return "bg-surface-elevated text-muted";
    default:
      return "bg-surface-elevated text-muted";
  }
}

function getSeasonLabel(seasonNumber: number): string {
  return seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`;
}

/*
 * Per-show progress table with expandable per-season rows. Season 0 specials
 * are rendered separately as "Specials" and stay visually distinct from
 * regular seasons.
 */
export default function ShowProgressTable({
  shows,
}: ShowProgressTableProps) {
  const [expandedShowIds, setExpandedShowIds] = useState<Set<number>>(
    () => new Set(),
  );

  function toggleShow(showId: number): void {
    setExpandedShowIds((current) => {
      const next = new Set(current);

      if (next.has(showId)) {
        next.delete(showId);
      } else {
        next.add(showId);
      }

      return next;
    });
  }

  if (shows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <Film className="mx-auto h-8 w-8 text-muted" />

        <p className="mt-3 text-muted">
          No TV shows in your library yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shows.map((show) => {
        const isExpanded = expandedShowIds.has(show.showId);

        return (
          <article
            key={show.showId}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => toggleShow(show.showId)}
                className="flex min-w-0 items-center gap-2 text-left"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                )}

                <h3 className="truncate text-lg font-semibold text-primary">
                  {show.title}
                </h3>

                {show.specialEpisodeCount > 0 && (
                  <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-muted">
                    {show.specialEpisodeCount} special
                    {show.specialEpisodeCount === 1 ? "" : "s"}
                  </span>
                )}
              </button>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(show.status)}`}
              >
                {getStatusLabel(show.status)}
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">
                  {show.watchedEpisodeCount} of {show.totalEpisodeCount}{" "}
                  episodes watched
                </span>

                <span className="font-semibold text-accent-text">
                  {show.progressPercentage}%
                </span>
              </div>

              <ProgressBar
                value={show.progressPercentage}
                label={`${show.title} progress`}
              />
            </div>

            {isExpanded && (
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {show.seasons.map((season) => (
                  <div
                    key={season.seasonNumber}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-app-bg/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {getSeasonLabel(season.seasonNumber)}
                      </span>

                      <span className="text-sm text-muted">
                        {season.watchedEpisodeCount} /{" "}
                        {season.totalEpisodeCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-28">
                        <ProgressBar
                          value={season.progressPercentage}
                          label={`${show.title} ${getSeasonLabel(season.seasonNumber)} progress`}
                        />
                      </div>

                      <span className="w-10 text-right text-sm font-medium text-muted">
                        {season.progressPercentage}%
                      </span>
                    </div>
                  </div>
                ))}

                {show.seasons.length === 0 && (
                  <p className="text-sm text-muted">
                    No season episodes have been synchronized yet.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}