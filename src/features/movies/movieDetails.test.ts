import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../database/db";
import { mediaRepository } from "../../database/repositories";
import { tmdbMovieService } from "../../services/tmdb";

import type { Movie } from "../../types";

import {
  applyMovieStatusChange,
  loadMovieDetails,
  type MovieDetailsResult,
} from "./services/movieService";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const movieDetailsPageSource = readFileSync(
  join(featureDirectory, "MovieDetailsPage.tsx"),
  "utf-8",
);

const libraryPageSource = readFileSync(
  join(featureDirectory, "../library/LibraryPage.tsx"),
  "utf-8",
);

const editMediaModalSource = readFileSync(
  join(featureDirectory, "../library/components/EditMediaModal.tsx"),
  "utf-8",
);

const tmdbDetails = {
  id: 603,
  title: "The Matrix",
  overview: "A computer hacker learns about the true nature of reality.",
  poster_path: "/poster.jpg",
  backdrop_path: null,
  release_date: "1999-03-31",
  genres: [{ id: 28, name: "Action" }],
};

function createMovie(overrides: Partial<Movie> = {}): Movie {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    mediaType: "movie",
    title: "The Matrix",
    tmdbId: 603,
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("applyMovieStatusChange", () => {
  it("assigns the current time when a movie becomes completed without a watched date", () => {
    const before = Date.now();
    const movie = createMovie({ userStatus: "watching" });

    const changes = applyMovieStatusChange(movie, { userStatus: "completed" });

    expect(changes.userStatus).toBe("completed");
    expect(changes.watchedAt).toBeInstanceOf(Date);
    expect((changes.watchedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("preserves an existing watched date when a movie becomes completed", () => {
    const watchedAt = new Date("2026-07-10T00:00:00.000Z");
    const movie = createMovie({ userStatus: "watching", watchedAt });

    const changes = applyMovieStatusChange(movie, { userStatus: "completed" });

    expect(changes.watchedAt).toBe(watchedAt);
  });

  it("preserves the existing watched date when staying completed without an explicit edit", () => {
    const watchedAt = new Date("2026-07-10T00:00:00.000Z");
    const movie = createMovie({ userStatus: "completed", watchedAt });

    const changes = applyMovieStatusChange(movie, { userStatus: "completed" });

    // Not written to the changes partial, so the persisted value is untouched.
    expect(changes.watchedAt).toBeUndefined();
  });

  it("persists an explicitly edited watched date", () => {
    const edited = new Date("2026-07-01T00:00:00.000Z");
    const movie = createMovie({ userStatus: "completed" });

    const changes = applyMovieStatusChange(movie, {
      userStatus: "completed",
      watchedAt: edited,
    });

    expect(changes.watchedAt).toBe(edited);
  });

  it("clears the watched date to undefined when explicitly cleared with null", () => {
    const movie = createMovie({ userStatus: "completed" });

    const changes = applyMovieStatusChange(movie, {
      userStatus: "completed",
      watchedAt: null,
    });

    expect(changes.watchedAt).toBeUndefined();
  });

  it("clears the watched date when leaving completed", () => {
    const watchedAt = new Date("2026-07-10T00:00:00.000Z");
    const movie = createMovie({ userStatus: "completed", watchedAt });

    const changes = applyMovieStatusChange(movie, { userStatus: "watching" });

    expect(changes.watchedAt).toBeUndefined();
  });

  it("keeps watchedAt undefined for non-completed states", () => {
    const movie = createMovie({ userStatus: "planned" });

    const changes = applyMovieStatusChange(movie, { userStatus: "on-hold" });

    expect(changes.watchedAt).toBeUndefined();
  });

  it("preserves the existing watched date when only unrelated fields change", () => {
    const watchedAt = new Date("2026-07-10T00:00:00.000Z");
    const movie = createMovie({ userStatus: "completed", watchedAt });

    const changes = applyMovieStatusChange(movie, {
      userStatus: "completed",
      rating: 5,
      notes: "Still holds up",
    });

    // The date is left out of the changes partial so the write preserves it.
    expect(changes.watchedAt).toBeUndefined();
    expect(changes.rating).toBe(5);
    expect(changes.notes).toBe("Still holds up");
  });
});

describe("loadMovieDetails", () => {
  beforeEach(async () => {
    await db.media.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns local data without calling TMDB when offline", async () => {
    const mediaId = await mediaRepository.add(createMovie());

    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    const result = await loadMovieDetails(mediaId, {
      canUseNetwork: () => false,
    });

    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(result.media.id).toBe(mediaId);
    expect(result.movieDetails).toBeNull();
    expect(result.fromLocal).toBe(true);
  });

  it("renders local data first and enriches with TMDB details when online", async () => {
    const mediaId = await mediaRepository.add(createMovie());

    const localCallbackResults: MovieDetailsResult[] = [];

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue(tmdbDetails);

    const result = await loadMovieDetails(mediaId, {
      canUseNetwork: () => true,
      onLocalData: (localResult) => {
        localCallbackResults.push(localResult);
      },
    });

    expect(localCallbackResults).toHaveLength(1);
    expect(localCallbackResults[0].movieDetails).toBeNull();
    expect(localCallbackResults[0].fromLocal).toBe(true);
    expect(result.movieDetails).toEqual(tmdbDetails);
    expect(result.fromLocal).toBe(false);
  });

  it("falls back to local data when the TMDB refresh fails", async () => {
    const mediaId = await mediaRepository.add(createMovie());

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    const result = await loadMovieDetails(mediaId, {
      canUseNetwork: () => true,
    });

    expect(result.movieDetails).toBeNull();
    expect(result.fromLocal).toBe(true);
    expect(result.media.id).toBe(mediaId);
  });

  it("skips TMDB enrichment when the movie has no TMDB ID", async () => {
    const mediaId = await mediaRepository.add(createMovie({ tmdbId: undefined }));

    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    const result = await loadMovieDetails(mediaId, {
      canUseNetwork: () => true,
    });

    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(result.fromLocal).toBe(true);
  });

  it("throws when the media does not exist in the Library", async () => {
    await expect(
      loadMovieDetails(9999, { canUseNetwork: () => false }),
    ).rejects.toThrow("Movie was not found in the Library.");
  });

  it("throws when the selected Library item is not a movie", async () => {
    const mediaId = await mediaRepository.add({
      mediaType: "tv",
      title: "A Show",
      userStatus: "watching",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      loadMovieDetails(mediaId, { canUseNetwork: () => false }),
    ).rejects.toThrow("The selected Library item is not a movie.");
  });
});

describe("MovieDetailsPage source contracts", () => {
  it("uses the single canonical applyMovieStatusChange lifecycle", () => {
    expect(movieDetailsPageSource).toContain("applyMovieStatusChange");
    expect(movieDetailsPageSource).toContain(
      "const changes = applyMovieStatusChange(movie, {",
    );
  });

  it("reuses the shared EditMediaModal instead of a separate date editor", () => {
    expect(movieDetailsPageSource).toContain(
      'import EditMediaModal from "../library/components/EditMediaModal";',
    );
    expect(movieDetailsPageSource).toContain("<EditMediaModal");
  });

  it("loads details offline-first through loadMovieDetails", () => {
    expect(movieDetailsPageSource).toContain("loadMovieDetails");
    expect(movieDetailsPageSource).toContain("onLocalData");
  });

  it("shows an offline notice when presenting saved data", () => {
    expect(movieDetailsPageSource).toContain("showOfflineNotice");
    expect(movieDetailsPageSource).toContain("You are offline.");
  });

  it("links back to the Movies page", () => {
    expect(movieDetailsPageSource).toContain('to="/movies"');
  });
});

describe("canonical watchedAt lifecycle usage", () => {
  it("routes movie edits through applyMovieStatusChange in LibraryPage too", () => {
    expect(libraryPageSource).toContain(
      'import { applyMovieStatusChange } from "../movies/services/movieService";',
    );
    expect(libraryPageSource).toContain(
      "applyMovieStatusChange(selectedMedia, {",
    );
  });
});

describe("EditMediaModal watched date contract", () => {
  it("carries watchedAt?: Date | null on the onSave contract", () => {
    expect(editMediaModalSource).toContain("watchedAt?: Date | null;");
  });

  it("shows the watched date field only for completed movies", () => {
    expect(editMediaModalSource).toContain(
      'media.mediaType === "movie" && status === "completed"',
    );
  });

  it("omits watchedAt when untouched and passes explicit values when edited", () => {
    expect(editMediaModalSource).toContain("watchedAtTouched");
    expect(editMediaModalSource).toContain(
      "...(watchedAtTouched ? { watchedAt } : {})",
    );
  });

  it("clears the watched date through the shared modal", () => {
    expect(editMediaModalSource).toContain("setWatchedAt(null)");
  });
});