import { describe, expect, it } from "vitest";

import type { MovieWatchEvent, TvWatchEvent, WatchActivityEvent } from "./types";

import { compareWatchEvents, groupEventsByPeriod } from "./watchPeriods";
import { getCurrentStreak } from "./viewingStreak";

/*
 * Focused contract tests for the Step 2.4 unified watch-event domain.
 *
 * These cover the domain/type contract only: the TV and movie event shapes,
 * that multiple events are representable at the domain level, and that the
 * deterministic event comparator orders every shape — including movie events
 * whose `episodeId` is `null` — while leaving the existing TV ordering
 * unchanged. No database, schema, migration, or write path is exercised here;
 * those belong to later steps.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so the ordering and streak assertions describe the user's own
 * calendar and hold in every timezone.
 */

/** Local-date fixture: `new Date(2026, monthIndex, day, hours, minutes)`. */
function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

/** A valid unified TV episode event (mediaId mandatory, numeric episodeId). */
function makeTvEvent(
  watchedAt: Date,
  overrides: Partial<TvWatchEvent> = {},
): TvWatchEvent {
  return {
    mediaId: 100,
    mediaType: "tv",
    episodeId: 1,
    watchedAt,
    source: "manual",
    ...overrides,
  };
}

/** A valid unified movie event (mediaId mandatory, episodeId always null). */
function makeMovieEvent(
  watchedAt: Date,
  overrides: Partial<MovieWatchEvent> = {},
): MovieWatchEvent {
  return {
    mediaId: 200,
    mediaType: "movie",
    episodeId: null,
    watchedAt,
    source: "manual",
    ...overrides,
  };
}

describe("unified watch event shapes", () => {
  it("models a TV episode event with a media id, mediaType tv, and an episode id", () => {
    const event = makeTvEvent(localDate(2026, 6, 15, 20));

    expect(event.mediaType).toBe("tv");
    expect(event.mediaId).toBe(100);
    expect(event.episodeId).toBe(1);
    expect(typeof event.episodeId).toBe("number");
  });

  it("models a movie event with a media id, mediaType movie, and a null episode id", () => {
    const event = makeMovieEvent(localDate(2026, 6, 15, 21));

    expect(event.mediaType).toBe("movie");
    expect(event.mediaId).toBe(200);
    expect(event.episodeId).toBeNull();
  });

  it("is assignable to the analytics-consumed WatchActivityEvent shape", () => {
    const tvEvent: WatchActivityEvent = makeTvEvent(localDate(2026, 6, 15));
    const movieEvent: WatchActivityEvent = makeMovieEvent(localDate(2026, 6, 15));

    expect(tvEvent.episodeId).toBe(1);
    expect(movieEvent.episodeId).toBeNull();
  });
});

describe("multiple events are representable", () => {
  it("lets the same TV episode carry separate events at different times", () => {
    const first = makeTvEvent(localDate(2026, 6, 15, 20), { episodeId: 7 });
    const second = makeTvEvent(localDate(2026, 6, 18, 20), { episodeId: 7 });

    expect(first.episodeId).toBe(second.episodeId);
    expect(first.watchedAt.getTime()).not.toBe(second.watchedAt.getTime());
  });

  it("lets the same movie carry separate events at different times", () => {
    const first = makeMovieEvent(localDate(2026, 6, 15, 20), { mediaId: 5 });
    const second = makeMovieEvent(localDate(2026, 6, 18, 20), { mediaId: 5 });

    expect(first.mediaId).toBe(second.mediaId);
    expect(first.watchedAt.getTime()).not.toBe(second.watchedAt.getTime());
  });

  it("adds no uniqueness constraint at the domain level", () => {
    const first = makeTvEvent(localDate(2026, 6, 15, 20), { episodeId: 3 });
    const second = makeTvEvent(localDate(2026, 6, 15, 20), { episodeId: 3 });

    // Two events for the same episode at the same instant are both valid; only
    // the persisted id (when present) distinguishes them.
    expect(compareWatchEvents(first, second)).toBe(0);
  });
});

describe("event comparator deterministic ordering", () => {
  it("orders events by watched time first", () => {
    const earlier = makeTvEvent(localDate(2026, 6, 15, 8), {
      episodeId: 9,
      id: 99,
    });
    const later = makeTvEvent(localDate(2026, 6, 15, 20), {
      episodeId: 1,
      id: 1,
    });

    expect(compareWatchEvents(earlier, later)).toBeLessThan(0);
    expect(compareWatchEvents(later, earlier)).toBeGreaterThan(0);
  });

  it("keeps the existing TV ordering: watchedAt, then episodeId, then id", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);

    // Same instant, different episodes -> ascending episode id (unchanged tier).
    const episodeTwo = makeTvEvent(sharedTimestamp, {
      episodeId: 2,
      mediaId: 10,
      id: 1,
    });
    const episodeOne = makeTvEvent(sharedTimestamp, {
      episodeId: 1,
      mediaId: 99,
      id: 2,
    });
    expect(compareWatchEvents(episodeOne, episodeTwo)).toBeLessThan(0);

    // Same instant, same episode, different ids -> ascending id (unchanged tier).
    const higherId = makeTvEvent(sharedTimestamp, { episodeId: 1, id: 30 });
    const lowerId = makeTvEvent(sharedTimestamp, { episodeId: 1, id: 10 });
    expect(compareWatchEvents(lowerId, higherId)).toBeLessThan(0);
  });

  it("does not let the mediaId tier reorder TV events ahead of episodeId", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);

    // A larger mediaId must NOT pull an event ahead of a lower episodeId: the
    // mediaId tier is inert for two TV events because episodeId already decides.
    const highMediaLowEpisode = makeTvEvent(sharedTimestamp, {
      episodeId: 1,
      mediaId: 1000,
      id: 5,
    });
    const lowMediaHighEpisode = makeTvEvent(sharedTimestamp, {
      episodeId: 2,
      mediaId: 1,
      id: 6,
    });

    expect(compareWatchEvents(highMediaLowEpisode, lowMediaHighEpisode)).toBeLessThan(
      0,
    );
  });

  it("orders a movie event (null episodeId) before an episode event at the same instant", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);
    const movie = makeMovieEvent(sharedTimestamp, { mediaId: 1 });
    const episode = makeTvEvent(sharedTimestamp, { episodeId: 1, mediaId: 2 });

    expect(compareWatchEvents(movie, episode)).toBeLessThan(0);
    expect(compareWatchEvents(episode, movie)).toBeGreaterThan(0);
  });

  it("orders two movie events at the same instant deterministically by mediaId", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);
    const lowerMedia = makeMovieEvent(sharedTimestamp, { mediaId: 10 });
    const higherMedia = makeMovieEvent(sharedTimestamp, { mediaId: 20 });

    expect(compareWatchEvents(lowerMedia, higherMedia)).toBeLessThan(0);
    expect(compareWatchEvents(higherMedia, lowerMedia)).toBeGreaterThan(0);
  });

  it("breaks movie-event ties on the same media and instant by ascending id", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);
    const higherId = makeMovieEvent(sharedTimestamp, { mediaId: 5, id: 30 });
    const lowerId = makeMovieEvent(sharedTimestamp, { mediaId: 5, id: 10 });

    expect(compareWatchEvents(lowerId, higherId)).toBeLessThan(0);
  });

  it("falls back to equal (never NaN) when ids are absent", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);
    const movieA = makeMovieEvent(sharedTimestamp, { mediaId: 5 });
    const movieB = makeMovieEvent(sharedTimestamp, { mediaId: 5 });

    expect(Number.isNaN(compareWatchEvents(movieA, movieB))).toBe(false);
    expect(compareWatchEvents(movieA, movieB)).toBe(0);
  });

  it("produces identical grouping for permuted mixed movie and TV inputs", () => {
    const events: WatchActivityEvent[] = [
      makeTvEvent(localDate(2026, 6, 15, 20), { episodeId: 1, id: 1 }),
      makeMovieEvent(localDate(2026, 6, 15, 20), { mediaId: 2, id: 2 }),
      makeMovieEvent(localDate(2026, 6, 15, 20), { mediaId: 1, id: 3 }),
      makeTvEvent(localDate(2026, 6, 16, 9), { episodeId: 2, id: 4 }),
    ];

    const forward = groupEventsByPeriod(events, "day");
    const reversed = groupEventsByPeriod([...events].reverse(), "day");

    expect(reversed).toEqual(forward);
    expect(forward.totalEventCount).toBe(4);
  });
});

describe("unified events flow through existing analytics unchanged", () => {
  it("counts a movie viewing day in the current streak", () => {
    const streak = getCurrentStreak([
      makeMovieEvent(localDate(2026, 6, 15)),
      makeMovieEvent(localDate(2026, 6, 16)),
    ]);

    expect(streak).toBe(2);
  });

  it("counts a movie and an episode on the same day as one viewing day", () => {
    const streak = getCurrentStreak([
      makeMovieEvent(localDate(2026, 6, 15, 21)),
      makeTvEvent(localDate(2026, 6, 15, 22)),
    ]);

    expect(streak).toBe(1);
  });
});