export interface FollowedTvShow {
  tv_show_id: string;
  tv_show_name: string;
  created_at: string;
  updated_at: string;
  active: string;
}

export interface UserTvShowData {
  tv_show_id: string;
  tv_show_name: string;
  is_followed: string;
  is_favorited: string;
  nb_episodes_seen: string;
}

export interface SeenEpisodeLatest {
  tv_show_id: string;
  tv_show_name: string;
  episode_season_number: string;
  episode_number: string;
  updated_at: string;
}
export interface UserTvShowData {
  user_id: string;
  tv_show_id: string;
  tv_show_name: string;
  is_followed: string;
  is_favorited: string;
  nb_episodes_seen: string;
}
export interface SeenEpisodeLatest {
  user_id: string;
  tv_show_id: string;
  episode_id: string;
}
export interface ShowSeenEpisodeLatest {
  tv_show_id: string;
  episode_id: string;
  user_id: string;
}
export interface ShowSeenEpisodeLatest {
  user_id: string;
  tv_show_id: string;
  episode_id: string;
}
