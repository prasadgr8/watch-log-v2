import { episodeRepository, mediaRepository } from "../../../database/repositories";

import type { PersistedEpisode, PersistedMedia } from "../../../types";

import {
  compareAirDates,
  getAirDateRelation,
  getLocalDateString,
  isValidAirDate,
  type AirDateRelation,
} from "../../../domain/dates/airDate";

/**
 * The calendar relations an upcoming item can carry. "past" and "unknown" are
 * excluded by construction: the projection only selects valid air dates that
 * are today, tomorrow, or later.
 */
export type UpcomingAirDateRelation = Extract<
  AirDateRelation,
  "today" | "tomorrow" | "future"
>;

/**
 * One row of the derived Upcoming Episodes projection. Records are returned
 * as persisted references; no evaluated result is persisted anywhere.
 */
export interface UpcomingEpisodeItem {
  /** The TV show the episode belongs to. */
  media: PersistedMedia;

  /** The upcoming episode record, including its watched flag. */
  episode: PersistedEpisode;

  /** The validated YYYY-MM-DD air date of the episode. */
  airDate: string;

  /** Today / tomorrow / future classification against the local today. */
  relation: UpcomingAirDateRelation;
}

function isPersistedMedia(media: { id?: number }): media is PersistedMedia {
  return media.id !== undefined;
}

function isPersistedEpisode(episode: {
  id?: number;
}): episode is PersistedEpisode {
  return episode.id !== undefined;
}

/**
 * Deterministic ordering for upcoming items: air date ascending, then show
 * title (A-Z, the shared Library sorting convention), then season number,
 * then episode number. Date comparison reuses the shared A25.1 comparator;
 * no date logic is duplicated here.
 */
function compareUpcomingItems(
  first: UpcomingEpisodeItem,
  second: UpcomingEpisodeItem,
): number {
  const byAirDate = compareAirDates(first.airDate, second.airDate);

  if (byAirDate !== 0) {
    return byAirDate;
  }

  const byTitle = first.media.title.localeCompare(second.media.title);

  if (byTitle !== 0) {
    return byTitle;
  }

  if (first.episode.seasonNumber !== second.episode.seasonNumber) {
    return first.episode.seasonNumber - second.episode.seasonNumber;
  }

  return first.episode.episodeNumber - second.episode.episodeNumber;
}

/**
 * Derives the Upcoming Episodes projection from one local snapshot of the
 * persisted stores.
 *
 * Selection rules (per the A25 contract):
 * - only regular episodes (seasonNumber > 0); Season 0 specials are excluded
 * - only valid date-only air dates (YYYY-MM-DD); missing, malformed, and
 *   impossible dates are excluded through the shared A25.1 validator
 * - only today, tomorrow, and future dates; past episodes are excluded
 * - only episodes whose show resolves to a persisted TV record, so orphans
 *   and episodes attributed to non-TV media are skipped
 * - watched episodes are included: airing schedule is independent of the
 *   user's progress (the watched flag travels on the episode record for the
 *   UI to present)
 *
 * The projection is read-only: it never writes to IndexedDB, never touches
 * the network, and never mutates its inputs. `now` is injectable so the
 * local-today boundary is deterministic and testable.
 */
export const upcomingEpisodesService = {
  async getItems(now: Date = new Date()): Promise<UpcomingEpisodeItem[]> {
    const today = getLocalDateString(now);

    const [episodes, tvShows] = await Promise.all([
      episodeRepository.getAll(),
      mediaRepository.getByType("tv"),
    ]);

    const showById = new Map<number, PersistedMedia>();

    for (const show of tvShows) {
      if (isPersistedMedia(show)) {
        showById.set(show.id, show);
      }
    }

    const items: UpcomingEpisodeItem[] = [];

    for (const episode of episodes) {
      if (!isPersistedEpisode(episode)) {
        continue;
      }

      if (episode.seasonNumber <= 0) {
        continue;
      }

      if (episode.airDate === undefined || !isValidAirDate(episode.airDate)) {
        continue;
      }

      const show = showById.get(episode.showId);

      if (show === undefined) {
        continue;
      }

      const relation = getAirDateRelation(episode.airDate, today);

      if (
        relation !== "today" &&
        relation !== "tomorrow" &&
        relation !== "future"
      ) {
        continue;
      }

      items.push({
        media: show,
        episode,
        airDate: episode.airDate,
        relation,
      });
    }

    return items.sort(compareUpcomingItems);
  },
};
