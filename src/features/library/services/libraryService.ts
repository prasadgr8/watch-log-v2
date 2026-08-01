import type { Media } from "../../../types/media";

import { mediaRepository } from "../../../database/repositories/mediaRepository";

export const libraryService = {
  async addMedia(media: Media): Promise<number> {
    return mediaRepository.add(media);
  },
};
