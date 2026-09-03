import { readFileSync } from "fs";
import { join } from "path";
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
import type { MediaType } from "../../../types";

const projectRoot = process.cwd();

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

describe("resolveTvTimeMatch canonical-identity duplicate detection", () => {
  let duplicateSearchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();

    duplicateSearchMock = vi.spyOn(tmdbSearchService, "searchTvShows");
  });

  function candidate(overrides: Partial<{
    tvTimeShowId: string;
    title: string;
    watchStatus: "planned" | "watching" | "completed";
  }> = {}) {
    return {
      tvTimeShowId: "tvtime-breaking-bad-2008",
      title: "Breaking Bad (2008)",
      followed: true,
      episodesSeen: 1,
      favorite: false,
      watchStatus: "watching" as const,
      ...overrides,
    };
  }

  async function seedExistingMedia(
    tmdbId: number,
    title: string,
    mediaType: MediaType = "tv",
  ): Promise<number> {
    return mediaRepository.add({
      tmdbId,
      title,
      mediaType,
      userStatus: "watching",
      overview: "Existing library item",
      posterPath: "/existing.jpg",
      firstAirDate: "2008-01-20",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  it("detects an existing item by exact TMDB ID + media type", async () => {
    const existingId = await seedExistingMedia(1396, "Breaking Bad");

    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult({ id: 1396, name: "Breaking Bad" })],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeDefined();
    expect(resolution?.existingMedia?.id).toBe(existingId);
    expect(resolution?.existingMedia?.tmdbId).toBe(1396);
    expect(resolution?.tmdbShow.id).toBe(1396);
  });

  it("detects an existing item when the local title differs from the TV Time title", async () => {
    const existingId = await seedExistingMedia(1396, "Breaking Bad: The Complete Series");

    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult({ id: 1396, name: "Breaking Bad" })],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeDefined();
    expect(resolution?.existingMedia?.id).toBe(existingId);
    expect(resolution?.existingMedia?.tmdbId).toBe(1396);
  });

  it("falls back to canonical identity when the best match is a different result", async () => {
    const existingId = await seedExistingMedia(1396, "Breaking Bad");

    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult({ id: 2222, name: "Breaking Bad: The Animated Series", first_air_date: "2025-01-01" }),
        createTmdbTvResult({ id: 1396, name: "Breaking Bad", first_air_date: "2008-01-20" }),
      ],
      total_pages: 1,
      total_results: 2,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeDefined();
    expect(resolution?.existingMedia?.id).toBe(existingId);
    expect(resolution?.existingMedia?.tmdbId).toBe(1396);
    expect(resolution?.tmdbShow.id).toBe(1396);
  });

  it("does NOT treat the same TMDB ID with a different media type as the same item", async () => {
    await seedExistingMedia(1396, "Breaking Bad", "movie");

    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult({ id: 1396, name: "Breaking Bad", media_type: "tv" })],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeUndefined();
    expect(resolution?.tmdbShow.id).toBe(1396);
  });

  it("does NOT match a different TMDB ID with a similar title", async () => {
    await seedExistingMedia(1396, "Breaking Bad");

    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult({ id: 7777, name: "Breaking Bad: The Prequel", first_air_date: "2020-01-01" }),
      ],
      total_pages: 1,
      total_results: 1,
    });

    // Use a title without a year suffix so the substring match scores above
    // the acceptance threshold. The different tmdbId must NOT match the
    // existing tmdbId 1396.
    const resolution = await resolveTvTimeMatch(
      candidate({ title: "Breaking Bad" }),
    );

    expect(resolution?.existingMedia).toBeUndefined();
    expect(resolution?.tmdbShow.id).toBe(7777);
  });

  it("preserves current matching behavior when no existing TMDB identity is found", async () => {
    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult({ id: 1396, name: "Breaking Bad" })],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeUndefined();
    expect(resolution?.tmdbShow.id).toBe(1396);
    expect(resolution?.bestScore).toBeGreaterThan(0);
  });

  it("preserves needs-review behavior when no existing item is found", async () => {
    duplicateSearchMock.mockResolvedValue({
      page: 1,
      results: [
        createTmdbTvResult({ id: 1396, name: "Breaking Bad" }),
        createTmdbTvResult({ id: 1397, name: "Breaking Bad", popularity: 90 }),
      ],
      total_pages: 1,
      total_results: 2,
    });

    const resolution = await resolveTvTimeMatch(candidate());

    expect(resolution?.existingMedia).toBeUndefined();
    expect(resolution?.rankedCandidates.length).toBe(2);
  });

  it("preserves unmatched behavior when TMDB returns no acceptable match", async () => {
    duplicateSearchMock.mockResolvedValue({
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
  });
});

describe("TvTimeMatchDecision manual-match contract", () => {
  it("type permits optional tmdbShow on use decisions", () => {
    const source = readFileSync(
      join(projectRoot, "src/features/import/types/tvTimeImportPlan.ts"),
      "utf8",
    );

    expect(source).toContain("TmdbTvSearchResult");
    expect(source).toContain('decision: "use"');
    expect(source).toContain("tmdbShow?: TmdbTvSearchResult");
  });
});

describe("Manual match resolution flow (source contract)", () => {
  it("SettingsPage handles manual match by converting unmatched to new", () => {
    const source = readFileSync(
      join(projectRoot, "src/features/settings/SettingsPage.tsx"),
      "utf8",
    );

    expect(source).toContain("decision.tmdbShow");
    expect(source).toContain('show.kind === "unmatched"');
    expect(source).toContain('kind: "new"');
    expect(source).toContain("newShows: tvTimePlan.summary.newShows + 1");
    expect(source).toContain(
      "unmatchedShows: tvTimePlan.summary.unmatchedShows - 1",
    );
  });

  it("TvTimeImportPreview shows Find match for unmatched shows only", () => {
    const source = readFileSync(
      join(
        projectRoot,
        "src/features/settings/components/TvTimeImportPreview.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("Find match");
    expect(source).toContain('show.kind === "unmatched"');
    expect(source).toContain("!isSkippedByResolution");
    expect(source).toContain("ManualMatchSearch");
  });

  it("Find match does not appear for skipped or non-unmatched shows", () => {
    const source = readFileSync(
      join(
        projectRoot,
        "src/features/settings/components/TvTimeImportPreview.tsx",
      ),
      "utf8",
    );

    // The Find match button is gated on unmatched && !isSkippedByResolution
    expect(source).toMatch(
      /show\.kind === "unmatched"[\s\S]*?!isSkippedByResolution/,
    );
  });
});
