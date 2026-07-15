export type WatchHistorySource = "manual" | "import";

export interface WatchHistory {
  id?: number;
  episodeId: number;
  watchedAt: Date;
  source: WatchHistorySource;
  createdAt: Date;
}

export type PersistedWatchHistory = WatchHistory & {
  id: number;
};
