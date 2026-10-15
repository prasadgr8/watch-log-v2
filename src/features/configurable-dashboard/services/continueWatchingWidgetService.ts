/**
 * Configurable Dashboard — Continue Watching widget data (Step 2).
 *
 * Thin projection over the existing Continue Watching derivation
 * (`src/features/dashboard/services/continueWatchingService.ts`). The shared
 * service already encodes the domain rules Step 2 needs: only unfinished TV
 * stories, the next unwatched episode, the last-watch instant, and
 * deterministic ordering by most recent watch first.
 *
 * The projection deliberately carries ONLY what the widget renders (media,
 * next episode, last-watch instant). Progress values never enter the widget
 * layer: watched counts and totals are dropped at this
 * boundary so the UI cannot render a percentage, a progress bar, or an
 * episodes-watched fraction.
 */

import { continueWatchingService } from "../../dashboard/services/continueWatchingService";

import type { PersistedEpisode, PersistedMedia } from "../../../types";

/** Maximum unfinished stories shown in the compact widget. */
export const CONTINUE_WATCHING_PREVIEW_LIMIT = 4 as const;

export interface ContinueWatchingWidgetItem {
  /** The unfinished TV show. Always a persisted record. */
  media: PersistedMedia;
  /** The next unwatched regular episode (season > 0, lowest first). */
  nextEpisode: PersistedEpisode;
  /** Latest watched instant across the show's regular episodes. */
  lastWatchedAt: Date;
}

/**
 * Returns unfinished stories with their next episode, preserving the shared
 * service's deterministic most-recent-first ordering. Completed stories never
 * appear: the underlying service excludes fully-watched shows by
 * construction.
 */
export async function getContinueWatchingWidgetItems(
  limit: number = CONTINUE_WATCHING_PREVIEW_LIMIT,
): Promise<ContinueWatchingWidgetItem[]> {
  if (limit <= 0) {
    return [];
  }

  const items = await continueWatchingService.getItems();

  return items
    .slice(0, limit)
    .map(({ media, nextEpisode, lastWatchedAt }) => ({
      media,
      nextEpisode,
      lastWatchedAt,
    }));
}
