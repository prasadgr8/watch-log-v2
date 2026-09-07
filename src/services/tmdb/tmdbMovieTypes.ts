import type { TmdbGenreRef } from "./tmdbTypes";

export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres?: TmdbGenreRef[];
}
