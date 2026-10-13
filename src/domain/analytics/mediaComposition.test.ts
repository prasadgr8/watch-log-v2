import { describe, expect, it } from "vitest";

import type {
  MovieWatchEvent,
  TvWatchEvent,
  WatchActivityEvent,
} from "./types";

import {
  countMovieEvents,
  countTvEpisodeEvents,
  countUniqueMedia,
} from "./mediaComposition";

/*
 * Deterministic tests for the media-composition analytics.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user own calendar and hold in
 * every timezone. No database, clock, or network access is involved.
 *
 * The central property under test is EXPLICIT attribution: a TV/movie kind is
 * decided by `mediaType` alone and a title by the authoritative `mediaId`, so
 * a legacy unattributed row (a numeric `episodeId` with no `mediaType` and no
 * `mediaId`) is never inferred into either count or into the unique-title set.
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

/** A valid attributed unified TV episode event. */
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

/** A valid attributed unified movie event (episodeId always null). */
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

/**
 * A legacy unattributed episode event: a numeric `episodeId` with no
 * `mediaType` and no `mediaId`, exactly as a pre-unified-model row looks.
 */
function makeLegacyEvent(
  watchedAt: Date,
  episodeId = 1,
): WatchActivityEvent {
  return { episodeId, watchedAt, source: "manual" };
}

describe("countTvEpisodeEvents", () => {
  it("returns zero for an empty history", () => {
    expect(countTvEpisodeEvents([])).toBe(0);
  });

  it("counts every attributed TV episode event", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15)),
      makeTvEvent(localDate(2026, 6, 16)),
      makeTvEvent(localDate(2026, 6, 17)),
    ];

    expect(countTvEpisodeEvents(events)).toBe(3);
  });

  it("counts only the TV events in a mixed TV/movie history", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15)),
      makeMovieEvent(localDate(2026, 6, 15)),
      makeTvEvent(localDate(2026, 6, 16)),
    ];

    expect(countTvEpisodeEvents(events)).toBe(2);
  });

  it("never infers a TV event from a legacy unattributed episode id", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15)),
      makeLegacyEvent(localDate(2026, 6, 16), 42),
      makeLegacyEvent(localDate(2026, 6, 17), 43),
    ];

    // The legacy rows carry episode ids but no mediaType, so only the one
    // attributed TV event counts.
    expect(countTvEpisodeEvents(events)).toBe(1);
  });

  it("returns zero when only movie and legacy events are present", () => {
    const events = [
      makeMovieEvent(localDate(2026, 6, 15)),
      makeLegacyEvent(localDate(2026, 6, 16)),
    ];

    expect(countTvEpisodeEvents(events)).toBe(0);
  });
});

describe("countMovieEvents", () => {
  it("returns zero for an empty history", () => {
    expect(countMovieEvents([])).toBe(0);
  });

  it("counts every attributed movie event", () => {
    const events = [
      makeMovieEvent(localDate(2026, 6, 15)),
      makeMovieEvent(localDate(2026, 6, 16)),
    ];

    expect(countMovieEvents(events)).toBe(2);
  });

  it("counts only the movie events in a mixed TV/movie history", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15)),
      makeMovieEvent(localDate(2026, 6, 15)),
      makeTvEvent(localDate(2026, 6, 16)),
      makeMovieEvent(localDate(2026, 6, 17)),
    ];

    expect(countMovieEvents(events)).toBe(2);
  });

  it("never infers a movie event from a legacy unattributed row", () => {
    const events = [
      makeMovieEvent(localDate(2026, 6, 15)),
      makeLegacyEvent(localDate(2026, 6, 16)),
    ];

    // The legacy row has no mediaType, so it is not counted as a movie.
    expect(countMovieEvents(events)).toBe(1);
  });

  it("returns zero when only TV and legacy events are present", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15)),
      makeLegacyEvent(localDate(2026, 6, 16)),
    ];

    expect(countMovieEvents(events)).toBe(0);
  });
});

describe("countUniqueMedia", () => {
  it("returns zero for an empty history", () => {
    expect(countUniqueMedia([])).toBe(0);
  });

  it("counts many episodes from the same TV show as one title", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15), { mediaId: 100, episodeId: 1 }),
      makeTvEvent(localDate(2026, 6, 16), { mediaId: 100, episodeId: 2 }),
      makeTvEvent(localDate(2026, 6, 17), { mediaId: 100, episodeId: 3 }),
    ];

    expect(countUniqueMedia(events)).toBe(1);
  });

  it("counts repeated movie events for the same movie as one title", () => {
    const events = [
      makeMovieEvent(localDate(2026, 6, 15), { mediaId: 200 }),
      makeMovieEvent(localDate(2026, 6, 16), { mediaId: 200 }),
    ];

    expect(countUniqueMedia(events)).toBe(1);
  });

  it("counts different TV shows as separate titles", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15), { mediaId: 100, episodeId: 1 }),
      makeTvEvent(localDate(2026, 6, 16), { mediaId: 100, episodeId: 2 }),
      makeTvEvent(localDate(2026, 6, 17), { mediaId: 101, episodeId: 1 }),
    ];

    expect(countUniqueMedia(events)).toBe(2);
  });

  it("counts a TV show and a movie as separate titles", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15), { mediaId: 100 }),
      makeMovieEvent(localDate(2026, 6, 16), { mediaId: 200 }),
    ];

    expect(countUniqueMedia(events)).toBe(2);
  });

  it("excludes legacy unattributed events and never counts episode ids", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15), { mediaId: 100, episodeId: 1 }),
      makeLegacyEvent(localDate(2026, 6, 16), 42),
      makeLegacyEvent(localDate(2026, 6, 17), 43),
    ];

    // Only the one attributed title counts; the two distinct legacy episode
    // ids are NOT treated as titles.
    expect(countUniqueMedia(events)).toBe(1);
  });

  it("does not mutate the input and is order-independent", () => {
    const events = [
      makeTvEvent(localDate(2026, 6, 15), { mediaId: 100 }),
      makeMovieEvent(localDate(2026, 6, 16), { mediaId: 200 }),
      makeTvEvent(localDate(2026, 6, 17), { mediaId: 101 }),
    ];
    const snapshot = structuredClone(events);

    const forward = countUniqueMedia(events);
    const reversed = countUniqueMedia([...events].reverse());

    expect(forward).toBe(3);
    expect(reversed).toBe(3);
    expect(events).toEqual(snapshot);
  });
});