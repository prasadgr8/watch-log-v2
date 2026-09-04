import type { PersistedMedia, WatchStatus } from "../../../types/media";

export type MediaTypeFilter = "all" | "tv" | "movie";

export interface LibraryFilters {
  search: string;
  mediaType: MediaTypeFilter;
  status: WatchStatus | "all";
  minRating: number | null;
}

export function filterLibrary(
  media: PersistedMedia[],
  filters: LibraryFilters,
): PersistedMedia[] {
  let result = media;

  const search = filters.search.trim().toLowerCase();

  if (search.length > 0) {
    result = result.filter((item) =>
      item.title.toLowerCase().includes(search),
    );
  }

  if (filters.mediaType !== "all") {
    result = result.filter(
      (item) => item.mediaType === filters.mediaType,
    );
  }

  if (filters.status !== "all") {
    result = result.filter(
      (item) => item.userStatus === filters.status,
    );
  }

  if (filters.minRating !== null) {
    const minRating = filters.minRating;
    result = result.filter(
      (item) => (item.rating ?? 0) >= minRating,
    );
  }

  return result;
}
