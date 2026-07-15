import "fake-indexeddb/auto";

import { afterEach, beforeEach } from "vitest";

import { db } from "../database/db";

async function clearDatabase(): Promise<void> {
  await db.open();

  await db.transaction(
    "rw",
    db.media,
    db.episodes,
    db.watchHistory,
    db.settings,
    async () => {
      await Promise.all([
        db.media.clear(),
        db.episodes.clear(),
        db.watchHistory.clear(),
        db.settings.clear(),
      ]);
    },
  );
}

beforeEach(async () => {
  await clearDatabase();
});

afterEach(async () => {
  await clearDatabase();
});
