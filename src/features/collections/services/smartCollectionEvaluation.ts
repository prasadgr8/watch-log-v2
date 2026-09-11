import { applyMediaFilters } from "../../../domain/filters/mediaFilterEngine";

import type { PersistedMedia } from "../../../types";
import type { PersistedSmartCollectionDefinition } from "../../../types";

/**
 * Evaluates a Smart Collection definition against a local-library snapshot.
 *
 * Returns the media records that currently match the definition's filters,
 * preserving input order. The evaluator is pure: it never mutates the input
 * array, the media records, or the definition, and never touches IndexedDB or
 * the network.
 *
 * Filtering semantics are delegated entirely to the shared A24.3 filter engine
 * (applyMediaFilters); this function is only the Smart Collection binding.
 */
export function evaluateSmartCollection(
  definition: PersistedSmartCollectionDefinition,
  media: readonly PersistedMedia[],
): PersistedMedia[] {
  return applyMediaFilters(media, definition.filters);
}
