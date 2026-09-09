import { Film, Star, Tv } from "lucide-react";

import { tmdbConfig, type TmdbMediaSearchResult } from "../../../services/tmdb";

import type { CardDensity } from "../../ui/density";
import { LIST_PADDING, LIST_THUMBNAIL, CARD_TITLE_SIZE } from "../../ui/density";

interface TmdbSearchResultListItemProps {
  result: TmdbMediaSearchResult;
  density?: CardDensity;
  isInLibrary: boolean;
  isAdding: boolean;
  onAdd: (result: TmdbMediaSearchResult) => Promise<void>;
}

function getTitle(result: TmdbMediaSearchResult): string {
  return "title" in result ? result.title : result.name;
}

function getReleaseYear(
  result: TmdbMediaSearchResult,
): string | null {
  const date =
    "release_date" in result
      ? result.release_date
      : result.first_air_date;

  if (!date) {
    return null;
  }

  return date.slice(0, 4);
}

function getPosterUrl(result: TmdbMediaSearchResult): string | null {
  if (!result.poster_path) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w92${result.poster_path}`;
}

/*
 * Compact list presentation of a TMDB search result. Shares the exact props
 * contract and add-to-library semantics with TmdbSearchResultCard so SearchPage
 * can drive both presentations from the same results array and handler.
 */
export default function TmdbSearchResultListItem({
  result,
  density = "comfortable",
  isInLibrary,
  isAdding,
  onAdd,
}: TmdbSearchResultListItemProps) {
  const title = getTitle(result);
  const releaseYear = getReleaseYear(result);
  const posterUrl = getPosterUrl(result);

  return (
    <article className={`flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface ${LIST_PADDING[density]}`}>
      <div className={`shrink-0 overflow-hidden rounded-lg bg-app-bg ${LIST_THUMBNAIL[density]}`}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${title} poster`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            {result.media_type === "movie" ? (
              <Film className="h-5 w-5" />
            ) : (
              <Tv className="h-5 w-5" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className={`truncate font-semibold text-primary ${CARD_TITLE_SIZE[density]}`} title={title}>
          {title}
        </h3>

        <p className="mt-1 text-sm text-muted">
          {releaseYear ?? "Release year unavailable"}
        </p>

        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
          {result.overview || "No overview available."}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <span className="inline-flex shrink-0 items-center gap-1 text-sm text-warning">
          <Star className="h-4 w-4" />

          {result.vote_average.toFixed(1)}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
          {result.media_type === "movie" ? (
            <Film className="h-3.5 w-3.5" />
          ) : (
            <Tv className="h-3.5 w-3.5" />
          )}

          {result.media_type === "movie" ? "Movie" : "TV Show"}
        </span>

        <button
          type="button"
          disabled={isInLibrary || isAdding}
          onClick={() => void onAdd(result)}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-muted"
        >
          {isInLibrary
            ? "In Library"
            : isAdding
              ? "Adding..."
              : "Add to Library"}
        </button>
      </div>
    </article>
  );
}
