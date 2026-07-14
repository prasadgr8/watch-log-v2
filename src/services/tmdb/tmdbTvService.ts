import { tmdbRequest } from "./tmdbClient";

import type { TmdbTvDetails, TmdbTvSeasonDetails } from "./tmdbTvTypes";

function validateTmdbId(tmdbId: number): void {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error("TMDB ID must be a positive integer.");
  }
}

function validateSeasonNumber(seasonNumber: number): void {
  if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
    throw new Error("Season number must be a non-negative integer.");
  }
}

export const tmdbTvService = {
  async getTvDetails(tmdbId: number): Promise<TmdbTvDetails> {
    validateTmdbId(tmdbId);

    return tmdbRequest<TmdbTvDetails>(`/tv/${tmdbId}`);
  },

  async getSeasonDetails(
    tmdbId: number,
    seasonNumber: number,
  ): Promise<TmdbTvSeasonDetails> {
    validateTmdbId(tmdbId);
    validateSeasonNumber(seasonNumber);

    return tmdbRequest<TmdbTvSeasonDetails>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
    );
  },
};
