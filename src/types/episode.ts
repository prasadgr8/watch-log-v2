export interface Episode {
  id?: number;
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  watched: boolean;
  watchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}