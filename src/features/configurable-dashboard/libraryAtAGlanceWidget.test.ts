import { describe, expect, it } from "vitest";

import { mediaRepository } from "../../database/repositories";

import type { PersistedMedia } from "../../types";

import { getLibraryAtAGlanceData } from "./services/libraryAtAGlanceWidgetService";

function createMedia(
  overrides: Partial<{
    id: number;
    title: string;
    mediaType: "tv" | "movie";
    genres: string[];
    userStatus?: "planned" | "watching" | "completed" | "on-hold" | "dropped";
  }> = {},
): PersistedMedia {
  return {
    id: overrides.id ?? 1,
    tmdbId: (overrides.id ?? 1) + 1000,
    mediaType: overrides.mediaType ?? "tv",
    title: overrides.title ?? "Untitled",
    userStatus: overrides.userStatus ?? "completed",
    rating: undefined,
    favorite: false,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    genres: overrides.genres ?? [],
  };
}

describe("library at a glance widget service", () => {
  it("returns zeros for an empty library", async () => {
    const data = await getLibraryAtAGlanceData();

    expect(data.totalTitles).toBe(0);
    expect(data.tvShows).toBe(0);
    expect(data.movies).toBe(0);
    expect(data.genres).toBe(0);
  });

  it("computes total titles, TV shows, movies, and distinct genres", async () => {
    await mediaRepository.add(
      createMedia({ id: 1, title: "Show A", mediaType: "tv", genres: ["Drama", "Thriller"] }),
    );
    await mediaRepository.add(
      createMedia({ id: 2, title: "Show B", mediaType: "tv", genres: ["Drama", "Comedy"] }),
    );
    await mediaRepository.add(
      createMedia({ id: 3, title: "Movie C", mediaType: "movie", genres: ["Action"] }),
    );

    const data = await getLibraryAtAGlanceData();

    expect(data.totalTitles).toBe(3);
    expect(data.tvShows).toBe(2);
    expect(data.movies).toBe(1);
    expect(data.genres).toBe(4); // Drama, Thriller, Comedy, Action
  });

  it("counts distinct genres across all titles", async () => {
    await mediaRepository.add(
      createMedia({ id: 1, title: "Show A", mediaType: "tv", genres: ["Sci-Fi"] }),
    );
    await mediaRepository.add(
      createMedia({ id: 2, title: "Movie B", mediaType: "movie", genres: ["Sci-Fi", "Thriller"] }),
    );

    const data = await getLibraryAtAGlanceData();

    expect(data.genres).toBe(2); // Sci-Fi, Thriller
  });

  it("handles titles with no genres", async () => {
    await mediaRepository.add(
      createMedia({ id: 1, title: "No Genre Show", mediaType: "tv", genres: [] }),
    );

    const data = await getLibraryAtAGlanceData();

    expect(data.totalTitles).toBe(1);
    expect(data.genres).toBe(0);
  });
});
