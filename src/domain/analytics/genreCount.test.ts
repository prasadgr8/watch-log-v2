import { describe, expect, it } from "vitest";

import type { Media } from "../../types";
import type { WatchActivityEvent } from "./types";
import { countDistinctGenres } from "./genreCount";

function event(mediaId?: number): WatchActivityEvent {
  return {
    episodeId: null,
    mediaId,
    mediaType: "movie",
    source: "manual",
    watchedAt: new Date(2026, 5, 15, 20, 0, 0),
  };
}

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    mediaType: "movie",
    title: "Test Movie",
    userStatus: "completed",
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("countDistinctGenres", () => {
  it("returns isAvailable false for no events", () => {
    const result = countDistinctGenres([], [media()]);

    expect(result.isAvailable).toBe(false);
    expect(result.count).toBe(0);
  });

  it("counts distinct genres across titles with watch events", () => {
    const result = countDistinctGenres(
      [event(1), event(2)],
      [media({ id: 1, genres: ["Action", "Sci-Fi"] }), media({ id: 2, genres: ["Sci-Fi", "Thriller"] })],
    );

    expect(result.isAvailable).toBe(true);
    expect(result.count).toBe(3); // Action, Sci-Fi, Thriller
  });

  it("does not inflate genre count for multiple events on the same title", () => {
    const result = countDistinctGenres(
      [event(1), event(1), event(1)],
      [media({ id: 1, genres: ["Action", "Comedy"] })],
    );

    expect(result.count).toBe(2); // Action, Comedy
  });

  it("counts a multi-genre title's genres once each", () => {
    const result = countDistinctGenres(
      [event(1)],
      [media({ id: 1, genres: ["Drama", "Romance", "Drama"] })],
    );

    expect(result.count).toBe(2); // Drama, Romance
  });

  it("counts shared genres across titles only once", () => {
    const result = countDistinctGenres(
      [event(1), event(2)],
      [
        media({ id: 1, genres: ["Action"] }),
        media({ id: 2, genres: ["Action"] }),
      ],
    );

    expect(result.count).toBe(1); // Action
  });

  it("excludes titles with missing genres", () => {
    const result = countDistinctGenres(
      [event(1), event(2)],
      [
        media({ id: 1, genres: ["Action"] }),
        media({ id: 2 }), // no genres
      ],
    );

    expect(result.count).toBe(1); // Action only
  });

  it("does not create an Unknown genre for missing metadata", () => {
    const result = countDistinctGenres(
      [event(1), event(2)],
      [
        media({ id: 1 }),
        media({ id: 2 }),
      ],
    );

    expect(result.count).toBe(0);
  });

  it("excludes legacy unattributed events (no mediaId)", () => {
    const result = countDistinctGenres(
      [event(), event(), event(1)],
      [media({ id: 1, genres: ["Horror"] })],
    );

    expect(result.count).toBe(1); // Horror from the attributed event only
  });

  it("returns zero when events exist but no titles are attributable", () => {
    const result = countDistinctGenres([event(), event()], []);

    expect(result.isAvailable).toBe(true);
    expect(result.count).toBe(0);
  });
});