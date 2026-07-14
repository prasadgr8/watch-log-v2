export interface Episode {
  id?: number;
  showId: number;
  tmdbId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  runtime?: number;
  stillPath?: string;
  airDate?: string;
  voteAverage?: number;
  watched: boolean;
  watchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PersistedEpisode = Episode & {
  id: number;
};
