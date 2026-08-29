import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import { mediaRepository } from "../../../database/repositories";
import type { TmdbTvSearchResult } from "../../../services/tmdb";

import { tmdbSearchService } from "../../../services/tmdb";
import {
  findBestTvdbMatch,
  getTvTimeMatchReview,
  resolveTvTimeMatch,
} from "./tvdbMatcher";

function createTmdbTvResult(
  overrides: Partial<TmdbTvSearchResult> = {},
): TmdbTvSearchResult {
  return {
    id: 1396,
    overview: "A chemistry teacher starts making meth.",
    poster_path: "/breaking-bad.jpg",
    backdrop_path: "/breaking-bad-backdrop.jpg",
    popularity: 100,
    vote_average: 9,
    vote_count: 10000,
    media_type: "tv",
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    first_air_date: "2008-01-20",
    ...overrides,
  };
}

describe("findBestTvdbMatch", () => {
  let tmdbSearchTvShowsMock: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await db.media.clear();
    await db.episodes.clear();
    await db.watchHistory.clear();

    tmdbSearchTvShowsMock = vi.spyOn(tmdbSearchService, "searchTvShows");
  });

  it("returns the generated media id after importing a new TV show", async () => {
    tmdbSearchTvShowsMock.mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    const result = await findBestTvdbMatch({
      tvTimeShowId: "tvtime-breaking-bad-2008",
      title: "Breaking Bad (2008)",
      followed: true,
      episodesSeen: 1,
      favorite: false,
      watchStatus: "watching",
    });

    expect(result?.status).toBe("imported");
    expect(result?.media?.id).toBeGreaterThan(0);

    const storedMedia = await mediaRepository.getById(result?.media?.id ?? 0);

    expect(storedMedia).toMatchObject({
      id: result?.media?.id,
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
    });
  });
  it("rejects a single TMDB result when only the year matches", async () => {
    tmdbSearchTvShowsMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult({
          id: 9999,
          name: "Completely Different Show",
          original_name: "Completely Different Show",
          first_air_date: "2008-05-01",
        }),
      ],
      total_pages: 1,
      total_results: 1,
    });

    const result = await findBestTvdbMatch({
      tvTimeShowId: "tvtime-unrelated-show",
      title: "Breaking Bad (2008)",
      followed: true,
      episodesSeen: 1,
      favorite: false,
      watchStatus: "watching",
    });
    expect(tmdbSearchTvShowsMock).toHaveBeenCalledWith("Breaking Bad", 1, 2008);
    expect(result).toBeNull();
  });
});

describe("resolveTvTimeMatch ranking exposure", () => {
  let rankingSearchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();

    rankingSearchMock = vi.spyOn(tmdbSearchService, "searchTvShows");
  });

  function candidate() {
    return {
      tvTimeShowId: "tvtime-breaking-bad-2008",
      title: "Breaking Bad (2008)",
      followed: true,
      episodesSeen: 1,
      favorite: false,
      watchStatus: "watching" as const,
    };
  }

  it("exposes ranked candidates and the best score without writing", async () => {
    rankingSearchMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult(),
        createTmdbTvResult({ id: 1397, popularity: 90 }),
      ],
      total_pages: 1,
      total_results: 2,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.bestScore).toBe(150);
    expect(
      resolution?.rankedCandidates.map((entry) => entry.tmdbShow.id),
    ).toEqual([1396, 1397]);
    expect(resolution?.rankedCandidates.map((entry) => entry.score)).toEqual([
      150, 150,
    ]);
    expect(await db.media.count()).toBe(0);
  });

  it("preserves the existing rejection outcome for weak results", async () => {
    rankingSearchMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult({
          id: 9999,
          name: "Completely Different Show",
          original_name: "Completely Different Show",
          first_air_date: "2008-05-01",
        }),
      ],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution).toBeNull();
    expect(await db.media.count()).toBe(0);
  });
});

describe("getTvTimeMatchReview", () => {
  function scored(id: number, score: number) {
    return { tmdbShow: createTmdbTvResult({ id }), score };
  }

  it("flags two qualifying candidates whose scores are close", () => {
    const review = getTvTimeMatchReview([scored(1396, 100), scored(1397, 90)]);

    expect(review?.status).toBe("needs-review");
    expect(review?.reason).toBe("multiple-plausible");
    expect(review?.candidates.map((entry) => entry.tmdbShow.id)).toEqual([
      1396, 1397,
    ]);
  });

  it("keeps a decisive score gap auto-accepted", () => {
    expect(getTvTimeMatchReview([scored(1396, 150), scored(1397, 90)])).toBe(
      null,
    );
  });

  it("ignores single or below-threshold candidate sets", () => {
    expect(getTvTimeMatchReview([scored(1396, 30)])).toBeNull();
  });
});
