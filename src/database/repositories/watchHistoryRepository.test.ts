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

  it("counts all persisted watch history events", async () => {
    expect(await watchHistoryRepository.count()).toBe(0);

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

    expect(await watchHistoryRepository.count()).toBe(3);
  });
  describe("watchHistoryRepository historical reads", () => {
    /*
     * Read-only historical access for watch-history analytics. These reads
     * introduce no schema change and no write path; they resolve against the
     * existing watchHistory store and its existing watchedAt index.
     */

    it("returns every event across episodes in chronological order", async () => {
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-15T00:00:00.000Z"),
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          episodeId: 2,
          watchedAt: new Date("2018-03-12T18:30:00.000Z"),
          source: "import",
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2025-06-20T20:00:00.000Z"),
        }),
      );

      const allEvents = await watchHistoryRepository.getAll();

      expect(allEvents.map((event) => event.watchedAt.toISOString())).toEqual([
        "2018-03-12T18:30:00.000Z",
        "2025-06-20T20:00:00.000Z",
        "2026-07-15T00:00:00.000Z",
      ]);
    });

    it("returns an empty list when no watch history exists", async () => {
      expect(await watchHistoryRepository.getAll()).toEqual([]);
    });

    it("breaks watched-time ties by ascending id deterministically", async () => {
      const sharedWatchedAt = new Date("2026-07-15T00:00:00.000Z");
      const firstId = await watchHistoryRepository.add(
        createWatchHistory({ watchedAt: sharedWatchedAt }),
      );
      const secondId = await watchHistoryRepository.add(
        createWatchHistory({ watchedAt: sharedWatchedAt }),
      );

      const allEvents = await watchHistoryRepository.getAll();

      expect(allEvents.map((event) => event.id)).toEqual([firstId, secondId]);
    });

    it("reads only the events inside a half-open range", async () => {
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-14T00:00:00.000Z"),
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-15T00:00:00.000Z"),
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-16T00:00:00.000Z"),
        }),
      );

      const rangedEvents = await watchHistoryRepository.getRange(
        new Date("2026-07-14T00:00:00.000Z"),
        new Date("2026-07-16T00:00:00.000Z"),
      );

      // The lower bound is inclusive, the upper bound exclusive.
      expect(
        rangedEvents.map((event) => event.watchedAt.toISOString()),
      ).toEqual(["2026-07-14T00:00:00.000Z", "2026-07-15T00:00:00.000Z"]);
    });

    it("partitions the timeline across adjacent ranges without overlap", async () => {
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-14T12:00:00.000Z"),
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          watchedAt: new Date("2026-07-15T12:00:00.000Z"),
        }),
      );

      const boundary = new Date("2026-07-15T00:00:00.000Z");

      const firstHalf = await watchHistoryRepository.getRange(
        new Date("2026-07-01T00:00:00.000Z"),
        boundary,
      );
      const secondHalf = await watchHistoryRepository.getRange(
        boundary,
        new Date("2026-07-31T00:00:00.000Z"),
      );

      expect(firstHalf).toHaveLength(1);
      expect(secondHalf).toHaveLength(1);
      expect(firstHalf[0]?.id).not.toBe(secondHalf[0]?.id);
      expect(await watchHistoryRepository.count()).toBe(2);
    });

    it("returns an empty list for an inverted or empty range", async () => {
      await watchHistoryRepository.add(createWatchHistory());

      expect(
        await watchHistoryRepository.getRange(
          new Date("2026-07-15T00:00:00.000Z"),
          new Date("2026-07-01T00:00:00.000Z"),
        ),
      ).toEqual([]);
      expect(
        await watchHistoryRepository.getRange(
          new Date("2026-07-15T00:00:00.000Z"),
          new Date("2026-07-15T00:00:00.000Z"),
        ),
      ).toEqual([]);
    });

    it("does not modify or remove any stored event while reading", async () => {
      const watchHistoryId =
        await watchHistoryRepository.add(createWatchHistory());

      await watchHistoryRepository.getAll();
      await watchHistoryRepository.getRange(
        new Date("2000-01-01T00:00:00.000Z"),
        new Date("2100-01-01T00:00:00.000Z"),
      );

      expect(await watchHistoryRepository.count()).toBe(1);
      const storedEvents = await watchHistoryRepository.getByEpisode(1);
      expect(storedEvents[0]?.id).toBe(watchHistoryId);
      expect(storedEvents[0]?.watchedAt).toEqual(
        new Date("2026-07-15T00:00:00.000Z"),
      );
    });
  });
});
