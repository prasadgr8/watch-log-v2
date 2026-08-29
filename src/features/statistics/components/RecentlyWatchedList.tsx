import { Clock3, Film } from "lucide-react";

import type { RecentActivityStatistics } from "../services/statisticsService";

interface RecentlyWatchedListProps {
  activity: RecentActivityStatistics;
}

function getEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber,
  ).padStart(2, "0")}`;
}

function formatWatchedDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/*
 * Shows the most recent watched episodes with their show, episode code, title,
 * and watched date. The list is derived from the episode watch-state cache.
 */
export default function RecentlyWatchedList({
  activity,
}: RecentlyWatchedListProps) {
  if (activity.recentlyWatched.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <Film className="mx-auto h-8 w-8 text-muted" />

        <p className="mt-3 text-muted">
          No watched episodes yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activity.recentlyWatched.map((item) => (
        <article
          key={item.episodeId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              {item.showTitle}
            </p>

            <p className="mt-1 truncate text-sm text-muted">{item.title}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-md bg-surface-elevated px-2 py-1 text-sm font-semibold text-accent-text">
              {getEpisodeCode(item.seasonNumber, item.episodeNumber)}
            </span>

            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Clock3 className="h-4 w-4" />

              {formatWatchedDate(item.watchedAt)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}