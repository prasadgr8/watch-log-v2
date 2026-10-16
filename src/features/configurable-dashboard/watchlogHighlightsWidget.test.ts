import { describe, expect, it } from "vitest";

import {
  mediaRepository,
  watchHistoryRepository,
} from "../../database/repositories";

import type { PersistedMedia, PersistedWatchHistory } from "../../types";

import {
  getWatchLogHighlightsData,
} from "./services/watchlogHighlightsWidgetService";

function createWatchHistory(
  overrides: Partial<PersistedWatchHistory> = {},
): PersistedWatchHistory {
  return {
    id: overrides.id ?? 1,
    episodeId: overrides.episodeId ?? null,
    mediaId: overrides.mediaId ?? 1,
    mediaType: overrides.mediaType ?? "tv",
    watchedAt: overrides.watchedAt ?? new Date("2026-07-15T18:30:00.000Z"),
    source: overrides.source ?? "manual",
    createdAt: overrides.createdAt ?? new Date("2026-07-15T18:30:00.000Z"),
    ...overrides,
  };
}

function createMedia(
  overrides: Partial<{ id: number; title: string; mediaType: "tv" | "movie" }>,
): PersistedMedia {
  return {
    id: overrides.id!,
    tmdbId: overrides.id! + 1000,
    mediaType: overrides.mediaType!,
    title: overrides.title!,
    userStatus: "completed",
    rating: undefined,
    favorite: false,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    genres: [],
  } as PersistedMedia;
}

async function seedHistoryAndMedia(
  history: PersistedWatchHistory[],
  media: Array<{ id: number; title: string; mediaType: "tv" | "movie" }>,
) {
  for (const record of media) {
    await mediaRepository.add(createMedia(record));
  }
  for (const record of history) {
    await watchHistoryRepository.add(record);
  }
}

describe("watchlog highlights widget service", () => {
  it("returns zeros and empty insights for an empty library", async () => {
    const data = await getWatchLogHighlightsData(
      new Date("2026-07-15T12:00:00.000Z"),
    );

    expect(data.currentStreak).toBe(0);
    expect(data.titlesWatched).toBe(0);
    expect(data.recentWatches).toBe(0);
    expect(data.activeDays).toBe(0);
    expect(data.insights).toEqual([]);
  });

  it("computes streak, titles watched, recent watches, and active days", async () => {
    const referenceDate = new Date("2026-07-15T12:00:00.000Z");

    await seedHistoryAndMedia(
      [
        createWatchHistory({
          id: 1,
          mediaId: 1,
          watchedAt: new Date("2026-07-15T10:00:00.000Z"),
        }),
        createWatchHistory({
          id: 2,
          mediaId: 1,
          watchedAt: new Date("2026-07-14T10:00:00.000Z"),
        }),
        createWatchHistory({
          id: 3,
          mediaId: 2,
          watchedAt: new Date("2026-07-14T12:00:00.000Z"),
        }),
        createWatchHistory({
          id: 4,
          mediaId: 1,
          watchedAt: new Date("2026-07-13T10:00:00.000Z"),
        }),
      ],
      [
        { id: 1, title: "Show A", mediaType: "tv" },
        { id: 2, title: "Show B", mediaType: "tv" },
      ],
    );

    const data = await getWatchLogHighlightsData(referenceDate);

    expect(data.currentStreak).toBe(3);
    expect(data.titlesWatched).toBe(2);
    expect(data.recentWatches).toBe(4);
    expect(data.activeDays).toBe(3);
  });

  it.each([
    {
      description: "includes an event exactly at the 30-day cutoff",
      watchedAt: "2026-06-15T12:00:00.000Z",
      expectedRecentWatches: 1,
    },
    {
      description: "includes an event immediately inside the cutoff",
      watchedAt: "2026-06-15T12:00:00.001Z",
      expectedRecentWatches: 1,
    },
    {
      description: "excludes an event immediately outside the cutoff",
      watchedAt: "2026-06-15T11:59:59.999Z",
      expectedRecentWatches: 0,
    },
    {
      description: "excludes an event after the reference date and time",
      watchedAt: "2026-07-15T12:00:00.001Z",
      expectedRecentWatches: 0,
    },
  ])("$description", async ({ watchedAt, expectedRecentWatches }) => {
    const referenceDate = new Date("2026-07-15T12:00:00.000Z");

    await seedHistoryAndMedia(
      [
        createWatchHistory({
          id: 1,
          mediaId: 1,
          watchedAt: new Date(watchedAt),
        }),
      ],
      [{ id: 1, title: "Show A", mediaType: "tv" }],
    );

    const data = await getWatchLogHighlightsData(referenceDate);

    expect(data.recentWatches).toBe(expectedRecentWatches);
  });

  it("orders insights deterministically: streak, titles, recent, active days", async () => {
    const referenceDate = new Date("2026-07-15T12:00:00.000Z");

    await seedHistoryAndMedia(
      [
        createWatchHistory({
          id: 1,
          mediaId: 1,
          watchedAt: new Date("2026-07-15T10:00:00.000Z"),
        }),
      ],
      [{ id: 1, title: "Show A", mediaType: "tv" }],
    );

    const data = await getWatchLogHighlightsData(referenceDate);

    expect(data.insights.map((i) => i.id)).toEqual([
      "current-streak",
      "titles-watched",
      "recent-watches",
      "active-days",
    ]);
    // Streak of 1 still produces a "current-streak" stat insight.
  });

  it("uses the default reference date of now when none supplied", async () => {
    const data = await getWatchLogHighlightsData();

    expect(data).toBeDefined();
    expect(typeof data.currentStreak).toBe("number");
  });

  it("caps insights at HIGHLIGHTS_INSIGHT_LIMIT", async () => {
    const referenceDate = new Date("2026-07-15T12:00:00.000Z");

    await seedHistoryAndMedia(
      [
        createWatchHistory({ id: 1, mediaId: 1, watchedAt: new Date("2026-07-15T10:00:00.000Z") }),
        createWatchHistory({ id: 2, mediaId: 1, watchedAt: new Date("2026-07-14T10:00:00.000Z") }),
        createWatchHistory({ id: 3, mediaId: 1, watchedAt: new Date("2026-07-13T10:00:00.000Z") }),
        createWatchHistory({ id: 4, mediaId: 1, watchedAt: new Date("2026-07-12T10:00:00.000Z") }),
        createWatchHistory({ id: 5, mediaId: 2, watchedAt: new Date("2026-07-11T10:00:00.000Z") }),
      ],
      [
        { id: 1, title: "Show A", mediaType: "tv" },
        { id: 2, title: "Show B", mediaType: "tv" },
      ],
    );

    const data = await getWatchLogHighlightsData(referenceDate);

    expect(data.currentStreak).toBe(5);
    expect(data.titlesWatched).toBe(2);
    expect(data.recentWatches).toBe(5);
    expect(data.activeDays).toBe(5);
    expect(data.insights.length).toBeLessThanOrEqual(4);
  });
});