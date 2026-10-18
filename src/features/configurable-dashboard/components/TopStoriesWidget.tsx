import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { Film, List, Tv } from "lucide-react";

import {
  getTopStoriesData,
  TOP_STORIES_PREVIEW_LIMIT,
  type TopStoriesMediaType,
  type TopStoryItem,
} from "../services/topStoriesWidgetService";

/* Your Top Stories: ranked stories from local watch activity with a TV Shows
 * / Movies toggle. Ranking is deterministic (watch count, then title). */
export default function TopStoriesWidget() {
  const [data, setData] = useState<{ items: TopStoryItem[] } | null>(null);
  const [mediaType, setMediaType] = useState<TopStoriesMediaType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTopStories(): Promise<void> {
      try {
        setError(null);

        const stories = await getTopStoriesData(mediaType);

        if (isActive) {
          setData(stories);
        }
      } catch {
        if (isActive) {
          setError("Unable to load Your Top Stories.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTopStories();

    return () => {
      isActive = false;
    };
  }, [mediaType]);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Your Top Stories...
      </p>
    );
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">{error}</p>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <List aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
        <p className="mt-1.5 text-sm font-medium text-primary">
          No top stories yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section
        role="group"
        aria-label="Story type filter"
        className="flex items-center gap-2"
      >
        <button
          type="button"
          aria-pressed={mediaType === "all"}
          data-active={mediaType === "all"}
          onClick={() => setMediaType("all")}
          className="toggle-button shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={mediaType === "tv"}
          data-active={mediaType === "tv"}
          onClick={() => setMediaType("tv")}
          className="toggle-button shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          <Tv aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          TV
        </button>
        <button
          type="button"
          aria-pressed={mediaType === "movie"}
          data-active={mediaType === "movie"}
          onClick={() => setMediaType("movie")}
          className="toggle-button shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          <Film aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          Movies
        </button>
      </section>

      <ul aria-label="Top stories" className="space-y-2">
        {items.slice(0, TOP_STORIES_PREVIEW_LIMIT).map((item) => (
          <li
            key={item.mediaId}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-app-bg/60 p-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                to={
                  item.mediaType === "tv"
                    ? `/library/tv/${item.mediaId}`
                    : `/library/movie/${item.mediaId}`
                }
                aria-label={`Open ${item.title} in your library`}
                className="min-w-0 truncate block rounded transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                {item.title}
              </Link>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="font-semibold text-accent-text">
                  {item.mediaType === "tv" ? "TV" : "Movie"}
                </span>
                {item.distinctEpisodesWatched > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    {item.distinctEpisodesWatched} episode{item.distinctEpisodesWatched !== 1 ? "s" : ""} watched
                  </>
                )}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-primary">
              {item.watchCount}
            </p>
          </li>
        ))}
      </ul>

    </div>
  );
}