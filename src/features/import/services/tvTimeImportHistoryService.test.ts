import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import { importHistoryRepository } from "../../../database/repositories";
import type { ImportHistoryStatus } from "../../../types";

import {
  buildImportHistoryRecord,
  persistTvTimeImportHistory,
} from "./tvTimeImportHistoryService";
import type { TvTimeImportPlan } from "../types/tvTimeImportPlan";
import type { TvTimeImportResult } from "./tvTimeImportService";

function createPlan(
  overrides: Partial<TvTimeImportPlan> = {},
): TvTimeImportPlan {
  return {
    provider: "tv-time",
    sourceFileName: "tvtime-export.zip",
    validation: { valid: true, found: [], missing: [] },
    timezone: "America/New_York",
    shows: [],
    watchedEpisodes: [],
    warnings: [],
    summary: {
      totalShows: 0,
      newShows: 0,
      existingShows: 0,
      unmatchedShows: 0,
      plannedWatchedEpisodes: 0,
      invalidWatchedEpisodes: 0,
      duplicateTitleWatchedEpisodes: 0,
    },
    ...overrides,
  };
}

function createResult(
  overrides: Partial<TvTimeImportResult> = {},
): TvTimeImportResult {
  return {
    importedShows: 0,
    skippedShows: 0,
    failedShows: 0,
    importedWatchedEpisodes: 0,
    alreadyWatchedEpisodes: 0,
    missingWatchedEpisodes: 0,
    skippedWatchedEpisodes: 0,
    failedWatchedEpisodes: 0,
    shows: [],
    ...overrides,
  };
}

describe("buildImportHistoryRecord", () => {
  const startedAt = new Date("2026-07-15T00:00:00.000Z");
  const completedAt = new Date("2026-07-15T00:00:01.000Z");

  it("classifies a fully-clean execution as completed", () => {
    const record = buildImportHistoryRecord({
      plan: createPlan(),
      result: createResult(),
      startedAt,
      completedAt,
    });

    expect(record.status).toBe("completed");
    expect(record.errorMessage).toBeUndefined();
  });

  it("classifies a result with failures as partial", () => {
    const record = buildImportHistoryRecord({
      plan: createPlan(),
      result: createResult({ failedShows: 1 }),
      startedAt,
      completedAt,
    });

    expect(record.status).toBe("partial");
    expect(record.errorMessage).toBeUndefined();
  });

  it("classifies a failed result with an error as failed", () => {
    const record = buildImportHistoryRecord({
      plan: createPlan(),
      result: null,
      startedAt,
      completedAt,
      error: new Error("Unresolved TV Time match review"),
    });

    expect(record.status).toBe("failed");
    expect(record.errorMessage).toBe("Unresolved TV Time match review");
  });

  it("maps plan context and execution counters into the record", () => {
    const plan = createPlan({
      sourceFileName: "tv-time-gdpr.zip",
      timezone: "Asia/Kolkata",
      warnings: ["Duplicate TV Time titles detected"],
      summary: {
        totalShows: 3,
        newShows: 1,
        existingShows: 1,
        unmatchedShows: 1,
        plannedWatchedEpisodes: 5,
        invalidWatchedEpisodes: 1,
        duplicateTitleWatchedEpisodes: 0,
      },
    });
    const result = createResult({
      importedShows: 1,
      skippedShows: 2,
      failedShows: 0,
      importedWatchedEpisodes: 3,
      alreadyWatchedEpisodes: 1,
      missingWatchedEpisodes: 1,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });

    const record = buildImportHistoryRecord({
      plan,
      result,
      startedAt,
      completedAt,
    });

    expect(record).toMatchObject({
      provider: "tv-time",
      sourceFileName: "tv-time-gdpr.zip",
      timezone: "Asia/Kolkata",
      warnings: ["Duplicate TV Time titles detected"],
      totalShows: 3,
      newShows: 1,
      existingShows: 1,
      unmatchedShows: 1,
      plannedWatchedEpisodes: 5,
      importedShows: 1,
      skippedShows: 2,
      failedShows: 0,
      importedWatchedEpisodes: 3,
      alreadyWatchedEpisodes: 1,
      missingWatchedEpisodes: 1,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });
    expect(record.durationMs).toBe(completedAt.getTime() - startedAt.getTime());
  });

  it.each<[ImportHistoryStatus]>([["completed"], ["partial"], ["failed"]])(
    "keeps the %s status through to the record",
    (status) => {
      const result =
        status === "failed"
          ? null
          : status === "partial"
            ? createResult({ failedShows: 1 })
            : createResult();
      const record = buildImportHistoryRecord({
        plan: createPlan(),
        result,
        startedAt,
        completedAt,
        error: status === "failed" ? new Error("boom") : undefined,
      });

      expect(record.status).toBe(status);
    },
  );
});

describe("persistTvTimeImportHistory", () => {
  beforeEach(async () => {
    await db.importHistory.clear();
  });

  afterEach(async () => {
    await db.importHistory.clear();
    vi.restoreAllMocks();
  });

  it("writes a record and resolves even though it returns void", async () => {
    await persistTvTimeImportHistory({
      plan: createPlan(),
      result: createResult({ importedShows: 1, importedWatchedEpisodes: 2 }),
      startedAt: new Date("2026-07-15T00:00:00.000Z"),
      completedAt: new Date("2026-07-15T00:00:02.000Z"),
    });

    expect(await db.importHistory.count()).toBe(1);
    expect((await db.importHistory.toArray())[0]).toMatchObject({
      status: "completed",
      importedShows: 1,
    });
  });

  it("logs and swallows a repository failure instead of throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(importHistoryRepository, "add").mockRejectedValue(
      new Error("IndexedDB unavailable"),
    );

    await expect(
      persistTvTimeImportHistory({
        plan: createPlan(),
        result: createResult(),
        startedAt: new Date("2026-07-15T00:00:00.000Z"),
        completedAt: new Date("2026-07-15T00:00:01.000Z"),
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to persist import history",
      expect.any(Error),
    );
    expect(await db.importHistory.count()).toBe(0);
  });
});
