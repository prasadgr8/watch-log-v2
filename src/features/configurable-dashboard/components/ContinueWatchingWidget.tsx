import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight, Clapperboard } from "lucide-react";

import {
  CONTINUE_WATCHING_PREVIEW_LIMIT,
  getContinueWatchingWidgetItems,
  type ContinueWatchingWidgetItem,
} from "../services/continueWatchingWidgetService";

function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber,
  ).padStart(2, "0")}`;
}

function formatLastWatched(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

/*
 * Compact Continue Watching widget: unfinished stories with the next
 * unwatched episode, the last-watch date for context, and a Watch Next
 * action into the TV/library destination. Deliberately free of progress
 * percentage, progress bars, and episodes-watched counts — "Up Next" is the
 * only progress-adjacent concept exposed.
 */
export default function ContinueWatchingWidget() {
  const [items, setItems] = useState<ContinueWatchingWidgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadContinueWatching(): Promise<void> {
      try {
        setError(null);

        const widgetItems =
          await getContinueWatchingWidgetItems(
            CONTINUE_WATCHING_PREVIEW_LIMIT,
          );

        if (isActive) {
          setItems(widgetItems);
        }
      } catch {
        if (isActive) {
          setError("Unable to load Continue Watching.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadContinueWatching();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Continue Watching...
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
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 p-6 text-center">
        <Clapperboard
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted"
        />
        <p className="mt-3 text-sm font-medium text-primary">
          Nothing to continue yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Shows you started will appear here with the next episode to watch.
        </p>
      </div>
    );
  }

  return (
    <ul aria-label="Shows to continue watching" className="space-y-3">
      {items.map((item) => (
        <li
          key={item.media.id}
          className="rounded-lg border border-border bg-app-bg/60 p-4"
        >
          <div className="min-w-0">
            <p className="min-w-0 truncate text-sm font-semibold text-primary">
              <Link
                to={`/library/tv/${item.media.id}`}
                aria-label={`Open ${item.media.title} in your library`}
                className="rounded transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                {item.media.title}
              </Link>
            </p>

            <p className="mt-1 text-xs text-muted">
              Last watched {formatLastWatched(item.lastWatchedAt)}
            </p>
          </div>

          <div className="mt-3 rounded-md bg-surface-elevated/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Up Next
            </p>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 rounded-md bg-surface-elevated px-2 py-1 text-xs font-semibold text-accent-text">
                {formatEpisodeCode(
                  item.nextEpisode.seasonNumber,
                  item.nextEpisode.episodeNumber,
                )}
              </span>

              <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                {item.nextEpisode.title}
              </p>
            </div>
          </div>

          <Link
            to={`/library/tv/${item.media.id}`}
            aria-label={`Watch next episode of ${item.media.title}: ${item.nextEpisode.title}`}
            className="mt-3 inline-flex min-w-0 items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            Watch Next
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
