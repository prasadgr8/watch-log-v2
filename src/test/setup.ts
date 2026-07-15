import "fake-indexeddb/auto";

import { afterEach, beforeEach } from "vitest";

import { db } from "../database/db";

beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.media, db.episodes, db.settings, async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.settings.clear(),
    ]);
  });
});

afterEach(async () => {
  await db.transaction("rw", db.media, db.episodes, db.settings, async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.settings.clear(),
    ]);
  });
});
