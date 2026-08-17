import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import { mediaRepository } from "../../../database/repositories";
import type { TmdbTvSearchResult } from "../../../services/tmdb";

import { tmdbSearchService } from "../../../services/tmdb";
import { findBestTvdbMatch } from "./tvdbMatcher";

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
