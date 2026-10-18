import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { Clapperboard, Play, Tv } from "lucide-react";

import { tmdbConfig } from "../../../services/tmdb";

import {
  CONTINUE_WATCHING_PREVIEW_LIMIT,
  getContinueWatchingWidgetItems,
  type ContinueWatchingWidgetItem,
} from "../services/continueWatchingWidgetService";

/*
 * Compact Continue Watching widget: unfinished stories with the next
 * unwatched episode, prominent locally stored artwork, and a full-width
 * Watch Next action. Deliberately free of progress percentages, bars, and
 * episodes-watched counts.
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
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <Clapperboard
          aria-hidden="true"
          className="mx-auto h-5 w-5 text-muted"
        />
        <p className="mt-1.5 text-sm font-medium text-primary">
          Nothing to continue yet
        </p>
      </div>
    );
  }

  return (
    <ul
      aria-label="Shows to continue watching"
      className="grid min-w-0 gap-3"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 13rem), 1fr))",
      }}
    >
      {items.map((item) => (
        <ContinueWatchingCard key={item.media.id} item={item} />
      ))}
    </ul>
  );
}

function ContinueWatchingCard({
  item,
}: {
  item: ContinueWatchingWidgetItem;
}) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const artworkUrl = item.artworkPath
    ? `${tmdbConfig.imageBaseUrl}/w342${item.artworkPath}`
    : null;

  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-border bg-app-bg/60">
      <div className="aspect-video w-full overflow-hidden bg-surface-elevated/60">
        {artworkUrl && !artworkFailed ? (
          <img
            src={artworkUrl}
            alt={`${item.media.title} artwork`}
            loading="lazy"
            decoding="async"
            onError={() => setArtworkFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={`Artwork unavailable for ${item.media.title}`}
            className="flex h-full w-full items-center justify-center text-muted"
          >
            {item.media.mediaType === "tv" ? (
              <Tv aria-hidden="true" className="h-8 w-8" />
            ) : (
              <Clapperboard aria-hidden="true" className="h-8 w-8" />
            )}
          </div>
        )}
      </div>

      <div className="p-3">
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
        </div>

        <div className="mt-2 min-w-0">
          <p className="truncate text-xs font-semibold text-accent-text">
            {`Next: S${item.nextEpisode.seasonNumber} E${item.nextEpisode.episodeNumber}`}
          </p>
          <p className="mt-0.5 min-w-0 truncate text-sm font-medium text-primary">
            {item.nextEpisode.title}
          </p>
        </div>

        <Link
          to={`/library/tv/${item.media.id}`}
          aria-label={`Watch next episode of ${item.media.title}: ${item.nextEpisode.title}`}
          className="mt-3 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          <Play aria-hidden="true" className="h-4 w-4 shrink-0 fill-current" />
          Watch Next
        </Link>
      </div>
    </li>
  );
}
