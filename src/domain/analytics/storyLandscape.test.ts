import { describe, expect, it } from "vitest";

import type { Episode, Media } from "../../types";
import type { WatchActivityEvent } from "./types";
import { buildStoryLandscape } from "./storyLandscape";

function event(overrides: Partial<WatchActivityEvent> = {}): WatchActivityEvent {
  return {
    episodeId: 1,
    mediaId: 1,
    mediaType: "tv",
    source: "manual",
    watchedAt: new Date(2026, 5, 15, 20, 0, 0),
    ...overrides,
  };
}

function show(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    mediaType: "tv",
    title: "Test Show",
    userStatus: "completed",
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
  };
}

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 1,
    showId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Episode 1",
    runtime: 30,
    watched: true,
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("buildStoryLandscape", () => {
  it("returns isAvailable false for no events", () => {
    const result = buildStoryLandscape([], [show({ genres: ["Drama"] })], [episode()]);
    expect(result.isAvailable).toBe(false);
    expect(result.genres).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
  });

  it("single-genre TV show attributes runtime", () => {
    const result = buildStoryLandscape(
      [event()],
      [show({ id: 1, genres: ["Drama"] })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.isAvailable).toBe(true);
    expect(result.totalWatchTimeMinutes).toBe(30);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });

  it("multi-genre TV show contributes runtime to each genre", () => {
    const result = buildStoryLandscape(
      [event()],
      [show({ id: 1, genres: ["Drama", "Sci-Fi"] })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.totalWatchTimeMinutes).toBe(30);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
      { genre: "Sci-Fi", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });

  it("aggregates multiple episodes from the same show", () => {
    const result = buildStoryLandscape(
      [event({ episodeId: 1 }), event({ episodeId: 2 })],
      [show({ id: 1, genres: ["Drama"] })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.totalWatchTimeMinutes).toBe(50);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 50, percentage: 100 },
    ]);
  });

  it("aggregates runtime across shows sharing a genre", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: 1, episodeId: 1 }), event({ mediaId: 2, episodeId: 2 })],
      [show({ id: 1, genres: ["Drama"] }), show({ id: 2, genres: ["Drama", "Comedy"] })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.totalWatchTimeMinutes).toBe(50);
    const drama = result.genres.find((g) => g.genre === "Drama")!;
    expect(drama.watchTimeMinutes).toBe(50);
    const comedy = result.genres.find((g) => g.genre === "Comedy")!;
    expect(comedy.watchTimeMinutes).toBe(20);
  });

  it("skips events whose episodes have no runtime", () => {
    const result = buildStoryLandscape(
      [event({ episodeId: 1 }), event({ episodeId: 2 })],
      [show({ id: 1, genres: ["Drama"] })],
      [episode({ id: 1, runtime: undefined }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.totalWatchTimeMinutes).toBe(20);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 20, percentage: 100 },
    ]);
  });

  it("excludes titles with missing genres", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: 1, episodeId: 1 }), event({ mediaId: 2, episodeId: 2 })],
      [show({ id: 1, genres: ["Drama"] }), show({ id: 2 })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.totalWatchTimeMinutes).toBe(30);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });
  it("does not create an Unknown genre", () => {
    const result = buildStoryLandscape(
      [event()],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.genres).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
    expect(result.isAvailable).toBe(true);
  });

  it("deduplicates duplicate genre names within a show", () => {
    const result = buildStoryLandscape(
      [event()],
      [show({ id: 1, genres: ["Drama", "Drama"] })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });

  it("excludes legacy unattributed events", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: undefined, mediaType: undefined, episodeId: 99 })],
      [show({ id: 1, genres: ["Horror"] })],
      [episode({ id: 99, runtime: 40 })],
    );
    expect(result.genres).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
  });

  it("excludes movie events", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: 2, mediaType: "movie", episodeId: null })],
      [show({ id: 2, mediaType: "movie", genres: ["Action"] })],
      [],
    );
    expect(result.genres).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
  });

  it("handles mixed usable and unusable events", () => {
    const result = buildStoryLandscape(
      [
        event({ mediaId: 1, episodeId: 1 }),
        event({ mediaId: 2, episodeId: 2 }),
        event({ mediaId: 3, episodeId: 3 }),
      ],
      [show({ id: 1, genres: ["Drama"] }), show({ id: 2 }), show({ id: 3, genres: ["Action"] })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 }), episode({ id: 3, runtime: undefined })],
    );
    expect(result.totalWatchTimeMinutes).toBe(30);
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });

  it("handles no usable TV data but events exist", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: 1, episodeId: 1 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.isAvailable).toBe(true);
    expect(result.genres).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
  });

  it("sorts by watch time descending then genre ascending", () => {
    const result = buildStoryLandscape(
      [event({ mediaId: 1, episodeId: 1 }), event({ mediaId: 2, episodeId: 2 })],
      [show({ id: 1, genres: ["Zebra"] }), show({ id: 2, genres: ["Apple"] })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 30 })],
    );
    expect(result.genres.map((g) => g.genre)).toEqual(["Apple", "Zebra"]);
  });

  it("percentages can sum to more than 100", () => {
    const result = buildStoryLandscape(
      [event()],
      [show({ id: 1, genres: ["Drama", "Sci-Fi"] })],
      [episode({ id: 1, runtime: 30 })],
    );
    const sum = result.genres.reduce((s, g) => s + g.percentage, 0);
    expect(sum).toBe(200);
  });

  it("accepts episodes before media argument order", () => {
    const result = buildStoryLandscape(
      [event()],
      [episode({ id: 1, runtime: 30 })],
      [show({ id: 1, genres: ["Drama"] })],
    );
    expect(result.genres).toEqual([
      { genre: "Drama", watchTimeMinutes: 30, percentage: 100 },
    ]);
  });
});

