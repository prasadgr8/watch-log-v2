import { describe, expect, it } from "vitest";

import type { ImportHistory } from "../../types";

import { importHistoryRepository } from "./importHistoryRepository";

function createImportHistory(
  overrides: Partial<ImportHistory> = {},
): ImportHistory {
  return {
    provider: "tv-time",
    sourceFileName: "tvtime-export.zip",
    timezone: "America/New_York",
    status: "completed",
    startedAt: new Date("2026-07-15T00:00:00.000Z"),
    completedAt: new Date("2026-07-15T00:00:01.000Z"),
    durationMs: 1000,
    totalShows: 1,
    newShows: 1,
    existingShows: 0,
    unmatchedShows: 0,
    plannedWatchedEpisodes: 1,
    warnings: [],
    importedShows: 1,
    skippedShows: 0,
    failedShows: 0,
    importedWatchedEpisodes: 1,
    alreadyWatchedEpisodes: 0,
    missingWatchedEpisodes: 0,
    skippedWatchedEpisodes: 0,
    failedWatchedEpisodes: 0,
    ...overrides,
  };
}

describe("importHistoryRepository", () => {
  it("adds a record and retrieves it by id with Date fields hydrated", async () => {
    const id = await importHistoryRepository.add(createImportHistory());

    const record = await importHistoryRepository.getById(id);

    expect(id).toBeGreaterThan(0);
    expect(record).toMatchObject({
      id,
      provider: "tv-time",
      sourceFileName: "tvtime-export.zip",
      timezone: "America/New_York",
      status: "completed",
    });

    expect(record?.startedAt).toBeInstanceOf(Date);
    expect(record?.completedAt).toBeInstanceOf(Date);
    expect(record?.startedAt.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(record?.completedAt.toISOString()).toBe("2026-07-15T00:00:01.000Z");
  });

  it("returns undefined for an unknown id", async () => {
    expect(await importHistoryRepository.getById(999)).toBeUndefined();
  });

  it("returns zero records initially", async () => {
    expect(await importHistoryRepository.count()).toBe(0);
    expect(await importHistoryRepository.list()).toHaveLength(0);
  });

  it("orders records newest-first by completedAt", async () => {
    await importHistoryRepository.add(
      createImportHistory({
        completedAt: new Date("2026-07-10T00:00:00.000Z"),
      }),
    );
    await importHistoryRepository.add(
      createImportHistory({
        completedAt: new Date("2026-07-20T00:00:00.000Z"),
      }),
    );
    await importHistoryRepository.add(
      createImportHistory({
        completedAt: new Date("2026-07-15T00:00:00.000Z"),
      }),
    );

    const records = await importHistoryRepository.list();

    expect(records.map((record) => record.completedAt)).toEqual([
      new Date("2026-07-20T00:00:00.000Z"),
      new Date("2026-07-15T00:00:00.000Z"),
      new Date("2026-07-10T00:00:00.000Z"),
    ]);
  });

  it("limits list to the requested count, returning the newest", async () => {
    for (const i of [1, 2, 3]) {
      await importHistoryRepository.add(
        createImportHistory({
          completedAt: new Date(2026, 5, i, 12, 0, 0),
        }),
      );
    }

    const records = await importHistoryRepository.list(1);

    expect(records).toHaveLength(1);
    expect(records[0]?.completedAt).toEqual(new Date(2026, 5, 3, 12, 0, 0));
  });
});
