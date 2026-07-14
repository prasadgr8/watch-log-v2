import Dexie, { type EntityTable } from "dexie";

import type { AppSetting, Episode, Media } from "../types";

export class WatchLogDatabase extends Dexie {
  media!: EntityTable<Media, "id">;
  episodes!: EntityTable<Episode, "id">;
  settings!: EntityTable<AppSetting, "key">;

  constructor() {
    super("WatchLogV2");

    this.version(1).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      settings: "&key, updatedAt",
    });

    this.version(2).stores({
      media:
        "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
      episodes:
        "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
      settings: "&key, updatedAt",
    });
  }
}

export const db = new WatchLogDatabase();
