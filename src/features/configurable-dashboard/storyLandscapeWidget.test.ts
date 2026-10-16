import { describe, expect, it } from "vitest";

import {
  mediaRepository,
  watchHistoryRepository,
} from "../../database/repositories";

import type { PersistedMedia, PersistedWatchHistory } from "../../types";

import {
  STORY_LANDSCAPE_BUBBLE_LIMIT,
  getStoryLandscapeData,
} from "./services/storyLandscapeWidgetService";

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
  overrides: Partial<{
    id: number;
    title: string;
    mediaType: "tv" | "movie";
    genres: string[];
  }> = {},
): PersistedMedia {
  return {
    id: overrides.id ?? 1,
    tmdbId: (overrides.id ?? 1) + 1000,
    mediaType: overrides.mediaType ?? "tv",
    title: overrides.title ?? "Untitled",
    userStatus: "completed",
    rating: undefined,
    favorite: false,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    genres: overrides.genres ?? [],
  };
}

async function seedHistoryAndMedia(
  history: PersistedWatchHistory[],
  media: PersistedMedia[],
) {
  for (const record of media) {
    await mediaRepository.add(record);
  }
  for (const record of history) {
    await watchHistoryRepository.add(record);
  }
}

describe("story landscape widget service", () => {
  it("returns empty bubbles and zero titles for no watch history", async () => {
    const data = await getStoryLandscapeData();

    expect(data.bubbles).toEqual([]);
    expect(data.totalTitles).toBe(0);
  });

  it("returns empty bubbles when watched titles have no genres", async () => {
    await seedHistoryAndMedia(
      [createWatchHistory({ id: 1, mediaId: 1 })],
      [createMedia({ id: 1, title: "Genre-less Show", genres: [] })],
    );

    const data = await getStoryLandscapeData();

    expect(data.bubbles).toEqual([]);
    expect(data.totalTitles).toBe(1);
  });

  it("computes genre bubbles with count, percentage, and relative size", async () => {
    await seedHistoryAndMedia(
      [
        createWatchHistory({ id: 1, mediaId: 1 }),
        createWatchHistory({ id: 2, mediaId: 2 }),
        createWatchHistory({ id: 3, mediaId: 3 }),
      ],
      [
        createMedia({ id: 1, title: "Show A", genres: ["Drama", "Thriller"] }),
        createMedia({ id: 2, title: "Show B", genres: ["Drama"] }),
        createMedia({ id: 3, title: "Show C", genres: ["Comedy"] }),
      ],
    );

    const data = await getStoryLandscapeData();

    expect(data.totalTitles).toBe(3);
    // Drama: 2 titles, Thriller: 1, Comedy: 1 = 3 bubbles
    expect(data.bubbles.length).toBe(3);

    const drama = data.bubbles.find((b) => b.genre === "Drama");
    expect(drama).toBeDefined();
    expect(drama!.titleCount).toBe(2);
    expect(drama!.percentage).toBe(50);
    expect(drama!.relativeSize).toBe(1);

    const comedy = data.bubbles.find((b) => b.genre === "Comedy");
    expect(comedy).toBeDefined();
    expect(comedy!.titleCount).toBe(1);
    expect(comedy!.percentage).toBe(25);
    expect(comedy!.relativeSize).toBe(0.5);
  });

  it("sorts bubbles by title count descending, then genre name ascending", async () => {
    await seedHistoryAndMedia(
      [
        createWatchHistory({ id: 1, mediaId: 1 }),
        createWatchHistory({ id: 2, mediaId: 2 }),
        createWatchHistory({ id: 3, mediaId: 3 }),
        createWatchHistory({ id: 4, mediaId: 4 }),
      ],
      [
        createMedia({ id: 1, title: "Z Show", genres: ["Action"] }),
        createMedia({ id: 2, title: "A Show", genres: ["Action"] }),
        createMedia({ id: 3, title: "M Show", genres: ["Comedy"] }),
        createMedia({ id: 4, title: "B Show", genres: ["Comedy"] }),
      ],
    );

    const data = await getStoryLandscapeData();

    expect(data.bubbles[0].genre).toBe("Action");
    expect(data.bubbles[0].titleCount).toBe(2);
    expect(data.bubbles[1].genre).toBe("Comedy");
    expect(data.bubbles[1].titleCount).toBe(2);
  });

  it("filters by TV media type", async () => {
    await seedHistoryAndMedia(
      [
        createWatchHistory({ id: 1, mediaId: 1, mediaType: "tv" }),
        createWatchHistory({ id: 2, mediaId: 2, mediaType: "movie" }),
      ],
      [
        createMedia({ id: 1, title: "TV Show", mediaType: "tv", genres: ["Drama"] }),
        createMedia({ id: 2, title: "Movie Film", mediaType: "movie", genres: ["Drama"] }),
      ],
    );

    const tvData = await getStoryLandscapeData("tv");
    expect(tvData.totalTitles).toBe(1);
    expect(tvData.bubbles[0]?.genre).toBe("Drama");

    const movieData = await getStoryLandscapeData("movie");
    expect(movieData.totalTitles).toBe(1);
    expect(movieData.bubbles[0]?.genre).toBe("Drama");

    const allData = await getStoryLandscapeData("all");
    expect(allData.totalTitles).toBe(2);
  });

  it("caps bubbles at STORY_LANDSCAPE_BUBBLE_LIMIT", async () => {
    const genres = [
      "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Romance",
      "Documentary", "Fantasy", "Mystery",
    ];

    const media = genres.map((g, i) =>
      createMedia({ id: i + 1, title: `Show ${i}`, genres: [g] }),
    );
    const history = media.map((m, i) =>
      createWatchHistory({ id: i + 1, mediaId: m.id }),
    );

    await seedHistoryAndMedia(history, media);

    const data = await getStoryLandscapeData();

    expect(data.bubbles.length).toBeLessThanOrEqual(STORY_LANDSCAPE_BUBBLE_LIMIT);
  });
});