import { describe, expect, it, vi } from "vitest";

import type { WatchHistory } from "../../../types";

import { db } from "../../../database/db";
import { watchHistoryRepository } from "../../../database/repositories";

import {
  loadWatchActivity,
  toWatchActivityEvents,
} from "./watchActivityService";

/*
 * Focused tests for the read-only viewing-activity facade.
 *
 * These verify the facade's contract rather than re-testing the pure
 * aggregations (covered in src/domain/analytics/activity.test.ts): one
 * repository read per request, correct record-to-domain-event mapping,
 * delegation to the pure domain, and the absence of any write.
 */

function createWatchHistory(
  overrides: Partial<WatchHistory> = {},
): WatchHistory {
  return {
    episodeId: 1,
    watchedAt: new Date(2026, 6, 15, 9),
    source: "manual",
    createdAt: new Date(2026, 6, 15, 9),
    ...overrides,
  };
}

describe("toWatchActivityEvents", () => {
  it("maps persisted records onto storage-independent domain events", () => {
    const firstId = 7;
    const secondId = 9;

    const events = toWatchActivityEvents([
      {
        ...createWatchHistory({ episodeId: 4, source: "import" }),
        id: firstId,
      },
      { ...createWatchHistory({ episodeId: 5 }), id: secondId },
    ]);

    expect(events).toEqual([
      {
        id: firstId,
        episodeId: 4,
        watchedAt: new Date(2026, 6, 15, 9),
        source: "import",
      },
      {
        id: secondId,
        episodeId: 5,
        watchedAt: new Date(2026, 6, 15, 9),
        source: "manual",
      },
    ]);
  });

  it("returns an empty array for no records", () => {
    expect(toWatchActivityEvents([])).toEqual([]);
  });

  it("does not leak persistence-only fields into domain events", () => {
    const events = toWatchActivityEvents([
      { ...createWatchHistory(), id: 1, createdAt: new Date(2026, 6, 15) },
    ]);

    expect(Object.keys(events[0] ?? {}).sort()).toEqual([
      "episodeId",
      "id",
      "source",
      "watchedAt",
    ]);
  });
  describe("loadWatchActivity", () => {
    it("reads the watch history exactly once per request", async () => {
      await watchHistoryRepository.add(createWatchHistory());

      const getAllSpy = vi.spyOn(watchHistoryRepository, "getAll");

      await loadWatchActivity("day");
      await loadWatchActivity("month");

      expect(getAllSpy).toHaveBeenCalledTimes(2);
    });

    it("derives a summary from persisted records", async () => {
      await watchHistoryRepository.add(createWatchHistory());
      await watchHistoryRepository.add(
        createWatchHistory({
          episodeId: 2,
          watchedAt: new Date(2026, 6, 15, 20),
        }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({
          episodeId: 3,
          watchedAt: new Date(2026, 6, 16, 10),
          source: "import",
        }),
      );

      const summary = await loadWatchActivity("day");

      expect(summary.period).toBe("day");
      expect(summary.totalEventCount).toBe(3);
      expect(summary.totalDistinctEpisodeCount).toBe(3);
      expect(summary.activeDayCount).toBe(2);
      expect(summary.eventsPerActiveDay).toBe(3 / 2);
      expect(summary.sourceEventCounts).toEqual({ manual: 2, import: 1 });
      expect(summary.firstWatchedAt).toEqual(new Date(2026, 6, 15, 9));
      expect(summary.lastWatchedAt).toEqual(new Date(2026, 6, 16, 10));
      expect(summary.mostActivePeriod?.periodStart).toEqual(
        new Date(2026, 6, 15, 0, 0, 0, 0),
      );
      expect(summary.mostActivePeriod?.eventCount).toBe(2);
    });

    it("returns a defined empty summary for an empty history", async () => {
      const summary = await loadWatchActivity("year");

      expect(summary).toEqual({
        period: "year",
        totalEventCount: 0,
        totalDistinctEpisodeCount: 0,
        activeDayCount: 0,
        eventsPerActiveDay: null,
        sourceEventCounts: { manual: 0, import: 0 },
      });
      expect(summary.firstWatchedAt).toBeUndefined();
      expect(summary.mostActivePeriod).toBeUndefined();
    });

    it("produces the same summary regardless of stored insertion order", async () => {
      await watchHistoryRepository.add(
        createWatchHistory({ watchedAt: new Date(2026, 6, 17, 8) }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({ watchedAt: new Date(2026, 6, 15, 9) }),
      );
      await watchHistoryRepository.add(
        createWatchHistory({ watchedAt: new Date(2026, 6, 16, 12) }),
      );

      const summary = await loadWatchActivity("day");

      expect(summary.totalEventCount).toBe(3);
      expect(summary.firstWatchedAt).toEqual(new Date(2026, 6, 15, 9));
      expect(summary.lastWatchedAt).toEqual(new Date(2026, 6, 17, 8));
      expect(summary.activeDayCount).toBe(3);
    });

    it("re-reads current data on every request rather than caching", async () => {
      const before = await loadWatchActivity("day");
      expect(before.totalEventCount).toBe(0);

      await watchHistoryRepository.add(createWatchHistory());

      const after = await loadWatchActivity("day");
      expect(after.totalEventCount).toBe(1);
    });

    it("introduces no writes while loading", async () => {
      await watchHistoryRepository.add(createWatchHistory());
      const countBefore = await watchHistoryRepository.count();

      const addSpy = vi.spyOn(db.watchHistory, "add");
      const updateSpy = vi.spyOn(db.watchHistory, "update");
      const putSpy = vi.spyOn(db.watchHistory, "put");
      const deleteSpy = vi.spyOn(db.watchHistory, "delete");
      const bulkAddSpy = vi.spyOn(db.watchHistory, "bulkAdd");
      const clearSpy = vi.spyOn(db.watchHistory, "clear");

      await loadWatchActivity("day");

      expect(addSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(putSpy).not.toHaveBeenCalled();
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(bulkAddSpy).not.toHaveBeenCalled();
      expect(clearSpy).not.toHaveBeenCalled();
      expect(await watchHistoryRepository.count()).toBe(countBefore);
    });

    it("leaves stored records byte-identical after loading", async () => {
      const watchedAt = new Date(2026, 6, 15, 9);
      const storedId = await watchHistoryRepository.add(
        createWatchHistory({ watchedAt }),
      );

      await loadWatchActivity("day");

      const stored = await watchHistoryRepository.getByEpisode(1);
      expect(stored).toHaveLength(1);
      expect(stored[0]?.id).toBe(storedId);
      expect(stored[0]?.watchedAt).toEqual(watchedAt);
      expect(stored[0]?.source).toBe("manual");
    });
  });
});
