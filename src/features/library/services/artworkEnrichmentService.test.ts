import { describe, expect, it, vi } from "vitest";

import { mediaRepository } from "../../../database/repositories";

import {
  TmdbRequestError,
  tmdbMovieService,
  tmdbTvService,
} from "../../../services/tmdb";

import type { TVShow } from "../../../types";

import { enrichMediaArtwork } from "./artworkEnrichmentService";
describe("enrichMediaArtwork", () => {
  const tvDetails = {
    id: 1399,
    name: "Test Show",
    overview: "Test overview.",
    poster_path: "/test-show-poster.jpg",
    backdrop_path: "/test-show-backdrop.jpg",
    first_air_date: "2011-04-17",
    last_air_date: "2011-06-01",
    number_of_episodes: 2,
    number_of_seasons: 1,
    status: "Ended",
    seasons: [],
    genres: [],
  };

  const tvDetailsNoArtwork = {
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
    genres: [],
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

  

  it("does not fetch when both artwork fields are already populated", async () => {
    await mediaRepository.add(
      createShow({
        posterPath: "/existing-poster.jpg",
        backdropPath: "/existing-backdrop.jpg",
      }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");

    const result = await enrichMediaArtwork();

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.noArtworkCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it("fetches when posterPath is missing but backdropPath exists", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: "/backdrop.jpg" }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches when backdropPath is missing but posterPath exists", async () => {
    await mediaRepository.add(
      createShow({ posterPath: "/poster.jpg", backdropPath: undefined }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches when both artwork fields are missing", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
  });

  // --- Preservation ---

  it("never overwrites an existing posterPath", async () => {
    await mediaRepository.add(
      createShow({
        posterPath: "/existing-poster.jpg",
        backdropPath: undefined,
      }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);

    const stored = await mediaRepository.getByTmdbId(1399, "tv");
    expect(stored?.posterPath).toBe("/existing-poster.jpg");
    expect(stored?.backdropPath).toBe("/test-show-backdrop.jpg");
  });

  it("never overwrites an existing backdropPath", async () => {
    await mediaRepository.add(
      createShow({
        posterPath: undefined,
        backdropPath: "/existing-backdrop.jpg",
      }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);

    const stored = await mediaRepository.getByTmdbId(1399, "tv");
    expect(stored?.posterPath).toBe("/test-show-poster.jpg");
    expect(stored?.backdropPath).toBe("/existing-backdrop.jpg");
  });

  // --- Media types ---

  it("TV records use tmdbTvService", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
  });

  // --- TMDB results ---

  it("populates poster and backdrop when both are available from TMDB", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tvDetails);

    const result = await enrichMediaArtwork();

    expect(result.updatedCount).toBe(1);

    const stored = await mediaRepository.getByTmdbId(1399, "tv");
    expect(stored?.posterPath).toBe("/test-show-poster.jpg");
    expect(stored?.backdropPath).toBe("/test-show-backdrop.jpg");
  });

  it("does not write null artwork into local fields", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
      tvDetailsNoArtwork,
    );

    const result = await enrichMediaArtwork();

    expect(result.noArtworkCount).toBe(1);
    expect(result.updatedCount).toBe(0);

    const stored = await mediaRepository.getByTmdbId(1399, "tv");
    expect(stored?.posterPath).toBeUndefined();
    expect(stored?.backdropPath).toBeUndefined();
  });

  // --- Failure handling ---

  it("one failed TMDB request does not prevent another candidate from succeeding", async () => {
    await mediaRepository.add(
      createShow({
        tmdbId: 1399,
        title: "Failing Show",
        posterPath: undefined,
        backdropPath: undefined,
      }),
    );
    await mediaRepository.add(
      createShow({
        tmdbId: 1396,
        title: "Succeeding Show",
        posterPath: undefined,
        backdropPath: undefined,
      }),
    );

    vi.spyOn(tmdbTvService, "getTvDetails")
      .mockRejectedValueOnce(new TmdbRequestError("Not Found", 404))
      .mockResolvedValue(tvDetails);

    const result = await enrichMediaArtwork();

    expect(result.failedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.title).toBe("Failing Show");

    const succeeding = await mediaRepository.getByTmdbId(1396, "tv");
    expect(succeeding?.posterPath).toBe("/test-show-poster.jpg");
    expect(succeeding?.backdropPath).toBe("/test-show-backdrop.jpg");
  });

  // --- Offline behavior ---

  it("makes zero TMDB calls and throws when offline", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");
    const getMovieDetailsSpy = vi.spyOn(tmdbMovieService, "getMovieDetails");

    await expect(
      enrichMediaArtwork({ canUseNetwork: () => false }),
    ).rejects.toThrow("internet connection");

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();

    const stored = await mediaRepository.getByTmdbId(1399, "tv");
    expect(stored?.posterPath).toBeUndefined();
    expect(stored?.backdropPath).toBeUndefined();
  });

  it("does not require network when there are zero candidates", async () => {
    await mediaRepository.add(
      createShow({
        posterPath: "/poster.jpg",
        backdropPath: "/backdrop.jpg",
      }),
    );

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");

    const result = await enrichMediaArtwork({ canUseNetwork: () => false });

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(result.updatedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  // --- Idempotence ---

  it("does not refetch records that now have both artwork fields after a second run", async () => {
    await mediaRepository.add(
      createShow({ posterPath: undefined, backdropPath: undefined }),
    );

    const getTvDetailsSpy = vi
      .spyOn(tmdbTvService, "getTvDetails")
      .mockResolvedValue(tvDetails);

    await enrichMediaArtwork();
    await enrichMediaArtwork();

    expect(getTvDetailsSpy).toHaveBeenCalledTimes(1);
  });
});
