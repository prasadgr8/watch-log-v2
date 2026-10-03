import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import type { WatchHistory } from "../../../types";

import { db } from "../../../database/db";
import { watchHistoryRepository } from "../../../database/repositories";

import {
  loadWatchActivity,
  loadWatchActivitySection,
  toWatchActivityEvents,
} from "./watchActivityService";

/*
 * Focused tests for the read-only viewing-activity facade.
 *
 * These verify the facade's contract rather than re-testing the pure
 * aggregations (covered in src/domain/analytics/activity.test.ts): one
 * repository read per request (including the combined summary + timeline
 * snapshot), correct record-to-domain-event mapping, delegation to the pure
 * domain, and the absence of any write, network, or clock access.
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

describe("loadWatchActivitySection", () => {
  it("reads the watch history exactly once for the combined snapshot", async () => {
    await watchHistoryRepository.add(createWatchHistory());

    const getAllSpy = vi.spyOn(watchHistoryRepository, "getAll");

    const section = await loadWatchActivitySection("day");

    expect(getAllSpy).toHaveBeenCalledTimes(1);
    expect(section.summary.totalEventCount).toBe(1);
    expect(section.timeline.buckets).toHaveLength(1);
    expect(section.timeline.truncated).toBe(false);
  });

  it("derives summary and timeline from one shared in-memory snapshot", async () => {
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
        watchedAt: new Date(2026, 6, 17, 10),
        source: "import",
      }),
    );
    const persisted = await watchHistoryRepository.getAll();

    // A hypothetical second read would observe an "emptied" store, so any
    // implementation reading more than once produces a summary/timeline
    // disagreement or a second call on the spy.
    const getAllSpy = vi
      .spyOn(watchHistoryRepository, "getAll")
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce([]);

    const section = await loadWatchActivitySection("day");

    expect(getAllSpy).toHaveBeenCalledTimes(1);

    const { summary, timeline } = section;

    expect(summary.totalEventCount).toBe(3);
    expect(summary.sourceEventCounts).toEqual({ manual: 2, import: 1 });
    expect(summary.firstWatchedAt).toEqual(new Date(2026, 6, 15, 9));
    expect(summary.lastWatchedAt).toEqual(new Date(2026, 6, 17, 10));

    expect(timeline.buckets.map((bucket) => bucket.eventCount)).toEqual([
      2, 0, 1,
    ]);
    expect(timeline.windowStart).toEqual(new Date(2026, 6, 15, 0, 0, 0, 0));
    expect(timeline.windowEnd).toEqual(new Date(2026, 6, 18, 0, 0, 0, 0));

    const bucketedEventCount = timeline.buckets.reduce(
      (sum, bucket) => sum + bucket.eventCount,
      0,
    );

    expect(bucketedEventCount).toBe(summary.totalEventCount);
  });

  it("keeps loadWatchActivity as a compatible summary-only view", async () => {
    await watchHistoryRepository.add(createWatchHistory());
    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 2,
        watchedAt: new Date(2026, 6, 16, 20),
      }),
    );

    const summary = await loadWatchActivity("day");
    const section = await loadWatchActivitySection("day");

    expect(summary).toEqual(section.summary);
    expect(summary.totalEventCount).toBe(2);
    expect(section.timeline.naturalBucketCount).toBe(2);
  });

  it("introduces no writes while loading the section", async () => {
    await watchHistoryRepository.add(createWatchHistory());
    const countBefore = await watchHistoryRepository.count();

    const addSpy = vi.spyOn(db.watchHistory, "add");
    const updateSpy = vi.spyOn(db.watchHistory, "update");
    const putSpy = vi.spyOn(db.watchHistory, "put");
    const deleteSpy = vi.spyOn(db.watchHistory, "delete");
    const bulkAddSpy = vi.spyOn(db.watchHistory, "bulkAdd");
    const clearSpy = vi.spyOn(db.watchHistory, "clear");

    await loadWatchActivitySection("day");

    expect(addSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(putSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(bulkAddSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(await watchHistoryRepository.count()).toBe(countBefore);
  });
});

describe("watchActivityService source contract", () => {
  const serviceDirectory = dirname(fileURLToPath(import.meta.url));
  const serviceSource = readFileSync(
    join(serviceDirectory, "watchActivityService.ts"),
    "utf-8",
  );

  it("performs exactly one repository read across the whole service", () => {
    const readCount =
      serviceSource.split("watchHistoryRepository.getAll(").length - 1;

    expect(readCount).toBe(1);
  });

  it("issues no repository writes", () => {
    expect(serviceSource).not.toMatch(
      /watchHistoryRepository\.(add|put|update|delete|clear|bulk\w*)\(/,
    );
  });

  it("has no network dependency", () => {
    expect(serviceSource).not.toContain("fetch(");
    expect(serviceSource).not.toContain("XMLHttpRequest");
    expect(serviceSource).not.toContain("WebSocket");
    expect(serviceSource).not.toContain("axios");
  });

  it("has no clock dependency", () => {
    expect(serviceSource).not.toContain("Date.now(");
    expect(serviceSource).not.toContain("new Date(");
  });
});
