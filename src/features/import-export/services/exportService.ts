import { mediaRepository } from "../../../database/repositories";
import type { WatchLogExport } from "../types/export";

export const exportService = {
  async exportLibrary(): Promise<WatchLogExport> {
    const media = await mediaRepository.getAll();

    return {
      application: "Watch Log V2",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),

      data: {
        media,
      },
    };
  },
};
