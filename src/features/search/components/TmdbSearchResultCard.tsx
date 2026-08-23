import { Film, Star, Tv } from "lucide-react";

import { tmdbConfig, type TmdbMediaSearchResult } from "../../../services/tmdb";

interface TmdbSearchResultCardProps {
  result: TmdbMediaSearchResult;
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

  return `${tmdbConfig.imageBaseUrl}/w342${result.poster_path}`;
}

export default function TmdbSearchResultCard({
  result,
  isInLibrary,
  isAdding,
  onAdd,
}: TmdbSearchResultCardProps) {
  const title = getTitle(result);
  const releaseYear = getReleaseYear(result);
  const posterUrl = getPosterUrl(result);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-[2/3] bg-app-bg">
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
              <Film className="h-12 w-12" />
            ) : (
              <Tv className="h-12 w-12" />
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-primary" title={title}>
              {title}
            </h3>

            <p className="mt-1 text-sm text-muted">
              {releaseYear ?? "Release year unavailable"}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 text-sm text-warning">
            <Star className="h-4 w-4" />

            {result.vote_average.toFixed(1)}
          </span>
        </div>

        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
            {result.media_type === "movie" ? (
              <Film className="h-3.5 w-3.5" />
            ) : (
              <Tv className="h-3.5 w-3.5" />
            )}

            {result.media_type === "movie" ? "Movie" : "TV Show"}
          </span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
          {result.overview || "No overview available."}
        </p>
        <button
  type="button"
  disabled={isInLibrary || isAdding}
  onClick={() => void onAdd(result)}
  className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-muted"
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
