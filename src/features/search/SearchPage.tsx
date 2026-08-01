import { type FormEventHandler, useState } from "react";
import { Search } from "lucide-react";

import { mediaRepository } from "../../database/repositories";
import { libraryService } from "../library/services/libraryService";
import {
  mapTmdbResultToMedia,
  tmdbSearchService,
  type TmdbMediaSearchResult,
  type TmdbMultiSearchResult,
} from "../../services/tmdb";

import type { MediaType } from "../../types";

import TmdbSearchResultCard from "./components/TmdbSearchResultCard";

function isMediaResult(
  result: TmdbMultiSearchResult,
): result is TmdbMediaSearchResult {
  return result.media_type === "movie" || result.media_type === "tv";
}

function getMediaType(result: TmdbMediaSearchResult): MediaType {
  return "title" in result ? "movie" : "tv";
}

function getMediaKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}-${tmdbId}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [libraryKeys, setLibraryKeys] = useState<Set<string>>(() => new Set());

  const [addingKey, setAddingKey] = useState<string | null>(null);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setError("Please enter a TV show or movie title.");
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const response = await tmdbSearchService.searchMedia(normalizedQuery);

      const mediaResults = response.results.filter(isMediaResult);

      const storedMedia = await mediaRepository.getAll();

      const storedKeys = new Set(
        storedMedia
          .filter((item) => item.tmdbId !== undefined)
          .map((item) => getMediaKey(item.tmdbId!, item.mediaType)),
      );

      setResults(mediaResults);
      setLibraryKeys(storedKeys);
      setHasSearched(true);
    } catch (searchError) {
      console.error("TMDB search failed:", searchError);

      setResults([]);
      setHasSearched(true);
      setError("Unable to search TMDB right now. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  async function handleAddToLibrary(
    result: TmdbMediaSearchResult,
  ): Promise<void> {
    const mediaType = getMediaType(result);
    const mediaKey = getMediaKey(result.id, mediaType);

    try {
      setAddingKey(mediaKey);
      setError(null);

      const existingMedia = await mediaRepository.getByTmdbId(
        result.id,
        mediaType,
      );

      if (existingMedia) {
        setLibraryKeys((currentKeys) => {
          const nextKeys = new Set(currentKeys);

          nextKeys.add(mediaKey);

          return nextKeys;
        });

        return;
      }

      const media = mapTmdbResultToMedia(result);

      await libraryService.addMedia(media);

      setLibraryKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);

        nextKeys.add(mediaKey);

        return nextKeys;
      });
    } catch (addError) {
      console.error("Failed to add TMDB media to library:", addError);

      setError("Unable to add this media item to your library.");
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Media Search</h1>

        <p className="mt-2 text-slate-400">
          Search TMDB for TV shows and movies.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="media-search">
            Search for a TV show or movie
          </label>

          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            />

            <input
              id="media-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a TV show or movie"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-4 w-4" />

            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}
      </section>

      {hasSearched && !error && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Search Results</h2>

            <span className="text-sm text-slate-400">
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-500" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                No media found
              </h3>

              <p className="mt-2 text-slate-400">
                Try searching with a different title.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((result) => {
                const mediaType = getMediaType(result);
                const mediaKey = getMediaKey(result.id, mediaType);

                return (
                  <TmdbSearchResultCard
                    key={mediaKey}
                    result={result}
                    isInLibrary={libraryKeys.has(mediaKey)}
                    isAdding={addingKey === mediaKey}
                    onAdd={handleAddToLibrary}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
