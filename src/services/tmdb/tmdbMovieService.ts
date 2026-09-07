import { tmdbRequest } from "./tmdbClient";

import type { TmdbMovieDetails } from "./tmdbMovieTypes";

function validateTmdbId(tmdbId: number): void {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error("TMDB ID must be a positive integer.");
  }
}

export const tmdbMovieService = {
  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    validateTmdbId(tmdbId);

    return tmdbRequest<TmdbMovieDetails>(`/movie/${tmdbId}`);
  },
};
