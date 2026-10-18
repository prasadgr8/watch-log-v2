import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { Clock3, Film } from "lucide-react";

import {
  RECENTLY_WATCHED_PREVIEW_LIMIT,
  getRecentlyWatchedWidgetItems,
  type RecentlyWatchedWidgetItem,
} from "../services/recentlyWatchedWidgetService";

function formatWatchedAt(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/*
 * Compact Recently Watched widget: recent actual watch activity (newest
 * first), visually and semantically distinct from Continue Watching. Rows
 * are timestamped history ("Watched ..."), never forward-looking next-episode
 * cards and never statistics — no counts, totals, or percentages.
 */
export default function RecentlyWatchedWidget() {
  const [items, setItems] = useState<RecentlyWatchedWidgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadRecentlyWatched(): Promise<void> {
      try {
        setError(null);

        const widgetItems =
          await getRecentlyWatchedWidgetItems(
            RECENTLY_WATCHED_PREVIEW_LIMIT,
          );

        if (isActive) {
          setItems(widgetItems);
        }
      } catch {
        if (isActive) {
          setError("Unable to load Recently Watched.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRecentlyWatched();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Recently Watched...
      </p>
    );
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <Film aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
        <p className="mt-1.5 text-sm font-medium text-primary">
          No recent activity yet
        </p>
      </div>
    );
  }

  return (
    <ul aria-label="Recently watched activity" className="space-y-3">
      {items.map((item) => (
        <li
          key={item.eventId}
          className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border bg-app-bg/60 px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="min-w-0 truncate text-sm font-semibold text-primary">
              {item.mediaId !== null ? (
                <Link
                  to={
                    item.kind === "movie"
                      ? `/library/movie/${item.mediaId}`
                      : `/library/tv/${item.mediaId}`
                  }
                  aria-label={`Open ${item.title} in your library`}
                  className="rounded transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
                >
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </p>

            {item.episodeCode !== null && (
              <p className="mt-0.5 min-w-0 truncate text-xs text-muted">
                <span className="font-semibold text-accent-text">
                  {item.episodeCode}
                </span>
                {item.episodeTitle ? ` · ${item.episodeTitle}` : null}
              </p>
            )}

            {item.kind === "movie" && (
              <p className="mt-0.5 text-xs text-muted">Movie</p>
            )}
          </div>

          <p className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Watched {formatWatchedAt(item.watchedAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
