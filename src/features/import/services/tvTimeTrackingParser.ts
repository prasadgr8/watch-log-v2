import type { TvTimeTrackingWatchedEpisode } from "../types/tvTimeModels";
import { parseTvTimeDate } from "./tvTimeZone";

/**
 * Parse TV Time tracking records from the tracking-prod-records-v2.csv file.
 * 
 * This function takes parsed CSV rows (as returned by Papa.parse) and filters/normalizes
 * them to produce the watched episode candidates for import.
 * 
 * @param trackingRecords - Parsed CSV rows from tracking-prod-records-v2.csv
 * @param timezone - The timezone from the user's TV Time export (resolved from user.csv)
 * @returns Array of normalized watched episodes ready for import planning
 */
export function parseTvTimeTrackingRecords(
  trackingRecords: Record<string, string>[],
  timezone: string
): TvTimeTrackingWatchedEpisode[] {
  // Map to track duplicates by (s_id, season_number, episode_number)
  // Duplicates (rewatches / bulk season marks) keep the EARLIEST watch
  // timestamp: see the retention comment inside the loop.
  const duplicateMap = new Map<string, TvTimeTrackingWatchedEpisode>();

  for (const record of trackingRecords) {
    try {
      // Only process watch-episode-* records
      if (!record.key || !record.key.startsWith("watch-episode-")) {
        continue;
      }

      // Ignore user-series-* records
      if (record.key.startsWith("user-series-")) {
        continue;
      }

      // Require valid TV Time show ID
      if (!record.s_id || typeof record.s_id !== "string") {
        continue;
      }

      // Require valid season and episode numbers
      const seasonNum = Number(record.season_number);
      const episodeNum = Number(record.episode_number);

      // Skip if season or episode number is not a valid integer
      if (
        !Number.isInteger(seasonNum) ||
        !Number.isInteger(episodeNum) ||
        seasonNum <= 0 ||
        episodeNum <= 0
      ) {
        continue;
      }

      // Exclude season 0 from normal watched-episode candidates
      if (seasonNum === 0) {
        continue;
      }

      // Parse the timestamp
      let watchedAt: Date;
      try {
        // The tracking export may have timestamps in ISO format (YYYY-MM-DDTHH:mm:ss)
        // or space-separated format (YYYY-MM-DD HH:mm:ss)
        // The parseTvTimeDate function expects space-separated format
        const timestamp = record.created_at.trim().replace('T', ' ');
        watchedAt = parseTvTimeDate(timestamp, timezone);
      } catch {
        // Skip malformed timestamps - don't throw to avoid crashing the entire parser
        continue;
      }

      // Create the normalized episode record
      const episodeRecord: TvTimeTrackingWatchedEpisode = {
        tvTimeShowId: record.s_id,
        showTitle: record.series_name,
        seasonNumber: seasonNum,
        episodeNumber: episodeNum,
        watchedAt,
      };

      // Create a duplicate key for tracking
      const duplicateKey = `${record.s_id}-${seasonNum}-${episodeNum}`;

      // Check if we've seen this episode before
      const existingRecord = duplicateMap.get(duplicateKey);

      if (existingRecord) {
        /*
         * WatchLog never overwrites a watch timestamp once set:
         * applyManualWatch() and markWatchedFromImport() both skip
         * already-watched episodes and preserve their existing watchedAt
         * (see episodeRepository: "cached watchedAt and history remain
         * untouched"). The first watch therefore defines the episode's
         * watch state, so the EARLIEST timestamp is retained here,
         * independent of CSV row order. rewatch_count never produces a
         * second candidate.
         */
        if (episodeRecord.watchedAt < existingRecord.watchedAt) {
          duplicateMap.set(duplicateKey, episodeRecord);
        }
        // Same timestamp or later: keep the earlier (existing) record.
      } else {
        // First time seeing this episode
        duplicateMap.set(duplicateKey, episodeRecord);
      }
    } catch {
      // Never throw because one malformed tracking row exists
      // Skip malformed rows consistently with existing import conventions
      continue;
    }
  }

  // Convert map to array
  return Array.from(duplicateMap.values());
}