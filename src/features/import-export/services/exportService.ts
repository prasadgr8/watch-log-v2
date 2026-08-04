import { mediaRepository } from "../../../database/repositories";

export const exportService = {
  async exportLibrary() {
    const media = await mediaRepository.getAll();

    return {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      media,
    };
  },
};
