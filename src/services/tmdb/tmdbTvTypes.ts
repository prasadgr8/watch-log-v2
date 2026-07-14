export interface TmdbTvSeasonSummary {
  air_date: string | null;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_episodes: number;
  number_of_seasons: number;
  status: string;
  seasons: TmdbTvSeasonSummary[];
}

export interface TmdbTvEpisodeDetails {
  air_date: string | null;
  episode_number: number;
  episode_type?: string;
  id: number;
  name: string;
  overview: string;
  production_code?: string;
  runtime: number | null;
  season_number: number;
  show_id: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
}

export interface TmdbTvSeasonDetails {
  _id: string;
  air_date: string | null;
  episodes: TmdbTvEpisodeDetails[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}
