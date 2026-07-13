export interface TmdbSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TmdbBaseSearchResult {
  id: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TmdbMovieSearchResult extends TmdbBaseSearchResult {
  media_type?: "movie";
  title: string;
  original_title: string;
  release_date: string;
}

export interface TmdbTvSearchResult extends TmdbBaseSearchResult {
  media_type?: "tv";
  name: string;
  original_name: string;
  first_air_date: string;
}

export interface TmdbPersonSearchResult {
  id: number;
  media_type: "person";
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export type TmdbMediaSearchResult = TmdbMovieSearchResult | TmdbTvSearchResult;

export type TmdbMultiSearchResult =
  TmdbMediaSearchResult | TmdbPersonSearchResult;
