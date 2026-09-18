import { tmdbRequest } from "./tmdbClient";

import type { TmdbWatchProvidersResponse } from "./tmdbAvailabilityTypes";

function validateTmdbId(tmdbId: number): void {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error("TMDB ID must be a positive integer.");
  }
}

export const tmdbAvailabilityService = {
  async getMovieWatchProviders(
    tmdbId: number,
  ): Promise<TmdbWatchProvidersResponse> {
    validateTmdbId(tmdbId);

    return tmdbRequest<TmdbWatchProvidersResponse>(
      `/movie/${tmdbId}/watch/providers`,
    );
  },

  async getTvWatchProviders(
    tmdbId: number,
  ): Promise<TmdbWatchProvidersResponse> {
    validateTmdbId(tmdbId);

    return tmdbRequest<TmdbWatchProvidersResponse>(
      `/tv/${tmdbId}/watch/providers`,
    );
  },
};
