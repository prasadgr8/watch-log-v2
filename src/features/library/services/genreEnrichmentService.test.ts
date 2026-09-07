import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";

import { mediaRepository } from "../../../database/repositories";

import {
  TmdbRequestError,
  tmdbMovieService,
  tmdbTvService,
} from "../../../services/tmdb";

import type { Movie, TVShow } from "../../../types";

import { enrichLibraryGenres } from "./genreEnrichmentService";

const tvDetails = {
  id: 1399,
  name: "Test Show",
  overview: "Test overview.",
  poster_path: null,
  backdrop_path: null,
  first_air_date: "2011-04-17",
  last_air_date: "2011-06-01",
  number_of_episodes: 2,
  number_of_seasons: 1,
  status: "Ended",
  seasons: [],
  genres: [
    { id: 18, name: "Drama" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
  ],
};

const movieDetails = {
  id: 27205,
  title: "Test Movie",
  overview: "Test overview.",
  poster_path: null,
  backdrop_path: null,
  release_date: "2010-07-15",
  genres: [
    { id: 28, name: "Action" },
    { id: 878, name: "Science Fiction" },
  ],
};

function createShow(overrides: Partial<TVShow> = {}): TVShow {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    mediaType: "tv",
    title: "Test Show",
    tmdbId: 1399,
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMovie(overrides: Partial<Movie> = {}): Movie {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    mediaType: "movie",
    title: "Test Movie",
    tmdbId: 27205,
    userStatus: "planned",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("enrichLibraryGenres", () => {
  beforeEach(async () => {
    await db.media.clear();
    await db.episodes.clear();
    await db.watchHistory.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enriches only records with a tmdbId and missing genres", async () => {
    await mediaRepository.add(createShow());
    await mediaRepository.add(createMovie());
    await mediaRepository.add(
      createShow({ tmdbId: 1396, title: "Existing", genres: ["Drama"] }),
    );
    await mediaRepository.add(
      createMovie({ tmdbId: 1, title: "Marked", genres: [] }),
    );
    await mediaRepository.add(
      createShow({ title: "Manual", tmdbId: undefined }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);
    const getMovieDetailsSpy = vi
      .spyOn(tmdbMovieService, "getMovieDetails")
      .mockResolvedValue(movieDetails);

    const result = await enrichLibraryGenres();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).toHaveBeenCalledTimes(1);

    expect(result.updatedCount).toBe(2);
    expect(result.noGenresCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedNoTmdbIdCount).toBe(1);

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");
    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");
    const existingShow = await mediaRepository.getByTmdbId(1396, "tv");
    const markedMovie = await mediaRepository.getByTmdbId(1, "movie");
    const manualShow = (await mediaRepository.getAll()).find(
      (media) => media.title === "Manual",
    );

    expect(storedShow?.genres).toEqual(["Drama", "Sci-Fi & Fantasy"]);
    expect(storedMovie?.genres).toEqual(["Action", "Science Fiction"]);
    expect(existingShow?.genres).toEqual(["Drama"]);
    expect(markedMovie?.genres).toEqual([]);
    expect(manualShow?.genres).toBeUndefined();
  });

  it("skips records without a tmdbId without fetching", async () => {
    await mediaRepository.add(
      createShow({ title: "Manual", tmdbId: undefined }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    const result = await enrichLibraryGenres();

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.skippedNoTmdbIdCount).toBe(1);

    const manualShow = (await mediaRepository.getAll()).find(
      (media) => media.title === "Manual",
    );

    expect(manualShow?.genres).toBeUndefined();
  });

  it("never fetches records whose genres are already set", async () => {
    await mediaRepository.add(
      createShow({ title: "Existing", genres: ["Drama"] }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    const result = await enrichLibraryGenres();

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);

    const existingShow = (await mediaRepository.getAll()).find(
      (media) => media.title === "Existing",
    );

    expect(existingShow?.genres).toEqual(["Drama"]);
  });

  it("does not re-fetch records marked with an empty genres array", async () => {
    await mediaRepository.add(
      createMovie({ tmdbId: 1, title: "Marked", genres: [] }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    const result = await enrichLibraryGenres();

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);

    const markedMovie = (await mediaRepository.getAll()).find(
      (media) => media.title === "Marked",
    );

    expect(markedMovie?.genres).toEqual([]);
  });

  it("uses the movie details service for movie records", async () => {
    await mediaRepository.add(createMovie());

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi
      .spyOn(tmdbMovieService, "getMovieDetails")
      .mockResolvedValue(movieDetails);

    await enrichLibraryGenres();

    expect(getMovieDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).toHaveBeenCalledWith(27205);
    expect(getTvDetailsSpy).not.toHaveBeenCalled();

    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedMovie?.genres).toEqual(["Action", "Science Fiction"]);
  });

  it("uses the TV details service for TV records", async () => {
    await mediaRepository.add(createShow());

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    await enrichLibraryGenres();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getTvDetailsSpy).toHaveBeenCalledWith(1399);
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");

    expect(storedShow?.genres).toEqual(["Drama", "Sci-Fi & Fantasy"]);
  });

  it("maps movie genre IDs through the movie mapping", async () => {
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue({
      ...movieDetails,
      genres: [
        { id: 28, name: "Action" },
        { id: 878, name: "Science Fiction" },
        { id: 10770, name: "TV Movie" },
      ],
    });

    await enrichLibraryGenres();

    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedMovie?.genres).toEqual([
      "Action",
      "Science Fiction",
      "TV Movie",
    ]);
  });

  it("maps TV genre IDs through the TV mapping", async () => {
    await mediaRepository.add(createShow());

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue({
      ...tvDetails,
      genres: [
        { id: 10759, name: "Action & Adventure" },
        { id: 10768, name: "War & Politics" },
      ],
    });

    await enrichLibraryGenres();

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");

    expect(storedShow?.genres).toEqual(["Action & Adventure", "War & Politics"]);
  });

  it("maps shared genre IDs identically for both media types", async () => {
    await mediaRepository.add(createShow());
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue({
      ...tvDetails,
      genres: [
        { id: 18, name: "Drama" },
        { id: 10751, name: "Family" },
      ],
    });
    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue({
      ...movieDetails,
      genres: [
        { id: 18, name: "Drama" },
        { id: 10751, name: "Family" },
      ],
    });

    await enrichLibraryGenres();

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");
    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedShow?.genres).toEqual(["Drama", "Family"]);
    expect(storedMovie?.genres).toEqual(["Drama", "Family"]);
  });

  it("drops unknown genre IDs", async () => {
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue({
      ...movieDetails,
      genres: [{ id: 999999, name: "Unknown" }],
    });

    const result = await enrichLibraryGenres();

    expect(result.noGenresCount).toBe(1);
    expect(result.updatedCount).toBe(0);

    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedMovie?.genres).toEqual([]);
  });

  it("writes an empty genres marker when TMDB returns no genres", async () => {
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue({
      ...movieDetails,
      genres: undefined,
    });

    const result = await enrichLibraryGenres();

    expect(result.noGenresCount).toBe(1);

    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedMovie?.genres).toEqual([]);
  });

  it("performs zero fetches on a second run", async () => {
    await mediaRepository.add(createShow());
    await mediaRepository.add(createMovie());

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);
    const getMovieDetailsSpy = vi
      .spyOn(tmdbMovieService, "getMovieDetails")
      .mockResolvedValue(movieDetails);

    const firstResult = await enrichLibraryGenres();

    expect(firstResult.updatedCount).toBe(2);

    getTvDetailsSpy.mockClear();
    getMovieDetailsSpy.mockClear();

    const secondResult = await enrichLibraryGenres();

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
    expect(secondResult.updatedCount).toBe(0);
    expect(secondResult.noGenresCount).toBe(0);
    expect(secondResult.failedCount).toBe(0);
    expect(secondResult.skippedNoTmdbIdCount).toBe(0);
  });

  it("continues after a TMDB 404 and records a per-item failure", async () => {
    await mediaRepository.add(createMovie());
    await mediaRepository.add(createShow());

    vi.spyOn(tmdbMovieService, "getMovieDetails").mockRejectedValue(
      new TmdbRequestError("TMDB request failed with status 404.", 404),
    );
    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tvDetails);

    const result = await enrichLibraryGenres();

    expect(result.failedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.title).toBe("Test Movie");
    expect(result.failures[0]?.reason).toContain("404");

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");
    const storedMovie = await mediaRepository.getByTmdbId(27205, "movie");

    expect(storedShow?.genres).toEqual(["Drama", "Sci-Fi & Fantasy"]);
    expect(storedMovie?.genres).toBeUndefined();
  });

  it("keeps successful updates when a later request fails mid-run", async () => {
    await mediaRepository.add(createShow());
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tvDetails);
    vi.spyOn(tmdbMovieService, "getMovieDetails").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    const result = await enrichLibraryGenres();

    expect(result.updatedCount).toBe(1);
    expect(result.failedCount).toBe(1);

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");

    expect(storedShow?.genres).toEqual(["Drama", "Sci-Fi & Fantasy"]);
  });

  it("makes zero TMDB calls and throws when offline", async () => {
    await mediaRepository.add(createShow());

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    await expect(
      enrichLibraryGenres({ canUseNetwork: () => false }),
    ).rejects.toThrow("internet connection");

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");

    expect(storedShow?.genres).toBeUndefined();
  });

  it("reports progress after each candidate", async () => {
    await mediaRepository.add(createShow());
    await mediaRepository.add(createMovie());

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tvDetails);
    vi.spyOn(tmdbMovieService, "getMovieDetails").mockResolvedValue(
      movieDetails,
    );

    const progressCalls: { completed: number; total: number }[] = [];

    await enrichLibraryGenres({
      onProgress: (progress) => {
        progressCalls.push({ ...progress });
      },
    });

    expect(progressCalls).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
  });

  it("preserves all existing fields except genres and updatedAt", async () => {
    const now = new Date("2026-07-15T00:00:00.000Z");

    await mediaRepository.add(
      createShow({ rating: 7, favorite: true, notes: "My notes" }),
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tvDetails);

    await enrichLibraryGenres();

    const storedShow = await mediaRepository.getByTmdbId(1399, "tv");

    expect(storedShow?.title).toBe("Test Show");
    expect(storedShow?.mediaType).toBe("tv");
    expect(storedShow?.tmdbId).toBe(1399);
    expect(storedShow?.userStatus).toBe("watching");
    expect(storedShow?.rating).toBe(7);
    expect(storedShow?.favorite).toBe(true);
    expect(storedShow?.notes).toBe("My notes");
    expect(storedShow?.createdAt).toEqual(now);
    expect(storedShow?.genres).toEqual(["Drama", "Sci-Fi & Fantasy"]);
    expect(storedShow?.updatedAt.getTime()).toBeGreaterThan(now.getTime());
  });
});
