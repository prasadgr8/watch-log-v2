import { useState, type FormEventHandler } from "react";
import { Search } from "lucide-react";

import { tmdbSearchService, type TmdbTvSearchResult } from "../../../services/tmdb";

import type { TvTimeMatchDecision } from "../../import/types/tvTimeImportPlan";

interface ManualMatchSearchProps {
  /** The TV Time show title, used as the initial search query. */
  showTitle: string;

  /** TV Time show id used as the resolution key. */
  tvTimeShowId: string;

  /** Called when the user picks a TMDB match. */
  onResolve: (tvTimeShowId: string, decision: TvTimeMatchDecision) => void;

  /** Called when the user dismisses the manual match UI. */
  onCancel: () => void;
}

/**
 * Presents a search box that queries TMDB for a TV Time show that could not be
 * confidently matched. The user picks a result and it is surfaced as a
 * manual-match resolution via `onResolve`.
 */
export default function ManualMatchSearch({
  showTitle,
  tvTimeShowId,
  onResolve,
  onCancel,
}: ManualMatchSearchProps) {
  const [query, setQuery] = useState(showTitle);
  const [results, setResults] = useState<TmdbTvSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setError("Please enter a show title.");
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const response = await tmdbSearchService.searchTvShows(normalizedQuery);

      setResults(response.results);
      setHasSearched(true);
    } catch (searchError) {
      console.error("Manual match search failed:", searchError);
      setResults([]);
      setHasSearched(true);
      setError("Unable to search TMDB right now. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: TmdbTvSearchResult) => {
    onResolve(tvTimeShowId, {
      decision: "use",
      tmdbId: result.id,
      tmdbShow: result,
    });
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface/60 p-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search TMDB for a match"
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-input-bg py-2 pl-10 pr-3 text-sm text-primary outline-none transition placeholder:text-muted focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-primary"
        >
          Cancel
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger/60 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}

      {hasSearched && !error && results.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          No TV shows found. Try a different title.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((result) => {
            const year = result.first_air_date?.slice(0, 4);

            return (
              <li
                key={result.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {result.name}
                  </p>

                  {year && (
                    <p className="text-xs text-muted">{year}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="shrink-0 rounded-lg bg-accent/15 px-3 py-1 text-xs font-medium text-accent-text transition hover:bg-accent/25"
                >
                  Use this
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}