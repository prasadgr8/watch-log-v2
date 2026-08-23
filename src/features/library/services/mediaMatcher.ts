import type { PersistedMedia } from "../../../types/media";

export function findMatchingMedia(
  library: PersistedMedia[],
  candidate: PersistedMedia,
): PersistedMedia | undefined {
  const tmdbMatch = library.find((item) => item.tmdbId === candidate.tmdbId);

  if (tmdbMatch !== undefined) {
    return tmdbMatch;
  }

  const normalizedTitle = candidate.title.trim().toLowerCase();

  return library.find(
    (item) =>
      item.mediaType === candidate.mediaType &&
      item.title.trim().toLowerCase() === normalizedTitle,
  );
}
