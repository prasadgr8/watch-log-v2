/**
 * Configurable Dashboard — Recently Watched widget data (Step 2).
 *
 * Derives recent actual watch activity from the existing local watch-history
 * store through `watchHistoryRepository.getAll()` — no duplicate persistence
 * logic, no new store, no network. Titles resolve through the existing media
 * and episode repositories.
 *
 * Conceptually distinct from Continue Watching: this widget answers "what was
 * watched recently" (historical events, newest first, including movies and
 * finished stories), while Continue Watching answers "what to watch next"
 * (unfinished stories only). This is a plain activity list, never a
 * statistics aggregation: no counts, totals, streaks, or percentages.
 *
 * Ordering is deterministic: most-recent-first is the exact reverse of the
 * repository's canonical ascending order (`compareWatchEvents`), so two reads
 * of the same data always produce the same sequence.
 */

import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";

/** Maximum recent events shown in the compact widget. */
export const RECENTLY_WATCHED_PREVIEW_LIMIT = 5 as const;

export type RecentWatchKind = "tv" | "movie";

export interface RecentlyWatchedWidgetItem {
  /** Persisted watch-event id (stable list key). */
  eventId: number;
  /** TV episode event or movie event. */
  kind: RecentWatchKind;
  /** Show title for TV, movie title for movies. */
  title: string;
  /** `S01E02`-style code for TV, `null` for movies. */
  episodeCode: string | null;
  /** Episode title for TV, `null` for movies. */
  episodeTitle: string | null;
  /** When the watch happened. */
  watchedAt: Date;
  /** Owning library record id when attributable, else `null`. */
  mediaId: number | null;
}

function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber,
  ).padStart(2, "0")}`;
}

/**
 * Returns the most recent watch events with resolved display titles.
 * Events whose library records are gone still appear with an "Unknown title"
 * fallback so history is never silently dropped from the list.
 */
export async function getRecentlyWatchedWidgetItems(
  limit: number = RECENTLY_WATCHED_PREVIEW_LIMIT,
): Promise<RecentlyWatchedWidgetItem[]> {
  if (limit <= 0) {
    return [];
  }

  const [events, episodes] = await Promise.all([
    watchHistoryRepository.getAll(),
    episodeRepository.getAll(),
  ]);

  const episodeById = new Map<number, (typeof episodes)[number]>();

  for (const episode of episodes) {
    if (episode.id !== undefined) {
      episodeById.set(episode.id, episode);
    }
  }

  const mediaIds = new Set<number>();

  for (const event of events) {
    if (event.mediaId !== undefined) {
      mediaIds.add(event.mediaId);
    }
  }

  for (const episode of episodes) {
    mediaIds.add(episode.showId);
  }

  const mediaRecords = await mediaRepository.getByIds([...mediaIds]);
  const titleByMediaId = new Map<number, string>();

  for (const record of mediaRecords) {
    if (record.id !== undefined) {
      titleByMediaId.set(record.id, record.title);
    }
  }

  const mostRecentFirst = [...events].reverse().slice(0, limit);

  return mostRecentFirst.map((event) => {
    const isMovieEvent =
      event.mediaType === "movie" ||
      (event.mediaType === undefined && event.episodeId === null);
    const episode =
      event.episodeId === null ? undefined : episodeById.get(event.episodeId);

    if (isMovieEvent || episode === undefined) {
      if (isMovieEvent) {
        const movieTitle =
          (event.mediaId !== undefined
            ? titleByMediaId.get(event.mediaId)
            : undefined) ?? "Unknown title";

        return {
          eventId: event.id,
          kind: "movie" as const,
          title: movieTitle,
          episodeCode: null,
          episodeTitle: null,
          watchedAt: event.watchedAt,
          mediaId: event.mediaId ?? null,
        };
      }

      const showTitle =
        (event.mediaId !== undefined
          ? titleByMediaId.get(event.mediaId)
          : undefined) ?? "Unknown title";

      return {
        eventId: event.id,
        kind: "tv" as const,
        title: showTitle,
        episodeCode: null,
        episodeTitle: null,
        watchedAt: event.watchedAt,
        mediaId: event.mediaId ?? null,
      };
    }

    return {
      eventId: event.id,
      kind: "tv" as const,
      title: titleByMediaId.get(episode.showId) ?? "Unknown title",
      episodeCode: formatEpisodeCode(
        episode.seasonNumber,
        episode.episodeNumber,
      ),
      episodeTitle: episode.title,
      watchedAt: event.watchedAt,
      mediaId: episode.showId,
    };
  });
}
