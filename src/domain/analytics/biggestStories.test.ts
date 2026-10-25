import { describe, expect, it } from "vitest";

import type { Episode, Media } from "../../types";
import type { WatchActivityEvent } from "./types";
import { buildBiggestStories } from "./biggestStories";

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

describe("buildBiggestStories", () => {
  it("returns isAvailable false for no events", () => {
    const result = buildBiggestStories([], [show()], [episode()]);
    expect(result.isAvailable).toBe(false);
    expect(result.stories).toEqual([]);
    expect(result.totalWatchTimeMinutes).toBe(0);
  });

  it("ranks one title", () => {
    const result = buildBiggestStories(
      [event()],
      [show({ id: 1, title: "Alpha" })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.isAvailable).toBe(true);
    expect(result.totalWatchTimeMinutes).toBe(30);
    expect(result.stories).toEqual([
      {
        mediaId: 1,
        mediaType: "tv",
        title: "Alpha",
        watchTimeMinutes: 30,
        watchCount: 1,
        distinctEpisodesWatched: 1,
        percentage: 100,
      },
    ]);
    });

  it("aggregates multiple titles", () => {
    const result = buildBiggestStories(
      [event({ mediaId: 1, episodeId: 1 }), event({ mediaId: 2, episodeId: 2 })],
      [show({ id: 1, title: "Alpha" }), show({ id: 2, title: "Beta" })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.stories.map((story) => story.mediaId)).toEqual([1, 2]);
    expect(result.stories[0].watchTimeMinutes).toBe(30);
    expect(result.stories[1].watchTimeMinutes).toBe(20);
    expect(result.stories[0].percentage).toBe(60);
    expect(result.stories[1].percentage).toBe(40);
  });

  it("counts repeated events repeatedly", () => {
    const result = buildBiggestStories(
      [event({ episodeId: 1 }), event({ episodeId: 1 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.stories[0].watchTimeMinutes).toBe(60);
    expect(result.stories[0].watchCount).toBe(2);
    expect(result.stories[0].distinctEpisodesWatched).toBe(1);
  });

  it("counts distinct episodes", () => {
    const result = buildBiggestStories(
      [event({ episodeId: 1 }), event({ episodeId: 2 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 20 })],
    );
    expect(result.stories[0].distinctEpisodesWatched).toBe(2);
    expect(result.stories[0].watchCount).toBe(2);
  });

  it("uses deterministic tie ordering", () => {
    const result = buildBiggestStories(
      [
        event({ mediaId: 1, episodeId: 1 }),
        event({ mediaId: 2, episodeId: 2 }),
      ],
      [show({ id: 1, title: "Beta" }), show({ id: 2, title: "Alpha" })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 30 })],
    );
    expect(result.stories.map((story) => story.title)).toEqual(["Alpha", "Beta"]);
  });

  it("breaks ties by watchCount then title then mediaId", () => {
    const result = buildBiggestStories(
      [
        event({ mediaId: 1, episodeId: 1 }),
        event({ mediaId: 1, episodeId: 2 }),
        event({ mediaId: 2, episodeId: 3 }),
      ],
      [show({ id: 1, title: "Same" }), show({ id: 2, title: "Same" })],
      [
        episode({ id: 1, runtime: 10 }),
        episode({ id: 2, runtime: 10 }),
        episode({ id: 3, runtime: 30 }),
      ],
    );
    expect(result.stories.map((story) => story.mediaId)).toEqual([2, 1]);
  });

  it("excludes events with missing runtime", () => {
    const result = buildBiggestStories(
      [event({ episodeId: 1 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: undefined })],
    );
    expect(result.stories).toEqual([]);
    expect(result.isAvailable).toBe(true);
  });

  it("excludes missing media", () => {
    const result = buildBiggestStories(
      [event({ mediaId: 99, episodeId: 1 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.stories).toEqual([]);
  });

  it("excludes missing episode", () => {
    const result = buildBiggestStories(
      [event({ episodeId: 99 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.stories).toEqual([]);
  });

  it("excludes legacy unattributed events", () => {
    const result = buildBiggestStories(
      [event({ mediaId: undefined, mediaType: undefined, episodeId: 1 })],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 30 })],
    );
    expect(result.stories).toEqual([]);
  });

  it("excludes movie events", () => {
    const result = buildBiggestStories(
      [event({ mediaId: 2, mediaType: "movie", episodeId: null })],
      [show({ id: 2, mediaType: "movie" })],
      [],
    );
    expect(result.stories).toEqual([]);
  });

  it("handles mixed usable and unusable events", () => {
    const result = buildBiggestStories(
      [
        event({ mediaId: 1, episodeId: 1 }),
        event({ mediaId: 2, episodeId: 2 }),
        event({ mediaId: 3, episodeId: 3 }),
      ],
      [show({ id: 1, title: "Alpha" }), show({ id: 2, title: "Beta" }), show({ id: 3, title: "Gamma" })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: undefined }), episode({ id: 3, runtime: 20 })],
    );
    expect(result.stories.map((story) => story.mediaId)).toEqual([1, 3]);
    expect(result.totalWatchTimeMinutes).toBe(50);
  });

  it("calculates percentages", () => {
    const result = buildBiggestStories(
      [event({ mediaId: 1, episodeId: 1 }), event({ mediaId: 2, episodeId: 2 })],
      [show({ id: 1 }), show({ id: 2 })],
      [episode({ id: 1, runtime: 30 }), episode({ id: 2, runtime: 10 })],
    );
    expect(result.stories[0].percentage).toBe(75);
    expect(result.stories[1].percentage).toBe(25);
  });

  it("does not mutate inputs", () => {
    const events = [event()];
    const media = [show()];
    const episodes = [episode()];
    const snapshot = JSON.stringify({ events, media, episodes });
    buildBiggestStories(events, media, episodes);
    expect(JSON.stringify({ events, media, episodes })).toBe(snapshot);
  });

  it("accepts episodes before media", () => {
    const result = buildBiggestStories(
      [event()],
      [episode({ id: 1, runtime: 30 })],
      [show({ id: 1, title: "Alpha" })],
    );
    expect(result.stories[0].title).toBe("Alpha");
  });

  it("handles zero-runtime eligible events", () => {
    const result = buildBiggestStories(
      [event()],
      [show({ id: 1 })],
      [episode({ id: 1, runtime: 0 })],
    );
    expect(result.stories[0].watchTimeMinutes).toBe(0);
    expect(result.stories[0].percentage).toBe(0);
  });
});
