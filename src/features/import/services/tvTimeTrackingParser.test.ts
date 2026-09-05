import { describe, it, expect } from "vitest";
import { parseTvTimeTrackingRecords } from "./tvTimeTrackingParser";

// Mock data for tracking records - all values are strings as they come from CSV parsing
const mockTrackingRecords: Record<string, string>[] = [
  {
    key: "watch-episode-1",
    series_name: "Breaking Bad",
    s_id: "tvtime-breaking-bad",
    episode_id: "ep1",
    season_number: "1",
    episode_number: "1",
    bulk_type: "season",
    created_at: "2020-01-01T00:00:00",
    updated_at: "2020-01-02T00:00:00",
    rewatch_count: "0",
  },
  {
    key: "watch-episode-2",
    series_name: "Breaking Bad",
    s_id: "tvtime-breaking-bad",
    episode_id: "ep2",
    season_number: "1",
    episode_number: "2",
    bulk_type: "season",
    created_at: "2020-01-03T00:00:00",
    updated_at: "2020-01-04T00:00:00",
    rewatch_count: "1",
  },
  {
    key: "watch-episode-3",
    series_name: "Game of Thrones",
    s_id: "tvtime-game-of-thrones",
    episode_id: "ep1",
    season_number: "1",
    episode_number: "1",
    bulk_type: "season",
    created_at: "2021-01-01T00:00:00",
    updated_at: "2021-01-02T00:00:00",
    rewatch_count: "0",
  },
];

describe("TvTimeTrackingParser", () => {
  it("should parse watch-episode-* records and create watched episodes", () => {
    const trackingRecords = mockTrackingRecords;
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    expect(watchedEpisodes).toHaveLength(3);
    expect(watchedEpisodes[0].tvTimeShowId).toBe("tvtime-breaking-bad");
    expect(watchedEpisodes[0].showTitle).toBe("Breaking Bad");
    expect(watchedEpisodes[0].seasonNumber).toBe(1);
    expect(watchedEpisodes[0].episodeNumber).toBe(1);
    expect(watchedEpisodes[0].watchedAt).toBeDefined();
  });

  it("should exclude season 0 from normal watched-episode candidates", () => {
    const trackingRecords: Record<string, string>[] = [
      {
        key: "watch-episode-1",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "0",
        episode_number: "1",
        bulk_type: "season",
        created_at: "2020-01-01T00:00:00",
        updated_at: "2020-01-02T00:00:00",
        rewatch_count: "0",
      },
    ];
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    expect(watchedEpisodes).toHaveLength(0);
  });

  it("should skip malformed timestamps without crashing", () => {
    const trackingRecords: Record<string, string>[] = [
      {
        key: "watch-episode-1",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "season",
        created_at: "invalid-date",
        updated_at: "2020-01-02T00:00:00",
        rewatch_count: "0",
      },
    ];
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    // Should not throw; the malformed record is simply skipped
    expect(watchedEpisodes).toHaveLength(0);
  });

  it("should handle duplicate tracks (same s_id, season, episode) by keeping one", () => {
    const trackingRecords: Record<string, string>[] = [
      {
        key: "watch-episode-1",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "season",
        created_at: "2020-01-01T00:00:00",
        updated_at: "2020-01-02T00:00:00",
        rewatch_count: "0",
      },
      {
        key: "watch-episode-2",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "season",
        created_at: "2020-01-01T00:00:00",
        updated_at: "2020-01-02T00:00:00",
        rewatch_count: "0",
      },
    ];
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    // Both records have the same (s_id, season, episode), so only one should appear
    expect(watchedEpisodes).toHaveLength(1);
    expect(watchedEpisodes[0].tvTimeShowId).toBe("tvtime-breaking-bad");
  });

  it("retains the earliest watch timestamp for duplicate records", () => {
    const trackingRecords: Record<string, string>[] = [
      {
        key: "watch-episode-1",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "",
        created_at: "2020-03-01T00:00:00",
        updated_at: "2020-03-01T00:00:00",
        rewatch_count: "1",
      },
      {
        key: "watch-episode-2",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "",
        created_at: "2020-01-01T00:00:00",
        updated_at: "2020-01-01T00:00:00",
        rewatch_count: "1",
      },
    ];
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    expect(watchedEpisodes).toHaveLength(1);

    /*
     * WatchLog never overwrites a watch timestamp once set: applyManualWatch()
     * and markWatchedFromImport() skip already-watched episodes and preserve
     * their existing watchedAt. The first watch therefore defines the watch
     * state, so the earliest timestamp wins, independent of CSV row order.
     */
    expect(watchedEpisodes[0].watchedAt.toISOString()).toBe(
      "2020-01-01T05:00:00.000Z",
    );
  });

  it("keeps the earliest duplicate timestamp regardless of CSV row order", () => {
    const trackingRecords: Record<string, string>[] = [
      {
        key: "watch-episode-1",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "",
        created_at: "2020-05-01T00:00:00",
        updated_at: "2020-05-01T00:00:00",
        rewatch_count: "2",
      },
      {
        key: "watch-episode-2",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "",
        created_at: "2020-02-01T00:00:00",
        updated_at: "2020-02-01T00:00:00",
        rewatch_count: "1",
      },
      {
        key: "watch-episode-3",
        series_name: "Breaking Bad",
        s_id: "tvtime-breaking-bad",
        episode_id: "ep1",
        season_number: "1",
        episode_number: "1",
        bulk_type: "",
        created_at: "2020-04-01T00:00:00",
        updated_at: "2020-04-01T00:00:00",
        rewatch_count: "1",
      },
    ];
    const timezone = "America/New_York";
    const watchedEpisodes = parseTvTimeTrackingRecords(trackingRecords, timezone);

    expect(watchedEpisodes).toHaveLength(1);
    expect(watchedEpisodes[0].watchedAt.toISOString()).toBe(
      "2020-02-01T05:00:00.000Z",
    );
  });
});