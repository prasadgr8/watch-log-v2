import { describe, expect, it } from "vitest";

import type { WatchHistory } from "../../types";

import { watchHistoryRepository } from "./watchHistoryRepository";

function createWatchHistory(
  overrides: Partial<WatchHistory> = {},
): WatchHistory {
  return {
    episodeId: 1,
    watchedAt: new Date("2026-07-15T00:00:00.000Z"),
    source: "manual",
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("watchHistoryRepository", () => {
  it("adds a watch history event and retrieves it by episode", async () => {
    const watchHistoryId =
      await watchHistoryRepository.add(createWatchHistory());

    const watchHistoryEvents = await watchHistoryRepository.getByEpisode(1);

    expect(watchHistoryId).toBeGreaterThan(0);
    expect(watchHistoryEvents).toHaveLength(1);

    expect(watchHistoryEvents[0]).toMatchObject({
      id: watchHistoryId,
      episodeId: 1,
      watchedAt: new Date("2026-07-15T00:00:00.000Z"),
      source: "manual",
    });
  });

  it("returns watch history events ordered by watched time", async () => {
    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2026-07-15T00:00:00.000Z"),
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2018-03-12T18:30:00.000Z"),
        source: "import",
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2025-06-20T20:00:00.000Z"),
      }),
    );

    const watchHistoryEvents = await watchHistoryRepository.getByEpisode(1);

    expect(
      watchHistoryEvents.map((event) => event.watchedAt.toISOString()),
    ).toEqual([
      "2018-03-12T18:30:00.000Z",
      "2025-06-20T20:00:00.000Z",
      "2026-07-15T00:00:00.000Z",
    ]);
  });

  it("returns only watch history belonging to the requested episode", async () => {
    await watchHistoryRepository.add(createWatchHistory());

    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 2,
        watchedAt: new Date("2026-07-14T00:00:00.000Z"),
      }),
    );

    const firstEpisodeHistory = await watchHistoryRepository.getByEpisode(1);

    expect(firstEpisodeHistory).toHaveLength(1);
    expect(firstEpisodeHistory[0]?.episodeId).toBe(1);
  });

  it("returns the latest watch history event for an episode", async () => {
    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2018-03-12T18:30:00.000Z"),
        source: "import",
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2026-07-15T00:00:00.000Z"),
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2025-06-20T20:00:00.000Z"),
      }),
    );

    const latestWatchHistory =
      await watchHistoryRepository.getLatestByEpisode(1);

    expect(latestWatchHistory).toMatchObject({
      episodeId: 1,
      watchedAt: new Date("2026-07-15T00:00:00.000Z"),
      source: "manual",
    });
  });

  it("returns undefined when an episode has no watch history", async () => {
    const latestWatchHistory =
      await watchHistoryRepository.getLatestByEpisode(999);

    expect(latestWatchHistory).toBeUndefined();
  });

  it("removes all watch history events for an episode", async () => {
    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2018-03-12T18:30:00.000Z"),
        source: "import",
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        watchedAt: new Date("2026-07-15T00:00:00.000Z"),
      }),
    );

    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 2,
      }),
    );

    await watchHistoryRepository.removeByEpisode(1);

    const firstEpisodeHistory = await watchHistoryRepository.getByEpisode(1);

    const secondEpisodeHistory = await watchHistoryRepository.getByEpisode(2);

    expect(firstEpisodeHistory).toHaveLength(0);
    expect(secondEpisodeHistory).toHaveLength(1);
  });
});
