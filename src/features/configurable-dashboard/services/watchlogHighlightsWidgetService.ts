/**
 * Configurable Dashboard — WatchLog Highlights widget data (Step 3).
 *
 * Lightweight personalized snapshot derived from local WatchLog data. This is
 * intentionally NOT a Statistics replacement: only the current streak, a
 * trailing-period watch count, distinct titles watched, and a few small
 * personalized insights are exposed. No historical charts, calendar, heatmap,
 * or peak-viewing analysis live here.
 *
 * Reuses the existing analytics domain (`viewingStreak`, `activity`) and the
 * watch-history/media repositories rather than duplicating data access.
 *
 * All derivations are deterministic for a fixed reference date; empty/new-user
 * data yields zeros and an empty insight list rather than an error.
 */

import {
  watchHistoryRepository,
} from "../../../database/repositories";

import {
  countUniqueMedia,
} from "../../../domain/analytics/mediaComposition";
import { getActiveViewingDays } from "../../../domain/analytics/activity";
import { getCurrentStreak } from "../../../domain/analytics/viewingStreak";

import type { PersistedWatchHistory } from "../../../types";
import type { WatchActivityEvent } from "../../../domain/analytics/types";

/** Trailing window (days) used for the "recent watches" highlight. */
export const HIGHLIGHTS_RECENT_WINDOW_DAYS = 30 as const;

/** Maximum small insights shown in the compact widget. */
export const HIGHLIGHTS_INSIGHT_LIMIT = 4 as const;

/** Threshold at which a streak is treated as a milestone worth surfacing. */
export const STREAK_MILESTONE_DAYS = 3 as const;

export interface HighlightInsight {
  /** Stable insight key used for rendering and testing. */
  id: "current-streak" | "titles-watched" | "recent-watches" | "active-days";
  /** Human-readable label. */
  label: string;
  /** Primary value displayed for the insight. */
  value: number;
  /** Supporting unit copy (e.g. "days", "titles"). */
  unit: string;
  /** Insight category, kept presentational-light. */
  kind: "milestone" | "stat";
}

export interface WatchLogHighlightsData {
  /** Current consecutive local-calendar-day viewing streak. */
  currentStreak: number;
  /** Distinct library titles with at least one watch event. */
  titlesWatched: number;
  /** Watch events in the trailing 30-day window. */
  recentWatches: number;
  /** Distinct local calendar days with at least one watch event. */
  activeDays: number;
  /** Small personalized insights, most meaningful first. */
  insights: HighlightInsight[];
}

function isPersistedWatchHistory(
  record: { id?: number },
): record is PersistedWatchHistory {
  return record.id !== undefined;
}

/**
 * Returns the highlights projection for the supplied watch history and media
 * records, anchored to `referenceDate` (defaults to now). The trailing window
 * spans exactly 30 elapsed days before that instant, including both the cutoff
 * and reference instant. Events after the reference instant are excluded.
 */
export async function getWatchLogHighlightsData(
  referenceDate: Date = new Date(),
): Promise<WatchLogHighlightsData> {
  const [events] = await Promise.all([
    watchHistoryRepository.getAll(),
  ]);

  const persistedEvents = events.filter(isPersistedWatchHistory);

  const currentStreak = getCurrentStreak(persistedEvents as WatchActivityEvent[]);

  const titlesWatched = countUniqueMedia(
    persistedEvents as WatchActivityEvent[],
  );

  const windowStart = new Date(
    referenceDate.getTime() -
      HIGHLIGHTS_RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const recentWatches = persistedEvents.filter(
    (event) =>
      event.watchedAt.getTime() >= windowStart.getTime() &&
      event.watchedAt.getTime() <= referenceDate.getTime(),
  ).length;

  const activeDays = getActiveViewingDays(
    persistedEvents as WatchActivityEvent[],
  );

  const insights = buildInsights({
    currentStreak,
    titlesWatched,
    recentWatches,
    activeDays,
  });

  return {
    currentStreak,
    titlesWatched,
    recentWatches,
    activeDays,
    insights,
  };
}

function buildInsights(input: {
  currentStreak: number;
  titlesWatched: number;
  recentWatches: number;
  activeDays: number;
}): HighlightInsight[] {
  const insights: HighlightInsight[] = [];

  if (input.currentStreak >= STREAK_MILESTONE_DAYS) {
    insights.push({
      id: "current-streak",
      label: "Viewing streak",
      value: input.currentStreak,
      unit: "days",
      kind: "milestone",
    });
  } else if (input.currentStreak === 1) {
    insights.push({
      id: "current-streak",
      label: "Viewing streak",
      value: input.currentStreak,
      unit: "day",
      kind: "stat",
    });
  }

  if (input.titlesWatched > 0) {
    insights.push({
      id: "titles-watched",
      label: "Titles watched",
      value: input.titlesWatched,
      unit: "titles",
      kind: "stat",
    });
  }

  if (input.recentWatches > 0) {
    insights.push({
      id: "recent-watches",
      label: "Watches in the last 30 days",
      value: input.recentWatches,
      unit: "watches",
      kind: "stat",
    });
  }

  if (input.activeDays > 0) {
    insights.push({
      id: "active-days",
      label: "Active viewing days",
      value: input.activeDays,
      unit: "days",
      kind: "stat",
    });
  }

  // Deterministic ordering: streak first, then titles, recent, active days.
  insights.sort((first, second) => {
    const order = [
      "current-streak",
      "titles-watched",
      "recent-watches",
      "active-days",
    ];
    return order.indexOf(first.id) - order.indexOf(second.id);
  });

  return insights.slice(0, HIGHLIGHTS_INSIGHT_LIMIT);
}
