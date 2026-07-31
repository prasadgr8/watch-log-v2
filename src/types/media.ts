export type MediaType = "tv" | "movie";

export type WatchStatus =
  "planned" | "watching" | "completed" | "on-hold" | "dropped";

export interface BaseMedia {
  id?: number;
  tmdbId?: number;
  mediaType: MediaType;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  userStatus: WatchStatus;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface TVShow extends BaseMedia {
  mediaType: "tv";
  firstAirDate?: string;
  showStatus?: string;
}

export interface Movie extends BaseMedia {
  mediaType: "movie";
  releaseDate?: string;
  watchedAt?: Date;
}

export type Media = TVShow | Movie;
export type PersistedMedia = Media & {
  id: number;
};
