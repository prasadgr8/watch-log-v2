import { describe, expect, it, vi } from "vitest";

import type { WatchHistory } from "../../types";

import { db } from "../db";

import {
  watchHistoryRepository,
  type NewWatchEvent,
} from "./watchHistoryRepository";

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

/*
 * Overrides are deliberately loosely typed so the same factories can build
 * both valid events and deliberately invalid ones for the validation tests;
 * the internal cast only defeats compile-time narrowing — `recordWatchEvent`
 * re-validates every invariant at runtime, which is exactly what those tests
 * exercise.
 */
interface WatchEventOverrides {
  mediaId?: number;
  mediaType?: string;
  episodeId?: number | null;
  watchedAt?: Date;
  source?: string;
  createdAt?: Date;
}

function createTvWatchEvent(
  overrides: WatchEventOverrides = {},
): NewWatchEvent {
  return {
    mediaId: 101,
    mediaType: "tv",
    episodeId: 1,
    watchedAt: new Date("2026-08-10T21:00:00.000Z"),
    source: "manual",
    createdAt: new Date("2026-08-10T21:00:03.000Z"),
    ...overrides,
  } as unknown as NewWatchEvent;
}

function createMovieWatchEvent(
  overrides: WatchEventOverrides = {},
): NewWatchEvent {
  return {
    mediaId: 202,
    mediaType: "movie",
    episodeId: null,
    watchedAt: new Date("2026-08-11T20:00:00.000Z"),
    source: "manual",
    createdAt: new Date("2026-08-11T20:00:04.000Z"),
    ...overrides,
  } as unknown as NewWatchEvent;
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

  describe("watchHistoryRepository unified watch events", () => {
    /*
     * Repository foundation for the unified WatchHistory event model. New
     * events are always fully attributed (mediaId + mediaType + a consistent
     * episodeId), deduplicated on the canonical identity
     * (mediaId, episodeId, watchedAt), and read back in the domain's
     * canonical order. Legacy/unattributed rows remain readable but can never
     * be produced by the new write API.
     */

    describe("recordWatchEvent basics", () => {
      it("creates a valid TV watch event and reads every field back", async () => {
        const result = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent(),
        );

        expect(result.created).toBe(true);
        expect(result.event.id).toBeGreaterThan(0);

        const storedEvents = await watchHistoryRepository.getAll();

        expect(storedEvents).toHaveLength(1);
        expect(storedEvents[0]).toEqual({
          id: result.event.id,
          mediaId: 101,
          mediaType: "tv",
          episodeId: 1,
          watchedAt: new Date("2026-08-10T21:00:00.000Z"),
          source: "manual",
          createdAt: new Date("2026-08-10T21:00:03.000Z"),
        });
        expect(typeof storedEvents[0]?.episodeId).toBe("number");
      });

      it("creates a valid movie watch event with a null episode id", async () => {
        const result = await watchHistoryRepository.recordWatchEvent(
          createMovieWatchEvent(),
        );

        expect(result.created).toBe(true);

        const storedEvents = await watchHistoryRepository.getAll();

        expect(storedEvents).toHaveLength(1);
        expect(storedEvents[0]).toEqual({
          id: result.event.id,
          mediaId: 202,
          mediaType: "movie",
          episodeId: null,
          watchedAt: new Date("2026-08-11T20:00:00.000Z"),
          source: "manual",
          createdAt: new Date("2026-08-11T20:00:04.000Z"),
        });
        expect(storedEvents[0]?.episodeId).toBeNull();
      });
    });

    describe("recordWatchEvent validation", () => {
      it("rejects a missing or invalid mediaId before writing", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ mediaId: undefined }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: mediaId must be a positive integer.",
        );

        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ mediaId: 42.5 }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: mediaId must be a positive integer.",
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects an invalid mediaType", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ mediaType: "show" }),
          ),
        ).rejects.toThrow(
          'Invalid watch event: mediaType must be "tv" or "movie".',
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects a TV event with a null episode id", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ episodeId: null }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: TV events require a numeric episodeId.",
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects a movie event with a non-null episode id", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createMovieWatchEvent({ episodeId: 7 }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: movie events require a null episodeId.",
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects an invalid watchedAt", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ watchedAt: new Date("not-a-date") }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: watchedAt must be a valid Date.",
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects an invalid source", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ source: "sync" }),
          ),
        ).rejects.toThrow(
          'Invalid watch event: source must be "manual" or "import".',
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });

      it("rejects an invalid createdAt", async () => {
        await expect(
          watchHistoryRepository.recordWatchEvent(
            createTvWatchEvent({ createdAt: new Date("not-a-date") }),
          ),
        ).rejects.toThrow(
          "Invalid watch event: createdAt must be a valid Date.",
        );

        expect(await watchHistoryRepository.count()).toBe(0);
      });
    });

    describe("recordWatchEvent canonical idempotency", () => {
      it("does not create a second event for the same canonical identity", async () => {
        const event = createTvWatchEvent();

        const first = await watchHistoryRepository.recordWatchEvent(event);
        const second = await watchHistoryRepository.recordWatchEvent(event);

        expect(first.created).toBe(true);
        expect(second.created).toBe(false);
        expect(second.event.id).toBe(first.event.id);
        expect(await watchHistoryRepository.count()).toBe(1);
      });

      it("treats the same canonical event recorded with a different source as a duplicate", async () => {
        const first = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent(),
        );
        const second = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({ source: "import" }),
        );

        expect(first.created).toBe(true);
        expect(second.created).toBe(false);
        expect(second.event.source).toBe("manual");
        expect(await watchHistoryRepository.count()).toBe(1);
      });

      it("treats the same media and episode at a different watchedAt as a distinct event", async () => {
        const first = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent(),
        );
        const second = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({
            watchedAt: new Date("2026-08-10T22:00:00.000Z"),
          }),
        );

        expect(first.created).toBe(true);
        expect(second.created).toBe(true);
        expect(second.event.id).not.toBe(first.event.id);
        expect(await watchHistoryRepository.count()).toBe(2);
      });

      it("keeps movie events with the same media id but different watchedAt distinct", async () => {
        const first = await watchHistoryRepository.recordWatchEvent(
          createMovieWatchEvent(),
        );
        const second = await watchHistoryRepository.recordWatchEvent(
          createMovieWatchEvent({
            watchedAt: new Date("2026-08-12T20:00:00.000Z"),
          }),
        );

        expect(first.created).toBe(true);
        expect(second.created).toBe(true);
        expect(second.event.id).not.toBe(first.event.id);
        expect(await watchHistoryRepository.count()).toBe(2);
      });

      it("deduplicates movie events by the (mediaId, null, watchedAt) identity", async () => {
        const movieEvent = createMovieWatchEvent();

        const first = await watchHistoryRepository.recordWatchEvent(
          movieEvent,
        );
        const duplicate = await watchHistoryRepository.recordWatchEvent(
          createMovieWatchEvent({ source: "import" }),
        );

        expect(first.created).toBe(true);
        expect(duplicate.created).toBe(false);
        expect(await watchHistoryRepository.count()).toBe(1);

        // A TV event sharing the movie's mediaId and watched instant is a
        // different canonical event: episodeId participates in the identity.
        const tvAtSameInstant = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({
            mediaId: 202,
            watchedAt: movieEvent.watchedAt,
          }),
        );

        expect(tvAtSameInstant.created).toBe(true);
        expect(await watchHistoryRepository.count()).toBe(2);
      });
    });

    describe("canonical reads, ordering, and legacy rows", () => {
      it("returns every event in the canonical deterministic order", async () => {
        const earliestTv = createTvWatchEvent({
          mediaId: 10,
          episodeId: 9,
          watchedAt: new Date("2026-09-01T09:00:00.000Z"),
        });
        const sameInstantEpisodeFive = createTvWatchEvent({
          mediaId: 10,
          episodeId: 5,
          watchedAt: new Date("2026-09-01T12:00:00.000Z"),
        });
        const sameInstantMovie = createMovieWatchEvent({
          mediaId: 20,
          watchedAt: new Date("2026-09-01T12:00:00.000Z"),
        });
        const sameInstantEpisodeThree = createTvWatchEvent({
          mediaId: 10,
          episodeId: 3,
          watchedAt: new Date("2026-09-01T12:00:00.000Z"),
        });

        // Deliberately shuffled insertion order.
        const episodeFive = await watchHistoryRepository.recordWatchEvent(
          sameInstantEpisodeFive,
        );
        const movie = await watchHistoryRepository.recordWatchEvent(
          sameInstantMovie,
        );
        const earliest = await watchHistoryRepository.recordWatchEvent(
          earliestTv,
        );
        const episodeThree = await watchHistoryRepository.recordWatchEvent(
          sameInstantEpisodeThree,
        );

        const firstRead = await watchHistoryRepository.getAll();
        const secondRead = await watchHistoryRepository.getAll();

        // Canonical order: watchedAt, then the null-episode movie before TV,
        // then episode id, with persisted id as the final tie-breaker.
        const expectedIds = [
          earliest.event.id,
          movie.event.id,
          episodeThree.event.id,
          episodeFive.event.id,
        ];

        expect(firstRead.map((event) => event.id)).toEqual(expectedIds);
        expect(secondRead.map((event) => event.id)).toEqual(expectedIds);
      });

      it("keeps equal-timestamp TV events deterministic across repeated reads", async () => {
        // The legacy `add` path bypasses canonical deduplication, which is how
        // equal timestamps (e.g. a bulk mark-watched) reach the store.
        const laterInsertedHigherEpisode = await watchHistoryRepository.add(
          createWatchHistory({
            watchedAt: new Date("2026-09-02T12:00:00.000Z"),
            episodeId: 2,
          }),
        );
        const earlierInsertedLowerEpisode = await watchHistoryRepository.add(
          createWatchHistory({
            watchedAt: new Date("2026-09-02T12:00:00.000Z"),
            episodeId: 1,
          }),
        );
        const secondInsertSameEpisode = await watchHistoryRepository.add(
          createWatchHistory({
            watchedAt: new Date("2026-09-02T12:00:00.000Z"),
            episodeId: 1,
          }),
        );

        const expectedIds = [
          earlierInsertedLowerEpisode,
          secondInsertSameEpisode,
          laterInsertedHigherEpisode,
        ];

        const firstRead = await watchHistoryRepository.getAll();
        const secondRead = await watchHistoryRepository.getAll();

        expect(firstRead.map((event) => event.id)).toEqual(expectedIds);
        expect(secondRead.map((event) => event.id)).toEqual(expectedIds);
      });

      it("keeps mixed TV and movie events deterministic", async () => {
        const instant = new Date("2026-09-03T20:00:00.000Z");

        const tvResult = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({ watchedAt: instant }),
        );
        const movieResult = await watchHistoryRepository.recordWatchEvent(
          createMovieWatchEvent({ watchedAt: instant }),
        );

        const firstRead = await watchHistoryRepository.getAll();
        const secondRead = await watchHistoryRepository.getAll();

        // At an equal instant the movie (episodeId null) sorts before the TV
        // event regardless of insertion order, and reads always agree.
        expect(firstRead.map((event) => event.id)).toEqual([
          movieResult.event.id,
          tvResult.event.id,
        ]);
        expect(secondRead.map((event) => event.id)).toEqual([
          movieResult.event.id,
          tvResult.event.id,
        ]);
      });

      it("applies half-open [from, to) boundaries exactly", async () => {
        const from = new Date("2026-09-02T00:00:00.000Z");
        const to = new Date("2026-09-03T00:00:00.000Z");

        const beforeFrom = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({
            watchedAt: new Date("2026-09-01T23:00:00.000Z"),
          }),
        );
        const exactlyAtFrom = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({ watchedAt: from }),
        );
        const insideRange = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({
            watchedAt: new Date("2026-09-02T12:00:00.000Z"),
          }),
        );
        const exactlyAtTo = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({ watchedAt: to }),
        );
        const afterTo = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent({
            watchedAt: new Date("2026-09-03T01:00:00.000Z"),
          }),
        );

        const rangedEvents = await watchHistoryRepository.getRange(from, to);
        const rangedIds = rangedEvents.map((event) => event.id);

        // `from` is inclusive, `to` is exclusive, outside events excluded.
        expect(rangedIds).toEqual([
          exactlyAtFrom.event.id,
          insideRange.event.id,
        ]);
        expect(rangedIds).not.toContain(beforeFrom.event.id);
        expect(rangedIds).not.toContain(exactlyAtTo.event.id);
        expect(rangedIds).not.toContain(afterTo.event.id);
      });

      it("rejects invalid range bounds consistently with an empty result", async () => {
        await watchHistoryRepository.recordWatchEvent(createTvWatchEvent());

        expect(
          await watchHistoryRepository.getRange(
            new Date("not-a-date"),
            new Date("2026-09-03T00:00:00.000Z"),
          ),
        ).toEqual([]);
        expect(
          await watchHistoryRepository.getRange(
            new Date("2026-09-02T00:00:00.000Z"),
            new Date("not-a-date"),
          ),
        ).toEqual([]);
        expect(await watchHistoryRepository.count()).toBe(1);
      });

      it("keeps legacy unattributed rows readable without fabricating attribution", async () => {
        const legacyId = await watchHistoryRepository.add(createWatchHistory());

        const allEvents = await watchHistoryRepository.getAll();

        expect(allEvents).toHaveLength(1);
        expect(allEvents[0]?.id).toBe(legacyId);
        expect(allEvents[0]?.mediaId).toBeUndefined();
        expect(allEvents[0]?.mediaType).toBeUndefined();

        const rangedEvents = await watchHistoryRepository.getRange(
          new Date("2000-01-01T00:00:00.000Z"),
          new Date("2100-01-01T00:00:00.000Z"),
        );

        expect(rangedEvents).toHaveLength(1);
        expect(rangedEvents[0]?.mediaId).toBeUndefined();
        expect(rangedEvents[0]?.mediaType).toBeUndefined();
      });
    });

    describe("recordWatchEvent integrity", () => {
      it("leaves no partial event when the write fails and is safe to retry", async () => {
        const addSpy = vi
          .spyOn(db.watchHistory, "add")
          .mockImplementation(() => {
            throw new Error("Simulated watch history failure.");
          });

        await expect(
          watchHistoryRepository.recordWatchEvent(createTvWatchEvent()),
        ).rejects.toThrow("Simulated watch history failure.");

        expect(await watchHistoryRepository.count()).toBe(0);

        addSpy.mockRestore();

        const retry = await watchHistoryRepository.recordWatchEvent(
          createTvWatchEvent(),
        );

        expect(retry.created).toBe(true);
        expect(await watchHistoryRepository.count()).toBe(1);
      });

      it("resolves concurrent recordings of the same event to a single row", async () => {
        const event = createTvWatchEvent();

        const [first, second] = await Promise.all([
          watchHistoryRepository.recordWatchEvent(event),
          watchHistoryRepository.recordWatchEvent(event),
        ]);

        expect(first.created).not.toBe(second.created);
        expect(await watchHistoryRepository.count()).toBe(1);
      });
    });
  });
});
