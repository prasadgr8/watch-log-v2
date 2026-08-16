import { tmdbRequest } from "./tmdbClient";

import type {
  TmdbMultiSearchResult,
  TmdbMovieSearchResult,
  TmdbSearchResponse,
  TmdbTvSearchResult,
} from "./tmdbTypes";

function normalizeQuery(query: string): string {
  return query.trim();
}

export const tmdbSearchService = {
  async searchMovies(
    query: string,
    page = 1,
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }

    return tmdbRequest<TmdbSearchResponse<TmdbMovieSearchResult>>(
      "/search/movie",
      {
        query: {
          query: normalizedQuery,
          page,
          include_adult: false,
          language: "en-US",
        },
      },
    );
  },

  async searchTvShows(
    query: string,
    page = 1,
    firstAirDateYear?: number,
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }

    return tmdbRequest<TmdbSearchResponse<TmdbTvSearchResult>>("/search/tv", {
      query: {
        query: normalizedQuery,
        page,
        include_adult: false,
        language: "en-US",
        first_air_date_year: firstAirDateYear,
      },
    });
  },

  async searchMedia(
    query: string,
    page = 1,
  ): Promise<TmdbSearchResponse<TmdbMultiSearchResult>> {
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }

    return tmdbRequest<TmdbSearchResponse<TmdbMultiSearchResult>>(
      "/search/multi",
      {
        query: {
          query: normalizedQuery,
          page,
          include_adult: false,
          language: "en-US",
        },
      },
    );
  },
};
