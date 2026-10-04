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

  it("composes the trends rather than reimplementing their arithmetic", () => {
    // The service only wires the pure domain builders; trend maths stay in the
    // domain module, so no counting, summing, or percentage logic lives here.
    expect(serviceSource).toContain("buildWatchActivityTrends");
    expect(serviceSource).toContain("buildWatchActivitySection");

    expect(serviceSource).not.toMatch(/activePeriodCount\s*[+-]=/);
    expect(serviceSource).not.toMatch(/inactivePeriodCount\s*[+-]=/);
    expect(serviceSource).not.toMatch(
      /consecutiveActivePeriods\s*[+-]=/,
    );
    expect(serviceSource).not.toMatch(/Math\.round\(/);
    expect(serviceSource).not.toMatch(/percentageChange\s*[+-]?=/);
    expect(serviceSource).not.toContain("enumeratePeriods(");
    expect(serviceSource).not.toContain("getPeriodStart(");
  });

  it("keeps the timeline presentation cap out of the trends path", () => {
    // The 120-bucket cap belongs to the timeline projection alone and must not
    // be re-applied to the A28 trends.
    expect(serviceSource).not.toContain("WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS");
  });

  it("records the presentation naming convention without renaming the domain", () => {
    for (const uiTerm of [
      "Active",
      "Inactive",
      "Current Run",
      "Longest Run",
      "Change",
      "Previous",
      "Current",
      "Viewing Activity",
    ]) {
      expect(serviceSource).toContain(uiTerm);
    }

    // "Activity" must never be shortened to "Watched", which would imply a
    // complete lifetime viewing history the ledger cannot support.
    expect(serviceSource).not.toContain('-> Watched');
    expect(serviceSource).toContain("Consecutive periods with recorded activity");
  });

  it("does not introduce a circular activity/trends dependency", () => {
    const analyticsDirectory = join(
      serviceDirectory,
      "..",
      "..",
      "..",
      "domain",
      "analytics",
    );
    const activitySource = readFileSync(
      join(analyticsDirectory, "activity.ts"),
      "utf-8",
    );

    // trends.ts imports activity.ts, so activity.ts must not import trends.ts.
    expect(activitySource).not.toContain('from "./trends"');
  });
});
describe("loadWatchActivitySection trends exposure", () => {
  it("exposes recorded-activity trends alongside the summary and timeline", async () => {
    await watchHistoryRepository.add(createWatchHistory());
    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 2,
        watchedAt: new Date(2026, 6, 15, 20),
      }),
    );

    const section = await loadWatchActivitySection("day");

    expect(section.trends.period).toBe("day");
    expect(section.trends.totalPeriodCount).toBe(1);
    expect(section.trends.activePeriodCount).toBe(1);
    expect(section.trends.inactivePeriodCount).toBe(0);
    expect(section.trends.longestConsecutiveActivePeriods).toBe(1);
    expect(section.trends.latestConsecutiveActivePeriods).toBe(1);
    expect(section.trends.periodOverPeriod.hasPredecessor).toBe(false);
    expect(section.summary.totalEventCount).toBe(2);
    expect(section.timeline.buckets).toHaveLength(1);
  });

  it("reads the watch history exactly once while exposing trends", async () => {
    await watchHistoryRepository.add(createWatchHistory());

    const getAllSpy = vi.spyOn(watchHistoryRepository, "getAll");

    await loadWatchActivitySection("day");

    expect(getAllSpy).toHaveBeenCalledTimes(1);
  });

  it("derives summary, timeline, and trends from one shared snapshot", async () => {
    await watchHistoryRepository.add(createWatchHistory());
    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 2,
        watchedAt: new Date(2026, 6, 16, 20),
      }),
    );
    await watchHistoryRepository.add(
      createWatchHistory({
        episodeId: 3,
        watchedAt: new Date(2026, 6, 18, 10),
        source: "import",
      }),
    );
    const persisted = await watchHistoryRepository.getAll();

    // A second read would observe an emptied store, so any implementation that
    // reads twice disagrees with the first snapshot.
    const getAllSpy = vi
      .spyOn(watchHistoryRepository, "getAll")
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce([]);

    const section = await loadWatchActivitySection("day");

    expect(getAllSpy).toHaveBeenCalledTimes(1);

    const { summary, timeline, trends } = section;

    expect(summary.totalEventCount).toBe(3);
    expect(summary.sourceEventCounts).toEqual({ manual: 2, import: 1 });

    expect(timeline.buckets.map((bucket) => bucket.eventCount)).toEqual([
      1, 1, 0, 1,
    ]);

    expect(trends.totalPeriodCount).toBe(4);
    expect(trends.activePeriodCount).toBe(3);
    expect(trends.inactivePeriodCount).toBe(1);
    expect(trends.longestConsecutiveActivePeriods).toBe(2);
    expect(trends.latestConsecutiveActivePeriods).toBe(1);
    expect(trends.periodOverPeriod.previousEventCount).toBe(0);
    expect(trends.periodOverPeriod.currentEventCount).toBe(1);
    expect(trends.periodOverPeriod.absoluteChange).toBe(1);
    expect(trends.periodOverPeriod.percentageChange).toBeNull();
  });

  it("produces a deterministic zeroed trend projection for empty history", async () => {
    const section = await loadWatchActivitySection("month");

    expect(section.trends.period).toBe("month");
    expect(section.trends.totalPeriodCount).toBe(0);
    expect(section.trends.activePeriodCount).toBe(0);
    expect(section.trends.inactivePeriodCount).toBe(0);
    expect(section.trends.longestConsecutiveActivePeriods).toBe(0);
    expect(section.trends.latestConsecutiveActivePeriods).toBe(0);
    expect(section.trends.periodOverPeriod.hasPredecessor).toBe(false);
    expect(section.trends.periodOverPeriod.previousEventCount).toBeNull();
    expect(section.trends.periodOverPeriod.absoluteChange).toBeNull();
    expect(section.trends.periodOverPeriod.percentageChange).toBeNull();
  });

  it("keeps loadWatchActivity backward compatible with the trends section", async () => {
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
    expect(summary.period).toBe("day");
    expect(section.trends.totalPeriodCount).toBe(2);
  });

  it("introduces no writes while loading the section with trends", async () => {
    await watchHistoryRepository.add(createWatchHistory());
    const countBefore = await watchHistoryRepository.count();

    const addSpy = vi.spyOn(db.watchHistory, "add");
    const putSpy = vi.spyOn(db.watchHistory, "put");
    const deleteSpy = vi.spyOn(db.watchHistory, "delete");
    const clearSpy = vi.spyOn(db.watchHistory, "clear");

    await loadWatchActivitySection("month");

    expect(addSpy).not.toHaveBeenCalled();
    expect(putSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(await watchHistoryRepository.count()).toBe(countBefore);
  });
});
