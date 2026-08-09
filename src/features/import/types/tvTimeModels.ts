export interface FollowedTvShow {
  tv_show_id: string;
  tv_show_name: string;
  created_at: string;
  updated_at: string;
  active: string;
}

export interface UserTvShowData {
  user_id: string;
  tv_show_id: string;
  tv_show_name: string;
  is_followed: string;
  is_favorited: string;
  nb_episodes_seen: string;
}

export interface SeenEpisodeSource {
  episode_number: string;
  user_id: string;
  episode_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  episode_season_number: string;
}

export interface WatchedOnEpisode {
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  episode_season_number: string;
  episode_number: string;
  user_id: string;
  episode_id: string;
  watched_on_source_id: string;
}

export interface ShowSeenEpisodeLatest {
  tv_show_id: string;
  episode_id: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
  user_id: string;
}

export interface SeenEpisodeLatest {
  episode_season_number: string;
  episode_number: string;
  user_id: string;
  episode_id: string;
  created_at: string;
  updated_at: string;
  tv_show_name: string;
}
