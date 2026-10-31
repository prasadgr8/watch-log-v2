import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";
import { calculateMilestones } from "./milestones";

function localDate(day: number, hour = 12): Date {
  return new Date(2026, 6, day, hour, 0, 0, 0);
}

function makeEvent(
  watchedAt: Date,
  overrides: Partial<WatchActivityEvent> = {},
): WatchActivityEvent {
  return {
    episodeId: 1,
    watchedAt,
    source: "manual",
    ...overrides,
  };
}

describe("calculateMilestones", () => {
  it("returns zero values for empty recorded history", () => {
    expect(calculateMilestones([])).toEqual({
      episodesWatched: 0,
      moviesWatched: 0,
      currentViewingStreak: 0,
    });
  });

  it("counts explicitly attributed episode and movie events and the current streak", () => {
    const events = [
      makeEvent(localDate(10), {
        episodeId: 1,
        mediaId: 20,
        mediaType: "tv",
      }),
      makeEvent(localDate(11), {
        episodeId: 2,
        mediaId: 20,
        mediaType: "tv",
        source: "import",
      }),
      makeEvent(localDate(11, 15), {
        episodeId: null,
        mediaId: 30,
        mediaType: "movie",
      }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 2,
      moviesWatched: 1,
      currentViewingStreak: 2,
    });
  });

  it("does not count TV events without a numeric episode id or movies with one", () => {
    const events = [
      makeEvent(localDate(12), {
        episodeId: null,
        mediaId: 20,
        mediaType: "tv",
      }),
      makeEvent(localDate(12, 18), {
        episodeId: 123,
        mediaId: 30,
        mediaType: "movie",
      }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 0,
      moviesWatched: 0,
      currentViewingStreak: 1,
    });
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["zero", 0],
    ["a negative integer", -1],
    ["a fractional number", 1.5],
  ] as const)(
    "does not count a TV episode with %s as its ID",
    (_label, episodeId) => {
      const event = makeEvent(localDate(12), {
        episodeId,
        mediaId: 20,
        mediaType: "tv",
      });

      expect(calculateMilestones([event]).episodesWatched).toBe(0);
    },
  );

  it("counts valid events and excludes contradictory shapes in mixed history", () => {
    const events = [
      makeEvent(localDate(13), {
        episodeId: 7,
        mediaId: 20,
        mediaType: "tv",
      }),
      makeEvent(localDate(14), {
        episodeId: null,
        mediaId: 20,
        mediaType: "tv",
      }),
      makeEvent(localDate(14, 18), {
        episodeId: null,
        mediaId: 30,
        mediaType: "movie",
      }),
      makeEvent(localDate(15), {
        episodeId: 123,
        mediaId: 30,
        mediaType: "movie",
      }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 1,
      moviesWatched: 1,
      currentViewingStreak: 3,
    });
  });

  it("counts each recorded rewatch event, even when it refers to the same title", () => {
    const events = [
      makeEvent(localDate(8), {
        episodeId: 7,
        mediaId: 50,
        mediaType: "tv",
      }),
      makeEvent(localDate(9), {
        episodeId: 7,
        mediaId: 50,
        mediaType: "tv",
      }),
      makeEvent(localDate(9, 18), {
        episodeId: null,
        mediaId: 60,
        mediaType: "movie",
      }),
      makeEvent(localDate(10), {
        episodeId: null,
        mediaId: 60,
        mediaType: "movie",
      }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 2,
      moviesWatched: 2,
      currentViewingStreak: 3,
    });
  });

  it("does not infer media type from a legacy event without attribution", () => {
    const legacyEvent = makeEvent(localDate(12), { episodeId: 5 });

    expect(calculateMilestones([legacyEvent])).toEqual({
      episodesWatched: 0,
      moviesWatched: 0,
      currentViewingStreak: 1,
    });
  });

  it("returns zero counts when events are insufficiently attributed", () => {
    const events = [
      makeEvent(localDate(12), { episodeId: 5, mediaId: 10 }),
      makeEvent(localDate(13), { episodeId: null, mediaId: 11 }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 0,
      moviesWatched: 0,
      currentViewingStreak: 2,
    });
  });

  it("uses one-day streak semantics for a single event and multiple events on that day", () => {
    const first = makeEvent(localDate(15, 8));
    const second = makeEvent(localDate(15, 20), {
      episodeId: null,
      mediaId: 30,
      mediaType: "movie",
    });

    expect(calculateMilestones([first, second]).currentViewingStreak).toBe(1);
    expect(calculateMilestones([first]).currentViewingStreak).toBe(1);
  });

  it("stops the current streak at the latest day when there is a gap", () => {
    const events = [
      makeEvent(localDate(1), { mediaType: "tv", mediaId: 4 }),
      makeEvent(localDate(2), { mediaType: "tv", mediaId: 4 }),
      makeEvent(localDate(5), {
        mediaType: "movie",
        mediaId: 9,
        episodeId: null,
      }),
      makeEvent(localDate(6), {
        mediaType: "movie",
        mediaId: 9,
        episodeId: null,
      }),
    ];

    expect(calculateMilestones(events)).toEqual({
      episodesWatched: 2,
      moviesWatched: 2,
      currentViewingStreak: 2,
    });
  });

  it("is deterministic regardless of event order and does not mutate input", () => {
    const events = [
      makeEvent(localDate(20), {
        mediaType: "movie",
        mediaId: 9,
        episodeId: null,
      }),
      makeEvent(localDate(18), { mediaType: "tv", mediaId: 4 }),
      makeEvent(localDate(19), { mediaType: "tv", mediaId: 4, episodeId: 2 }),
    ];
    const before = structuredClone(events);

    const result = calculateMilestones(events);
    const reversedResult = calculateMilestones([...events].reverse());

    expect(result).toEqual({
      episodesWatched: 2,
      moviesWatched: 1,
      currentViewingStreak: 3,
    });
    expect(reversedResult).toEqual(result);
    expect(events).toEqual(before);
  });
});
