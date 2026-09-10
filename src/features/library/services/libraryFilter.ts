import type {
  FilterMediaType,
  MediaFilterState,
} from "../../../domain/filters/mediaFilterModel";
import { applyMediaFilters } from "../../../domain/filters/mediaFilterEngine";

import type { PersistedMedia } from "../../../types/media";

/*
 * Compatibility wrapper around the shared domain filter foundation
 * (src/domain/filters). Library semantics live in the shared engine now;
 * this module keeps the established Library-facing API stable.
 */

export type MediaTypeFilter = FilterMediaType;

export type LibraryFilters = MediaFilterState;

export function filterLibrary(
  media: PersistedMedia[],
  filters: LibraryFilters,
): PersistedMedia[] {
  return applyMediaFilters(media, filters);
}
