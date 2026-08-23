import { describe, expect, it } from "vitest";

import type { PersistedEpisode } from "../../../types";

import { deriveSeasonStatus } from "./seasonStatus";

function createEpisode(
  overrides: Partial<PersistedEpisode> = {},
): PersistedEpisode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    id: 1,
    showId: 1,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("deriveSeasonStatus", () => {
  it("reports an empty season when no episodes are persisted", () => {
    const summary = deriveSeasonStatus([]);

    expect(summary).toEqual({
      status: "empty",
      watchedEpisodeCount: 0,
      totalEpisodeCount: 0,
    });
  });

  it("reports unwatched when no episodes are watched", () => {
    const summary = deriveSeasonStatus([
      createEpisode({ id: 1, episodeNumber: 1 }),
      createEpisode({ id: 2, episodeNumber: 2 }),
      createEpisode({ id: 3, episodeNumber: 3 }),
    ]);

    expect(summary).toEqual({
      status: "unwatched",
      watchedEpisodeCount: 0,
      totalEpisodeCount: 3,
    });
  });

  it("reports partially watched with correct counts", () => {
    const summary = deriveSeasonStatus([
      createEpisode({
        id: 1,
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
      createEpisode({ id: 2, episodeNumber: 2 }),
      createEpisode({ id: 3, episodeNumber: 3 }),
      createEpisode({ id: 4, episodeNumber: 4 }),
    ]);

    expect(summary).toEqual({
      status: "partially-watched",
      watchedEpisodeCount: 1,
      totalEpisodeCount: 4,
    });
  });

  it("reports fully watched when every episode is watched", () => {
    const summary = deriveSeasonStatus([
      createEpisode({
        id: 1,
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
      createEpisode({
        id: 2,
        episodeNumber: 2,
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    ]);

    expect(summary).toEqual({
      status: "fully-watched",
      watchedEpisodeCount: 2,
      totalEpisodeCount: 2,
    });
  });
});
