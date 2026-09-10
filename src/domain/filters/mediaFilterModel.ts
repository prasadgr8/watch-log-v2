import type { WatchStatus } from "../../types/media";

/**
 * Media type filter selection shared by Library, Movies and future
 * Smart Collections / Smart Filter Presets. "all" means no restriction.
 */
export type FilterMediaType = "all" | "tv" | "movie";

/**
 * Domain-level media filter intent. This model is intentionally decoupled
 * from React state, UI components, URL query parameters and any persistence
 * mechanism. It expresses what to filter by — never how it is stored.
 */
export interface MediaFilterState {
  /** Case-insensitive substring match against the title. Trimmed first. */
  search: string;

  /** "all" applies no media type restriction. */
  mediaType: FilterMediaType;

  /** "all" applies no watch status restriction. */
  status: WatchStatus | "all";

  /** Inclusive minimum rating (>=). null means no restriction. */
  minRating: number | null;

  /** When true, only items with favorite === true match. */
  favoritesOnly: boolean;

  /** No selection means no genre restriction; multiple genres use OR. */
  selectedGenres: string[];
}

/** The default filter state: everything unfiltered. */
export const EMPTY_MEDIA_FILTERS: MediaFilterState = {
  search: "",
  mediaType: "all",
  status: "all",
  minRating: null,
  favoritesOnly: false,
  selectedGenres: [],
};