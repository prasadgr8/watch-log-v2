import type { Media, UserStatus } from "../../../types";

export type MediaTypeFilter = "all" | "tv" | "movie";

export interface LibraryFilters {
  search: string;
  mediaType: MediaTypeFilter;
  status: UserStatus | "all";
}

export function filterLibrary(
  media: Media[],
  filters: LibraryFilters,
): Media[] {
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

  return result;
}