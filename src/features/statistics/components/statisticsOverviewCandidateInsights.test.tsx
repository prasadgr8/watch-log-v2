import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  calculateEpisodeStatistics,
  calculateLibraryStatistics,
  calculateRecentActivity,
  calculateShowProgress,
  calculateWatchTimeStatistics,
  type StatisticsDashboard,
} from "../services/statisticsService";
import { buildTrailingYearDayActivity } from "../../../domain/analytics/calendarYear";
import StatisticsOverviewCandidate from "./StatisticsOverviewCandidate";

function createDashboardWithActivity(): StatisticsDashboard {
  const hourOfDayBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    eventCount: hour === 20 ? 4 : 0,
  }));
  const dayOfWeekBuckets = Array.from({ length: 7 }, (_, index) => ({
    isoWeekday: index + 1,
    eventCount: index === 5 ? 2 : index === 6 ? 1 : 0,
  }));

  return {
    library: calculateLibraryStatistics([]),
    episodes: calculateEpisodeStatistics([]),
    watchTime: calculateWatchTimeStatistics([]),
    showProgress: calculateShowProgress([], []),
    recentActivity: calculateRecentActivity([], []),
    watchEventCount: 6,
    currentStreak: 0,
    milestones: {
      episodesWatched: 6,
      moviesWatched: 2,
      currentViewingStreak: 3,
    },
    tvEpisodeEventCount: 6,
    movieEventCount: 0,
    uniqueMediaCount: 1,
    hourOfDayBuckets,
    dayOfWeekBuckets,
    yearDayActivity: {
      windowStart: new Date(2025, 9, 1),
      windowEnd: new Date(2026, 9, 1),
      days: [
        { periodStart: new Date(2025, 10, 8), eventCount: 2 },
        { periodStart: new Date(2025, 10, 9), eventCount: 1 },
        { periodStart: new Date(2025, 11, 1), eventCount: 2 },
      ],
    },
    mostActiveMonth: {
      label: "Nov 2025",
      eventCount: 3,
      isTie: false,
      isAvailable: true,
    },
    weekendViewing: {
      weekendEvents: 3,
      totalEvents: 6,
      percentage: 50,
      isAvailable: true,
    },
    timeOfDay: {
      buckets: [
        { bucket: "Morning", eventCount: 0, percentage: 0 },
        { bucket: "Afternoon", eventCount: 0, percentage: 0 },
        { bucket: "Evening", eventCount: 4, percentage: 67 },
        { bucket: "Night", eventCount: 2, percentage: 33 },
      ],
      totalEvents: 6,
      isAvailable: true,
    },
    genreCount: {
      count: 0,
      isAvailable: true,
    },
    storyLandscape: {
      genres: [],
      totalWatchTimeMinutes: 0,
      isAvailable: true,
    },
    biggestStories: {
      stories: [],
      totalWatchTimeMinutes: 0,
      isAvailable: true,
    },
  };
}

function createEmptyDashboard(): StatisticsDashboard {
  return {
    library: calculateLibraryStatistics([]),
    episodes: calculateEpisodeStatistics([]),
    watchTime: calculateWatchTimeStatistics([]),
    showProgress: calculateShowProgress([], []),
    recentActivity: calculateRecentActivity([], []),
    watchEventCount: 0,
    currentStreak: 0,
    milestones: {
      episodesWatched: 0,
      moviesWatched: 0,
      currentViewingStreak: 0,
    },
    tvEpisodeEventCount: 0,
    movieEventCount: 0,
    uniqueMediaCount: 0,
    hourOfDayBuckets: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      eventCount: 0,
    })),
    dayOfWeekBuckets: Array.from({ length: 7 }, (_, index) => ({
      isoWeekday: index + 1,
      eventCount: 0,
    })),
    yearDayActivity: buildTrailingYearDayActivity([], new Date(2026, 9, 11)),
    mostActiveMonth: {
      label: "No activity",
      eventCount: 0,
      isTie: false,
      isAvailable: false,
    },
    weekendViewing: {
      weekendEvents: 0,
      totalEvents: 0,
      percentage: 0,
      isAvailable: false,
    },
    timeOfDay: {
      buckets: [
        { bucket: "Morning", eventCount: 0, percentage: 0 },
        { bucket: "Afternoon", eventCount: 0, percentage: 0 },
        { bucket: "Evening", eventCount: 0, percentage: 0 },
        { bucket: "Night", eventCount: 0, percentage: 0 },
      ],
      totalEvents: 0,
      isAvailable: false,
    },
    genreCount: {
      count: 0,
      isAvailable: false,
    },
    storyLandscape: {
      genres: [],
      totalWatchTimeMinutes: 0,
      isAvailable: false,
    },
    biggestStories: {
      stories: [],
      totalWatchTimeMinutes: 0,
      isAvailable: false,
    },
  };
}

function createDashboardWithStoryLandscape(): StatisticsDashboard {
  const base = createDashboardWithActivity();

  return {
    ...base,
    storyLandscape: {
      genres: [
        { genre: "Drama", watchTimeMinutes: 30, percentage: 60 },
        { genre: "Sci-Fi", watchTimeMinutes: 20, percentage: 40 },
      ],
      totalWatchTimeMinutes: 50,
      isAvailable: true,
    },
  };
}

describe("StatisticsOverviewCandidate supported insights", () => {

  it("renders a full zero-filled calendar with the empty-history message", () => {
    const stats = createEmptyDashboard();
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats,
        isLoading: false,
        error: null,
      }),
    );

    expect(stats.yearDayActivity.days).toHaveLength(365);
    expect(
      stats.yearDayActivity.days.every((day) => day.eventCount === 0),
    ).toBe(true);
    expect(markup).toContain('role="img"');
    expect(markup).toContain(
      "No recorded activity in the last 12 months.",
    );
    expect(markup).toContain(
      'aria-describedby="candidate-year-calendar-description"',
    );
    expect(markup).toContain(
      "No recorded watch events in the displayed calendar. Every day has zero events.",
    );
  });

  it("provides accessible dates and event counts for active calendar days", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithActivity(),
        isLoading: false,
        error: null,
      }),
    );
    const novemberEighth = new Date(2025, 10, 8).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
    const novemberNinth = new Date(2025, 10, 9).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
    const decemberFirst = new Date(2025, 11, 1).toLocaleDateString(undefined, {
      dateStyle: "long",
    });

    expect(markup).toContain(
      'aria-describedby="candidate-year-calendar-description"',
    );
    expect(markup).toContain(
      `3 active days with 5 recorded events. ${novemberEighth}: 2 events; ${novemberNinth}: 1 event; ${decemberFirst}: 2 events. All other displayed calendar days had no recorded events.`,
    );
  });

  it("describes calendar activity as loading before statistics are ready", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithActivity(),
        isLoading: true,
        error: null,
      }),
    );

    expect(markup).toContain("Daily watch activity is loading.");
  });

  it("does not present fallback zeros as successful data after a load error", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createEmptyDashboard(),
        isLoading: false,
        error: "Unable to load statistics.",
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(
      "Daily watch activity is unavailable because statistics could not be loaded.",
    );
    expect(markup).toContain(
      "Hourly watch activity is unavailable because statistics could not be loaded.",
    );
    expect(markup).not.toContain(
      "No recorded watch events in the displayed calendar.",
    );
    expect(markup).not.toContain(
      "No recorded activity in the last 12 months.",
    );
    expect(markup).not.toContain("No recorded viewing activity.");
    expect(markup).not.toContain("No activity");
    expect(markup).not.toContain("0 hours");
    expect(markup).not.toContain(">0h<");
    expect(markup).not.toContain(" — 0 events");
    expect(markup).not.toMatch(/<p[^>]*>\s*0\s*<\/p>/);
  });

  it("renders Story Landscape genres with watch time and percentages", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithStoryLandscape(),
        isLoading: false,
        error: null,
      }),
    );

    expect(markup).toContain("Drama");
    expect(markup).toContain("30 min");
    expect(markup).toContain("60%");
    expect(markup).toContain("Sci-Fi");
    expect(markup).toContain("20 min");
    expect(markup).toContain("40%");
    expect(markup).not.toContain(
      "Library distribution will appear when supporting analytics are available.",
    );
  });

  it("preserves Story Landscape ordering and does not renormalize percentages", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithStoryLandscape(),
        isLoading: false,
        error: null,
      }),
    );

    expect(markup.indexOf("Drama")).toBeLessThan(markup.indexOf("Sci-Fi"));
    expect(markup).toContain("60%");
    expect(markup).toContain("40%");
  });

  it("renders a meaningful empty state when Story Landscape is available but has no genres", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithActivity(),
        isLoading: false,
        error: null,
      }),
    );

    expect(markup).toContain("No story landscape yet.");
    expect(markup).toContain("No attributed TV watch time.");
    expect(markup).not.toContain(
      "Library distribution will appear when supporting analytics are available.",
    );
  });

  it("renders a no-recorded-history state when Story Landscape is unavailable", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createEmptyDashboard(),
        isLoading: false,
        error: null,
      }),
    );

    expect(markup).toContain("No recorded watch history.");
    expect(markup).not.toContain(
      "Library distribution will appear when supporting analytics are available.",
    );
  });

  it("does not render Story Landscape empty states while loading or after an error", () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createEmptyDashboard(),
        isLoading: true,
        error: null,
      }),
    );
    const errorMarkup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createEmptyDashboard(),
        isLoading: false,
        error: "Unable to load statistics.",
      }),
    );

    expect(loadingMarkup).not.toContain("No recorded watch history.");
    expect(loadingMarkup).not.toContain("No story landscape yet.");
    expect(errorMarkup).toContain(
      "Story landscape is unavailable because statistics could not be loaded.",
    );
    expect(errorMarkup).not.toContain("No recorded watch history.");
    expect(errorMarkup).not.toContain("No story landscape yet.");
  });
  it("renders populated month, weekend, and peak-hour dashboard data", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithActivity(),
        isLoading: false,
        error: null,
      }),
    );

    const novemberLabel = new Date(2025, 10, 1).toLocaleString(undefined, {
      month: "short",
      year: "numeric",
    });

    expect(markup).toContain(novemberLabel);
    expect(markup).toContain("50%");
    expect(markup).toContain("Saturday and Sunday");
    expect(markup).toContain("Evening");
    expect(markup).toContain("67%");
    expect(markup).not.toContain("No activity");
    expect(markup).toContain("Genre count");
    expect(markup).toContain("Distinct genres across watched titles");
  });

  it("renders recorded Milestones values from the supplied Statistics result", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createDashboardWithActivity(),
        isLoading: false,
        error: null,
      }),
    );
    const milestonesStart = markup.indexOf(
      'id="candidate-recorded-watch-activity"',
    );
    const milestonesMarkup = markup.slice(milestonesStart);

    expect(milestonesMarkup).toContain("Recorded Watch Activity");
    expect(milestonesMarkup).toContain(
      "Based on your currently recorded watch history.",
    );
    expect(milestonesMarkup).toContain("Episodes Watched");
    expect(milestonesMarkup).toContain("Movies Watched");
    expect(milestonesMarkup).toContain("Current Viewing Streak");
    expect(milestonesMarkup).toContain(
      'text-3xl font-bold leading-none text-primary">6</p>',
    );
    expect(milestonesMarkup).toContain(
      'text-3xl font-bold leading-none text-primary">2</p>',
    );
    expect(milestonesMarkup).toContain(
      'text-3xl font-bold leading-none text-primary">3</p>',
    );
  });

  it("renders deterministic zero Milestones values for empty history", () => {
    const markup = renderToStaticMarkup(
      createElement(StatisticsOverviewCandidate, {
        stats: createEmptyDashboard(),
        isLoading: false,
        error: null,
      }),
    );
    const milestonesStart = markup.indexOf(
      'id="candidate-recorded-watch-activity"',
    );
    const milestonesMarkup = markup.slice(milestonesStart);

    expect(milestonesMarkup).toContain("Episodes Watched");
    expect(milestonesMarkup).toContain("Movies Watched");
    expect(milestonesMarkup).toContain("Current Viewing Streak");
    expect(
      milestonesMarkup.match(
        /text-3xl font-bold leading-none text-primary">0<\/p>/g,
      ),
    ).toHaveLength(3);
  });

});
