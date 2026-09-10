import type { MediaType, WatchStatus } from "../../types/media";

import type { MediaFilterState } from "./mediaFilterModel";

/**
 * Minimal structural contract a record must satisfy to be evaluated by the
 * shared filter engine. PersistedMedia satisfies this structurally; other
 * sources (e.g. normalized TMDB results) can too without being forced into
 * the local-library domain model.
 *
 * Optional fields mirror "absence of data" in the source:
 * - rating undefined behaves as 0 for the inclusive >= threshold
 * - favorite undefined is not a favorite
 * - genres undefined/empty never matches an active genre selection
 * - userStatus undefined never matches an active status filter
 */
export interface FilterableMedia {
  title: string;
  mediaType: MediaType;
  userStatus?: WatchStatus;
  rating?: number;
  favorite?: boolean;
  genres?: string[];
}

/**
 * Evaluates a single record against the filter state. Deterministic and
 * side-effect free. Active filter categories are ANDed together; genre
 * selections within a category use OR semantics.
 */
export function matchesMediaFilters(
  item: FilterableMedia,
  filters: MediaFilterState,
): boolean {
  const search = filters.search.trim().toLowerCase();

  if (search.length > 0 && !item.title.toLowerCase().includes(search)) {
    return false;
  }

  if (filters.mediaType !== "all" && item.mediaType !== filters.mediaType) {
    return false;
  }

  if (filters.status !== "all" && item.userStatus !== filters.status) {
    return false;
  }

  if (filters.minRating !== null && (item.rating ?? 0) < filters.minRating) {
    return false;
  }

  if (filters.favoritesOnly && item.favorite !== true) {
    return false;
  }

  if (filters.selectedGenres.length > 0) {
    const selectedGenres = new Set(filters.selectedGenres);

    if (!(item.genres ?? []).some((genre) => selectedGenres.has(genre))) {
      return false;
    }
  }

  return true;
}

/**
 * Returns the records matching the filter state, preserving input order.
 * Never mutates the input collection.
 */
export function applyMediaFilters<T extends FilterableMedia>(
  items: readonly T[],
  filters: MediaFilterState,
): T[] {
  return items.filter((item) => matchesMediaFilters(item, filters));
}
