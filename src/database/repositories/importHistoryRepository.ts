import { db } from "../db";

import type { ImportHistory, PersistedImportHistory } from "../../types";

export const importHistoryRepository = {
  async add(history: ImportHistory): Promise<number> {
    return db.importHistory.add(history);
  },

  async getById(id: number): Promise<PersistedImportHistory | undefined> {
    return db.importHistory.get(id) as Promise<
      PersistedImportHistory | undefined
    >;
  },

  /** Newest imports first. */
  async list(limit = 50): Promise<PersistedImportHistory[]> {
    return db.importHistory
      .orderBy("completedAt")
      .reverse()
      .limit(limit)
      .toArray() as Promise<PersistedImportHistory[]>;
  },

  async clear(): Promise<void> {
    await db.importHistory.clear();
  },

  async count(): Promise<number> {
    return db.importHistory.count();
  },
};
