import Dexie from "dexie";
import { describe, expect, it } from "vitest";

import { db } from "../db";

/**
 * v5 schema only — mirrors the pre-A24.4 collections schema exactly so we can
 * simulate an existing database upgrading to the new v6 schema additively.
 */
function createV5Database(name: string): Dexie {
  const legacyDb = new Dexie(name);
  legacyDb.version(1).stores({ media: "++id", settings: "&key, updatedAt" });
  legacyDb.version(2).stores({
    media: "++id",
    episodes: "++id",
    settings: "&key, updatedAt",
  });
  legacyDb.version(3).stores({
    media: "++id",
    episodes: "++id",
    watchHistory: "++id, episodeId",
    settings: "&key, updatedAt",
  });
  legacyDb.version(4).stores({
    media: "++id",
    episodes: "++id",
    watchHistory: "++id, episodeId",
    settings: "&key, updatedAt",
    importHistory: "++id",
  });
  legacyDb.version(5).stores({
    media: "++id, tmdbId, mediaType, [tmdbId+mediaType], title, userStatus, createdAt, updatedAt",
    episodes: "++id, showId, tmdbId, [showId+tmdbId], [showId+seasonNumber+episodeNumber], watchedAt, updatedAt",
    watchHistory: "++id, episodeId, watchedAt, source, [episodeId+watchedAt]",
    settings: "&key, updatedAt",
    importHistory: "++id, startedAt, completedAt, status, provider",
    collections: "++id, createdAt, updatedAt",
    collectionMedia: "++id, collectionId, mediaId, &[collectionId+mediaId]",
  });
  return legacyDb;
}

describe("database migration v5 → v6", () => {
  it("upgrades an existing v5 database to v6 without losing data", async () => {
    const dbName = "WatchLogV2";

    // Start from a clean slate so the test is deterministic.
    await db.close();
    await Dexie.delete(dbName);

    // Create and populate a v5 database.
    const legacyDb = createV5Database(dbName);
    await legacyDb.open();
    const now = new Date();
    await legacyDb.table("collections").add({
      name: "Legacy Collection",
      createdAt: now,
      updatedAt: now,
    });
    await legacyDb.table("settings").add({
      key: "theme",
      value: "dark",
      updatedAt: now,
    });
    legacyDb.close();

    // Open the real database (v6 schema) — Dexie runs the additive upgrade.
    await db.open();

    const collections = await db.collections.toArray();
    const settings = await db.settings.toArray();

    expect(collections).toHaveLength(1);
    expect(collections[0]?.name).toBe("Legacy Collection");
    expect(settings).toHaveLength(1);
    expect(settings[0]?.key).toBe("theme");

    // The new store is available and empty.
    const definitions = await db.smartCollectionDefinitions.toArray();
    expect(definitions).toHaveLength(0);

    // Clean up so subsequent tests start fresh.
    await db.close();
    await Dexie.delete(dbName);
  });
});
