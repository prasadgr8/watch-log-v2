/**
 * Configurable Dashboard — Upcoming Releases widget helpers (Step 2).
 *
 * Pure, clock-free helpers over the existing `upcomingEpisodesService`
 * projection. Selection and air-date rules stay in the shared service (valid
 * date-only air dates that are today, tomorrow, or later; regular episodes
 * only); this module only caps the list for the compact dashboard slot and
 * resolves the display label. No network calls, no persistence, no calendar
 * grouping — the full month/show calendar remains solely on the Upcoming
 * page.
 */

import {
  getLocalDateString,
  getRelativeAirDateLabel,
} from "../../../domain/dates/airDate";

import type { UpcomingEpisodeItem } from "../../upcoming/services/upcomingEpisodesService";

/** Maximum releases shown in the compact widget. */
export const UPCOMING_RELEASES_PREVIEW_LIMIT = 5 as const;

/**
 * Caps an already-ordered upcoming projection for the dashboard slot. The
 * service's deterministic order (air date, title, season, episode) is
 * preserved; this slices only.
 */
export function getUpcomingReleasesPreview(
  items: UpcomingEpisodeItem[],
  limit: number = UPCOMING_RELEASES_PREVIEW_LIMIT,
): UpcomingEpisodeItem[] {
  if (limit <= 0) {
    return [];
  }

  return items.slice(0, limit);
}

/**
 * Display label for an air date: the shared relative label ("Airs today",
 * "Airs tomorrow", "Airs in N days") with a date-only fallback. Never null,
 * so the widget always shows either the countdown or the date.
 */
export function getUpcomingReleaseLabel(
  airDate: string,
  today: string,
): string {
  return getRelativeAirDateLabel(airDate, today) ?? airDate;
}

/** Local `YYYY-MM-DD` today string for label resolution (injectable clock). */
export function getUpcomingReleasesToday(now: Date = new Date()): string {
  return getLocalDateString(now);
}
