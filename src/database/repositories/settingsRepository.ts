import { db } from "../db";

import type { AppSetting } from "../../types";

export const settingsRepository = {
  async set(key: string, value: unknown): Promise<string> {
    const setting: AppSetting = {
      key,
      value,
      updatedAt: new Date(),
    };

    return db.settings.put(setting);
  },

  async get<T>(key: string): Promise<T | undefined> {
    const setting = await db.settings.get(key);

    return setting?.value as T | undefined;
  },

  async remove(key: string): Promise<void> {
    await db.settings.delete(key);
  },

  async getAll(): Promise<AppSetting[]> {
    return db.settings.toArray();
  },
};